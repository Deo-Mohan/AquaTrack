package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.SupportTicket;
import com.aquatrack.aquatrack.model.TicketReply;
import com.aquatrack.aquatrack.model.User;
import com.aquatrack.aquatrack.repository.SupportTicketRepository;
import com.aquatrack.aquatrack.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/tickets")
public class SupportTicketController {

    @Autowired
    private SupportTicketRepository ticketRepository;

    @Autowired
    private UserRepository userRepository;

    // Helper to resolve user from callerUsername or email
    private User resolveUser(String callerUsername) {
        if (callerUsername == null || callerUsername.trim().isEmpty()) {
            return null;
        }
        Optional<User> uOpt = userRepository.findByUsername(callerUsername);
        if (uOpt.isPresent()) return uOpt.get();
        return userRepository.findByEmail(callerUsername).orElse(null);
    }

    // 1. Create Support Ticket
    @PostMapping("/create")
    public ResponseEntity<?> createTicket(
            @RequestParam(required = false) String callerUsername,
            @RequestBody Map<String, String> request) {

        User user = resolveUser(callerUsername != null ? callerUsername : request.get("callerUsername"));
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid or missing caller username"));
        }

        String title = request.get("title");
        String description = request.get("description");
        String category = request.getOrDefault("category", "GENERAL");
        String priority = request.getOrDefault("priority", "MEDIUM");

        if (title == null || title.trim().isEmpty() || description == null || description.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Title and description are required"));
        }

