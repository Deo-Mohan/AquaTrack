package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.SupportTicket;
import com.aquatrack.aquatrack.model.TicketReply;
import com.aquatrack.aquatrack.model.User;
import com.aquatrack.aquatrack.model.Notification;
import com.aquatrack.aquatrack.repository.NotificationRepository;
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

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private com.aquatrack.aquatrack.service.EmailService emailService;

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
        String screenshotUrl = request.get("screenshotUrl");

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
        ticket.setScreenshotUrl(screenshotUrl);
        ticket.setCreatedBy(user);
        ticket.setCreatedByName(user.getFullName() != null ? user.getFullName() : user.getUsername());
        ticket.setCreatedByEmail(user.getEmail());
        ticket.setCreatedByRole(user.getRole());
        ticket.setHouseNumber(user.getHouseNumber());
        ticket.setColonyName(user.getColonyName());
        ticket.setApartmentBlock(user.getApartmentBlock());
        ticket.setCreatedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());

        // If ticket is created by Community Admin or Super Admin, auto-flag it for Super Admin queue
        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(user.getRole()) || "ROLE_ADMIN".equalsIgnoreCase(user.getRole()) || "ROLE_SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            ticket.setEscalatedToSuperAdmin(true);
            ticket.setEscalatedByName(ticket.getCreatedByName());
            ticket.setEscalationReason("Direct Community Admin Ticket to Platform Super Admin");
        }

        SupportTicket savedTicket = ticketRepository.save(ticket);

        // 1. Save In-App Notification for Community Admin & Ticket Creator
        try {
            String block = user.getApartmentBlock();
            List<User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", block != null ? block : "Block A");
            if (!admins.isEmpty()) {
                for (User admin : admins) {
                    Notification adminNotif = new Notification(
                        admin.getUsername(),
                        "TICKET_RAISED",
                        "New Support Ticket #" + savedTicket.getTicketNumber(),
                        "Resident " + savedTicket.getCreatedByName() + " (House " + (savedTicket.getHouseNumber() != null ? savedTicket.getHouseNumber() : "N/A") + ") raised a ticket: " + savedTicket.getTitle()
                    );
                    notificationRepository.save(adminNotif);
                }
            }

            // Also send receipt notification to the resident creator
            Notification creatorNotif = new Notification(
                user.getUsername(),
                "TICKET_RAISED",
                "Support Ticket Created #" + savedTicket.getTicketNumber(),
                "Your concern '" + savedTicket.getTitle() + "' has been submitted to your Community Admin."
            );
            notificationRepository.save(creatorNotif);

        } catch (Exception ex) {
            System.err.println("Failed to save ticket notification: " + ex.getMessage());
        }

        // 2. Send Email Notification to Community Admin or Super Admin
        try {
            String block = user.getApartmentBlock();
            List<User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", block != null ? block : "Block A");
            if (!admins.isEmpty()) {
                User admin = admins.get(0);
                emailService.sendTicketCreatedEmail(
                    admin.getEmail(), 
                    admin.getFullName() != null ? admin.getFullName() : admin.getUsername(), 
                    savedTicket.getCreatedByName(), 
                    savedTicket.getHouseNumber() != null ? savedTicket.getHouseNumber() : "N/A", 
                    savedTicket.getTicketNumber(), 
                    savedTicket.getTitle(), 
                    savedTicket.getCategory(), 
                    savedTicket.getPriority(), 
                    savedTicket.getDescription()
                );
            }
        } catch (Exception ex) {
            System.err.println("Failed to send ticket creation email: " + ex.getMessage());
        }

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

        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusDays(15);
        List<SupportTicket> rawTickets;

        if (role.contains("SUPER_ADMIN") || role.equals("ROLE_ADMIN")) {
            rawTickets = ticketRepository.findForSuperAdmin();
        } else if (role.contains("COMMUNITY_ADMIN")) {
            String community = user.getColonyName();
            String block = user.getApartmentBlock();
            if (block != null && !block.trim().isEmpty()) {
                rawTickets = ticketRepository.findForCommunityAdminByBlockAndColony(block, community != null ? community : "", user.getId());
            } else if (community != null && !community.isEmpty()) {
                rawTickets = ticketRepository.findByColonyNameOrderByCreatedAtDesc(community);
            } else {
                rawTickets = ticketRepository.findByCreatedByIdOrderByCreatedAtDesc(user.getId());
            }
        } else {
            rawTickets = ticketRepository.findByCreatedByIdOrderByCreatedAtDesc(user.getId());
        }

        // Keep tickets created within 15 days
        List<SupportTicket> activeTickets = rawTickets.stream()
                .filter(t -> t.getCreatedAt() != null && t.getCreatedAt().isAfter(cutoff))
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(activeTickets);
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

        // Notify ticket creator when admin replies
        try {
            if (!user.getRole().equals(ticket.getCreatedByRole())) {
                String targetUsername = ticket.getCreatedBy() != null ? ticket.getCreatedBy().getUsername() : ticket.getCreatedByEmail();
                if (targetUsername != null && !targetUsername.equalsIgnoreCase(user.getUsername())) {
                    String senderRoleName;
                    if (user.getRole() != null && (user.getRole().contains("SUPER_ADMIN") || user.getRole().equals("ROLE_ADMIN"))) {
                        senderRoleName = "Platform Super Admin";
                    } else if (user.getRole() != null && user.getRole().contains("COMMUNITY_ADMIN")) {
                        senderRoleName = "Community Manager";
                    } else {
                        senderRoleName = "Admin";
                    }

                    Notification replyNotif = new Notification(
                        targetUsername,
                        "TICKET_REPLY",
                        "New Reply on Ticket #" + ticket.getTicketNumber(),
                        senderRoleName + " " + reply.getSenderName() + " replied: " + message.trim()
                    );
                    notificationRepository.save(replyNotif);
                }
            }
        } catch (Exception ex) {
            System.err.println("Failed to send reply notification: " + ex.getMessage());
        }

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

        // Send Escalation Email to Super Admin
        try {
            List<User> superAdmins = userRepository.findByRole("ROLE_SUPER_ADMIN");
            if (superAdmins.isEmpty()) {
                superAdmins = userRepository.findByRole("ROLE_ADMIN");
            }
            if (!superAdmins.isEmpty()) {
                User superAdmin = superAdmins.get(0);
                emailService.sendTicketEscalatedEmail(
                    superAdmin.getEmail(), 
                    superAdmin.getFullName() != null ? superAdmin.getFullName() : superAdmin.getUsername(), 
                    updatedTicket.getEscalatedByName(), 
                    updatedTicket.getTicketNumber(), 
                    updatedTicket.getTitle(), 
                    reason
                );
            }
        } catch (Exception ex) {
            System.err.println("Failed to send escalation email: " + ex.getMessage());
        }

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

        // Dispatch in-app & email notification to Resident when issue is resolved
        if ("RESOLVED".equalsIgnoreCase(newStatus) || "CLOSED".equalsIgnoreCase(newStatus)) {
            try {
                // In-App Notification to ticket creator
                String creatorUsername = updated.getCreatedBy() != null ? updated.getCreatedBy().getUsername() : updated.getCreatedByEmail();
                if (creatorUsername != null && !creatorUsername.isEmpty()) {
                    String resolverRoleName = (user.getRole() != null && (user.getRole().contains("SUPER_ADMIN") || user.getRole().equals("ROLE_ADMIN"))) 
                        ? "Platform Super Admin" 
                        : "Community Admin";

                    Notification resNotif = new Notification(
                        creatorUsername,
                        "TICKET_RESOLVED",
                        "Support Ticket Resolved #" + updated.getTicketNumber(),
                        "Your concern '" + updated.getTitle() + "' has been marked as RESOLVED by " + resolverRoleName + "."
                    );
                    notificationRepository.save(resNotif);
                }

                if (updated.getCreatedByEmail() != null && !updated.getCreatedByEmail().isEmpty()) {
                    emailService.sendTicketResolvedEmail(
                        updated.getCreatedByEmail(), 
                        updated.getCreatedByName(), 
                        updated.getTicketNumber(), 
                        updated.getTitle()
                    );
                }
            } catch (Exception ex) {
                System.err.println("Failed to send resolution notifications: " + ex.getMessage());
            }
        }

        return ResponseEntity.ok(updated);
    }

    // 7. Delete Ticket (Only allowed if status is RESOLVED or CLOSED)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTicket(
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

        SupportTicket ticket = ticketOpt.get();
        String status = ticket.getStatus() != null ? ticket.getStatus().toUpperCase() : "";

        // Check if ticket is RESOLVED or CLOSED
        if (!"RESOLVED".equals(status) && !"CLOSED".equals(status)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only resolved or closed tickets can be deleted."));
        }

        String role = user.getRole() != null ? user.getRole().toUpperCase() : "";
        boolean isCreator = ticket.getCreatedBy() != null && user.getId().equals(ticket.getCreatedBy().getId());
        boolean isCreatorByUsername = callerUsername.equalsIgnoreCase(ticket.getCreatedByEmail()) || callerUsername.equalsIgnoreCase(ticket.getCreatedByName());
        boolean isAdmin = role.contains("COMMUNITY_ADMIN") || role.contains("SUPER_ADMIN") || role.equals("ROLE_ADMIN");

        if (!isCreator && !isCreatorByUsername && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You do not have permission to delete this ticket."));
        }

        ticketRepository.delete(ticket);
        return ResponseEntity.ok(Map.of("message", "Ticket deleted successfully"));
    }
}