        SupportTicket ticket = new SupportTicket();
        ticket.setTicketNumber("TICK-" + (1000 + (long)(Math.random() * 9000)));
        ticket.setTitle(title.trim());
        ticket.setDescription(description.trim());
        ticket.setCategory(category);
        ticket.setPriority(priority);
        ticket.setStatus("OPEN");
        ticket.setCreatedBy(user);
        ticket.setCreatedByName(user.getFullName() != null ? user.getFullName() : user.getUsername());
        ticket.setCreatedByEmail(user.getEmail());
        ticket.setCreatedByRole(user.getRole());
        ticket.setHouseNumber(user.getHouseNumber());
        ticket.setColonyName(user.getColonyName());
        ticket.setCreatedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());

        // If ticket is created by Community Admin or Super Admin, auto-flag it for Super Admin queue
        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(user.getRole()) || "ROLE_ADMIN".equalsIgnoreCase(user.getRole()) || "ROLE_SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            ticket.setEscalatedToSuperAdmin(true);
            ticket.setEscalatedByName(ticket.getCreatedByName());
            ticket.setEscalationReason("Direct Community Admin Ticket to Platform Super Admin");
        }

        SupportTicket savedTicket = ticketRepository.save(ticket);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedTicket);
    }

    // 2. Fetch Tickets based on role and permissions
    @GetMapping
    public ResponseEntity<?> getTickets(@RequestParam String callerUsername) {
        User user = resolveUser(callerUsername);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid caller username"));
        }

        String role = user.getRole() != null ? user.getRole().toUpperCase() : "";

        if (role.contains("SUPER_ADMIN") || role.equals("ROLE_ADMIN")) {
            // Super Admin sees escalated tickets & Community Admin tickets
            List<SupportTicket> superAdminTickets = ticketRepository.findForSuperAdmin();
            return ResponseEntity.ok(superAdminTickets);
        } else if (role.contains("COMMUNITY_ADMIN")) {
            // Community Admin sees tickets in their community + tickets created by themselves
            String community = user.getColonyName();
            List<SupportTicket> communityTickets = (community != null && !community.isEmpty())
                    ? ticketRepository.findByColonyNameOrderByCreatedAtDesc(community)
                    : ticketRepository.findByCreatedByIdOrderByCreatedAtDesc(user.getId());
            return ResponseEntity.ok(communityTickets);
        } else {
            // Household Resident sees only their own tickets
            List<SupportTicket> residentTickets = ticketRepository.findByCreatedByIdOrderByCreatedAtDesc(user.getId());
            return ResponseEntity.ok(residentTickets);
        }
    }

    // 3. Get Single Ticket Details
    @GetMapping("/{id}")
    public ResponseEntity<?> getTicketById(
            @PathVariable Long id,
            @RequestParam String callerUsername) {
        User user = resolveUser(callerUsername);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<SupportTicket> ticketOpt = ticketRepository.findById(id);
        if (ticketOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Ticket not found"));
        }

        return ResponseEntity.ok(ticketOpt.get());
    }

    // 4. Add Reply to Ticket
    @PostMapping("/{id}/reply")
    public ResponseEntity<?> addReply(
            @PathVariable Long id,
            @RequestParam String callerUsername,
            @RequestBody Map<String, String> request) {

        User user = resolveUser(callerUsername);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        Optional<SupportTicket> ticketOpt = ticketRepository.findById(id);
        if (ticketOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Ticket not found"));
        }

        String message = request.get("message");
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Reply message cannot be empty"));
        }

        SupportTicket ticket = ticketOpt.get();

        TicketReply reply = new TicketReply();
        reply.setTicket(ticket);
        reply.setSenderName(user.getFullName() != null ? user.getFullName() : user.getUsername());
        reply.setSenderRole(user.getRole());
        reply.setSenderEmail(user.getEmail());
        reply.setMessage(message.trim());
        reply.setCreatedAt(LocalDateTime.now());

        ticket.getReplies().add(reply);
        ticket.setUpdatedAt(LocalDateTime.now());

        if ("OPEN".equalsIgnoreCase(ticket.getStatus())) {
            ticket.setStatus("IN_PROGRESS");
        }

        ticketRepository.save(ticket);
        return ResponseEntity.ok(ticket);
    }

    // 5. Escalate Ticket to Super Admin (Community Admin Action)
    @PutMapping("/{id}/escalate")
    public ResponseEntity<?> escalateTicket(
            @PathVariable Long id,
            @RequestParam String callerUsername,
            @RequestBody(required = false) Map<String, String> request) {

        User user = resolveUser(callerUsername);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        String role = user.getRole() != null ? user.getRole().toUpperCase() : "";
        if (!role.contains("COMMUNITY_ADMIN") && !role.contains("SUPER_ADMIN") && !role.equals("ROLE_ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Only Community Admins can escalate tickets to Super Admin"));
        }

        Optional<SupportTicket> ticketOpt = ticketRepository.findById(id);
        if (ticketOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Ticket not found"));
        }

        SupportTicket ticket = ticketOpt.get();
        String reason = (request != null && request.containsKey("reason")) ? request.get("reason") : "Escalated by Community Admin to Super Admin for platform-level resolution.";

        ticket.setEscalatedToSuperAdmin(true);
        ticket.setEscalatedByName(user.getFullName() != null ? user.getFullName() : user.getUsername());
        ticket.setEscalationReason(reason);
        ticket.setStatus("ESCALATED_TO_SUPER_ADMIN");
        ticket.setUpdatedAt(LocalDateTime.now());

        // Add automated escalation system reply note in thread
        TicketReply systemReply = new TicketReply();
        systemReply.setTicket(ticket);
        systemReply.setSenderName(user.getFullName() != null ? user.getFullName() : user.getUsername());
        systemReply.setSenderRole("ROLE_COMMUNITY_ADMIN");
        systemReply.setSenderEmail(user.getEmail());
        systemReply.setMessage("⚠️ TICKET ESCALATED TO SUPER ADMIN: " + reason);
        systemReply.setCreatedAt(LocalDateTime.now());

        ticket.getReplies().add(systemReply);

        SupportTicket updatedTicket = ticketRepository.save(ticket);
        return ResponseEntity.ok(updatedTicket);
    }

    // 6. Update Ticket Status (Resolve, Close, In Progress)
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestParam String callerUsername,
            @RequestBody Map<String, String> request) {

        User user = resolveUser(callerUsername);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        String newStatus = request.get("status");
        if (newStatus == null || newStatus.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Status is required"));
        }

        Optional<SupportTicket> ticketOpt = ticketRepository.findById(id);
        if (ticketOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Ticket not found"));
        }

        SupportTicket ticket = ticketOpt.get();
        ticket.setStatus(newStatus.toUpperCase().trim());
        ticket.setUpdatedAt(LocalDateTime.now());

        if ("RESOLVED".equalsIgnoreCase(newStatus) || "CLOSED".equalsIgnoreCase(newStatus)) {
            ticket.setResolvedAt(LocalDateTime.now());
        }

        SupportTicket updated = ticketRepository.save(ticket);
        return ResponseEntity.ok(updated);
    }
}
