package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.User;
import com.aquatrack.aquatrack.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.aquatrack.aquatrack.model.Invitation;
import com.aquatrack.aquatrack.model.Notification;
import com.aquatrack.aquatrack.model.UserDocument;
import com.aquatrack.aquatrack.repository.InvitationRepository;
import com.aquatrack.aquatrack.repository.NotificationRepository;
import com.aquatrack.aquatrack.repository.UserDocumentRepository;
import com.aquatrack.aquatrack.service.EmailService;
import org.springframework.web.multipart.MultipartFile;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import com.aquatrack.aquatrack.model.Apartment;
import com.aquatrack.aquatrack.model.Household;
import com.aquatrack.aquatrack.repository.ApartmentRepository;
import com.aquatrack.aquatrack.repository.HouseholdRepository;

@RestController
@RequestMapping("/api/admin/users")
public class UserManagementController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ApartmentRepository apartmentRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private UserDocumentRepository userDocumentRepository;

    @Autowired
    private InvitationRepository invitationRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private NotificationRepository notificationRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private void syncUserToHousehold(User user) {
        if (user.getColonyName() != null && user.getHouseNumber() != null) {
            Apartment apartment = apartmentRepository.findByName(user.getColonyName());
            if (apartment == null) {
                apartment = apartmentRepository.save(new Apartment(user.getColonyName(), "Colony Address"));
            }
            if (!householdRepository.existsByHouseNumber(user.getHouseNumber())) {
                Household household = new Household(
                        user.getHouseNumber(),
                        user.getApartmentBlock() != null ? user.getApartmentBlock() : "Unassigned",
                        1000.0, // Default flat size
                        1,      // Default occupancy
                        apartment
                );
                householdRepository.save(household);
            }
        }
    }


    // 1. GET: Retrieve users (scoped by caller's role and block)
    @GetMapping
    public ResponseEntity<?> getUsers(
            @RequestParam String callerRole,
            @RequestParam(required = false) String callerBlock,
            @RequestParam(required = false) String roleFilter,
            @RequestParam(required = false) String blockFilter) {

        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole)) {
            // Community Admin can ONLY see Resident (Household User) role in their block or unassigned (if approved)
            if (callerBlock == null || callerBlock.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Caller block is required for community admin.");
            }
            List<User> residents1 = userRepository.findByRole("ROLE_RESIDENT");
            List<User> residents2 = userRepository.findByRole("ROLE_HOUSEHOLD_USER");
            
            List<User> allResidents = new java.util.ArrayList<>();
            allResidents.addAll(residents1);
            allResidents.addAll(residents2);
            
            List<User> filtered = allResidents.stream()
                    .filter(u -> (u.getApartmentBlock() == null || 
                                 u.getApartmentBlock().trim().isEmpty() || 
                                 u.getApartmentBlock().equalsIgnoreCase(callerBlock)) &&
                                 (u.getStatus() == null || u.getStatus().trim().isEmpty() || "APPROVED".equalsIgnoreCase(u.getStatus())))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(filtered);
        } else if ("ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
            // Super Admin / Admin can see all users (including residents/household users) to populate community analytics and block details
            List<User> allUsers = userRepository.findAll().stream()
                    .filter(u -> u.getStatus() == null || u.getStatus().trim().isEmpty() || "APPROVED".equalsIgnoreCase(u.getStatus()))
                    .collect(Collectors.toList());
            
            // Apply optional filters if present
            if (roleFilter != null && !roleFilter.trim().isEmpty()) {
                allUsers = allUsers.stream()
                        .filter(u -> u.getRole().equalsIgnoreCase(roleFilter))
                        .collect(Collectors.toList());
            }
            if (blockFilter != null && !blockFilter.trim().isEmpty()) {
                allUsers = allUsers.stream()
                        .filter(u -> u.getApartmentBlock() != null && u.getApartmentBlock().equalsIgnoreCase(blockFilter))
                        .collect(Collectors.toList());
            }
            return ResponseEntity.ok(allUsers);
        } else {
            return ResponseEntity.status(403).body("Access denied. Invalid caller role.");
        }
    }

    // 2. POST: Register / Create user
    @PostMapping
    public ResponseEntity<?> createUser(
            @RequestParam String callerRole,
            @RequestParam(required = false) String callerBlock,
            @RequestBody User newUser) {

        if (newUser.getEmail() == null || !newUser.getEmail().contains("@")) {
            return ResponseEntity.badRequest().body("Error: Email must contain '@' and be a valid address.");
        }
        newUser.setEmail(newUser.getEmail().trim().toLowerCase());

        if (userRepository.existsByUsername(newUser.getUsername())) {
            return ResponseEntity.badRequest().body("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(newUser.getEmail())) {
            return ResponseEntity.badRequest().body("Error: Email is already in use!");
        }

        // Validate mobile number: must be exactly 10 digits
        String mobile = newUser.getMobileNumber();
        if (mobile == null || !mobile.matches("\\d{10}")) {
            return ResponseEntity.badRequest().body("Error: Mobile number must be exactly 10 digits.");
        }

        // Validate whatsapp number: must be exactly 10 digits
        String wa = newUser.getWhatsAppNumber();
        if (wa == null || !wa.matches("\\d{10}")) {
            return ResponseEntity.badRequest().body("Error: WhatsApp number must be exactly 10 digits.");
        }

        // Validate password exists and is valid
        if (newUser.getPassword() == null || newUser.getPassword().length() < 6) {
            return ResponseEntity.badRequest().body("Error: Password must be at least 6 characters long.");
        }

        // Apply scoping rules
        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole)) {
            // Can ONLY register Household Users (ROLE_RESIDENT) in their block
            newUser.setRole("ROLE_RESIDENT");
            newUser.setApartmentBlock(callerBlock);
        } else if ("ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
            // Super Admin cannot manage/create Household Users
            if (newUser.getRole() != null && ("ROLE_RESIDENT".equalsIgnoreCase(newUser.getRole()) || "RESIDENT".equalsIgnoreCase(newUser.getRole()) || "ROLE_HOUSEHOLD_USER".equalsIgnoreCase(newUser.getRole()) || "HOUSEHOLD_USER".equalsIgnoreCase(newUser.getRole()))) {
                return ResponseEntity.status(403).body("Access denied. Super Admin cannot manage or create Household Users.");
            }
            if (newUser.getRole() == null || newUser.getRole().trim().isEmpty()) {
                newUser.setRole("ROLE_COMMUNITY_ADMIN");
            }
        } else {
            return ResponseEntity.status(403).body("Access denied. Invalid caller role.");
        }

        // Ensure role format is standard (ROLE_RESIDENT, ROLE_COMMUNITY_ADMIN, ROLE_ADMIN)
        if (!newUser.getRole().startsWith("ROLE_")) {
            newUser.setRole("ROLE_" + newUser.getRole().toUpperCase());
        }

        // Set status to APPROVED for manually created users
        newUser.setStatus("APPROVED");

        // Encrypt password
        newUser.setPassword(passwordEncoder.encode(newUser.getPassword()));

        User savedUser = userRepository.save(newUser);
        syncUserToHousehold(savedUser);

        // AUTO-PROPAGATE: When Super Admin sets a water rate on a Community Admin,
        // automatically apply the same rate to all household users in that block.
        if ("ROLE_ADMIN".equalsIgnoreCase(callerRole)
                && "ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(savedUser.getRole())
                && savedUser.getWaterRatePerLiter() != null) {
            List<User> blockResidents1 = userRepository.findByRoleAndApartmentBlock("ROLE_RESIDENT", savedUser.getApartmentBlock());
            List<User> blockResidents2 = userRepository.findByRoleAndApartmentBlock("ROLE_HOUSEHOLD_USER", savedUser.getApartmentBlock());
            java.util.List<User> allResidents = new java.util.ArrayList<>();
            allResidents.addAll(blockResidents1);
            allResidents.addAll(blockResidents2);
            for (User resident : allResidents) {
                resident.setWaterRatePerLiter(savedUser.getWaterRatePerLiter());
                userRepository.save(resident);
            }
        }

        return ResponseEntity.ok(savedUser);
    }

    // 3. PUT: Update user details
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id,
            @RequestParam String callerRole,
            @RequestParam(required = false) String callerBlock,
            @RequestBody User updatedUser) {

        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        // Security check for Community Admin
        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole)) {
            // Check if existing user is resident in their block
            if (!"ROLE_RESIDENT".equalsIgnoreCase(existingUser.getRole()) ||
                    !callerBlock.equalsIgnoreCase(existingUser.getApartmentBlock())) {
                return ResponseEntity.status(403).body("Access denied. You can only update residents in your block.");
            }
            
            // Enforce constraints: Community admin cannot move resident to another block or change role
            updatedUser.setRole("ROLE_RESIDENT");
            updatedUser.setApartmentBlock(callerBlock);
        } else if ("ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
            // Super Admin cannot manage/update Household Users
            if ("ROLE_RESIDENT".equalsIgnoreCase(existingUser.getRole()) || "ROLE_HOUSEHOLD_USER".equalsIgnoreCase(existingUser.getRole())) {
                return ResponseEntity.status(403).body("Access denied. Super Admin cannot manage or update Household Users.");
            }
        } else {
            return ResponseEntity.status(403).body("Access denied. Invalid caller role.");
        }

        // Check username uniqueness if changed
        if (!existingUser.getUsername().equalsIgnoreCase(updatedUser.getUsername()) &&
                userRepository.existsByUsername(updatedUser.getUsername())) {
            return ResponseEntity.badRequest().body("Error: Username is already taken!");
        }

        if (updatedUser.getEmail() == null || !updatedUser.getEmail().contains("@")) {
            return ResponseEntity.badRequest().body("Error: Email must contain '@' and be a valid address.");
        }
        updatedUser.setEmail(updatedUser.getEmail().trim().toLowerCase());

        // Check email uniqueness if changed
        if (!existingUser.getEmail().equalsIgnoreCase(updatedUser.getEmail()) &&
                userRepository.existsByEmail(updatedUser.getEmail())) {
            return ResponseEntity.badRequest().body("Error: Email is already in use!");
        }

        // Validate mobile number: must be exactly 10 digits
        String mobile = updatedUser.getMobileNumber();
        if (mobile == null || !mobile.matches("\\d{10}")) {
            return ResponseEntity.badRequest().body("Error: Mobile number must be exactly 10 digits.");
        }

        // Validate whatsapp number: must be exactly 10 digits
        String wa = updatedUser.getWhatsAppNumber();
        if (wa == null || !wa.matches("\\d{10}")) {
            return ResponseEntity.badRequest().body("Error: WhatsApp number must be exactly 10 digits.");
        }

        // Update fields
        existingUser.setUsername(updatedUser.getUsername());
        existingUser.setEmail(updatedUser.getEmail());
        existingUser.setGender(updatedUser.getGender());
        existingUser.setHouseNumber(updatedUser.getHouseNumber());
        existingUser.setColonyName(updatedUser.getColonyName());
        existingUser.setFullName(updatedUser.getFullName());
        existingUser.setMobileNumber(updatedUser.getMobileNumber());
        existingUser.setWhatsAppNumber(updatedUser.getWhatsAppNumber());
        
        // Admin can update roles, blocks, and water rate
        if ("ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
            String targetRole = updatedUser.getRole();
            if (targetRole != null && !targetRole.isEmpty()) {
                if (!targetRole.startsWith("ROLE_")) {
                    targetRole = "ROLE_" + targetRole.toUpperCase();
                }
                existingUser.setRole(targetRole);
            }
            existingUser.setApartmentBlock(updatedUser.getApartmentBlock());
            existingUser.setWaterRatePerLiter(updatedUser.getWaterRatePerLiter());
        }

        // If a new password is provided, encrypt and update it
        if (updatedUser.getPassword() != null && !updatedUser.getPassword().trim().isEmpty() && updatedUser.getPassword().length() >= 6) {
            existingUser.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
        }

        User savedUser = userRepository.save(existingUser);

        // AUTO-PROPAGATE: When Super Admin sets a water rate on a Community Admin,
        // automatically apply the same rate to all household users in that block.
        if ("ROLE_ADMIN".equalsIgnoreCase(callerRole)
                && "ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(savedUser.getRole())
                && savedUser.getWaterRatePerLiter() != null) {
            List<User> blockResidents1 = userRepository.findByRoleAndApartmentBlock("ROLE_RESIDENT", savedUser.getApartmentBlock());
            List<User> blockResidents2 = userRepository.findByRoleAndApartmentBlock("ROLE_HOUSEHOLD_USER", savedUser.getApartmentBlock());
            java.util.List<User> allResidents = new java.util.ArrayList<>();
            allResidents.addAll(blockResidents1);
            allResidents.addAll(blockResidents2);
            for (User resident : allResidents) {
                resident.setWaterRatePerLiter(savedUser.getWaterRatePerLiter());
                userRepository.save(resident);
            }
        }

        return ResponseEntity.ok(savedUser);
    }

    // 4. DELETE: Delete user
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable Long id,
            @RequestParam String callerRole,
            @RequestParam(required = false) String callerBlock) {

        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        // Security check for Community Admin
        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole)) {
            // Check if existing user is resident in their block
            if (!"ROLE_RESIDENT".equalsIgnoreCase(existingUser.getRole()) ||
                    !callerBlock.equalsIgnoreCase(existingUser.getApartmentBlock())) {
                return ResponseEntity.status(403).body("Access denied. You can only delete residents in your block.");
            }
        } else if ("ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
            // Super Admin cannot delete Household Users
            if ("ROLE_RESIDENT".equalsIgnoreCase(existingUser.getRole()) || "ROLE_HOUSEHOLD_USER".equalsIgnoreCase(existingUser.getRole())) {
                return ResponseEntity.status(403).body("Access denied. Super Admin cannot delete Household Users.");
            }
        } else {
            return ResponseEntity.status(403).body("Access denied. Invalid caller role.");
        }

        userRepository.delete(existingUser);
        return ResponseEntity.ok("User deleted successfully.");
    }

    // 5. GET: Retrieve pending registration requests
    @GetMapping("/approvals/pending")
    public ResponseEntity<?> getPendingApprovals(
            @RequestParam String callerRole,
            @RequestParam(required = false) String callerBlock) {

        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole)) {
            if (callerBlock == null || callerBlock.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Caller block is required for community admin.");
            }
            List<User> pending = userRepository.findByRole("ROLE_RESIDENT").stream()
                    .filter(u -> "PENDING".equalsIgnoreCase(u.getStatus()) && 
                                 callerBlock.equalsIgnoreCase(u.getApartmentBlock()))
                    .collect(Collectors.toList());
            List<User> pendingLegacy = userRepository.findByRole("ROLE_HOUSEHOLD_USER").stream()
                    .filter(u -> "PENDING".equalsIgnoreCase(u.getStatus()) && 
                                 callerBlock.equalsIgnoreCase(u.getApartmentBlock()))
                    .collect(Collectors.toList());
            pending.addAll(pendingLegacy);
            return ResponseEntity.ok(pending);
        } else if ("ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
            // Super Admin can only see pending Community Admin registrations
            List<User> pending = userRepository.findAll().stream()
                    .filter(u -> "PENDING".equalsIgnoreCase(u.getStatus()) && "ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(u.getRole()))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(pending);
        } else {
            return ResponseEntity.status(403).body("Access denied. Invalid caller role.");
        }
    }

    // 6. PUT: Approve or Reject a registration
    @PutMapping("/approvals/{id}/action")
    public ResponseEntity<?> actionPendingApproval(
            @PathVariable Long id,
            @RequestParam String callerRole,
            @RequestParam(required = false) String callerBlock,
            @RequestParam String status) {

        if (!"APPROVED".equalsIgnoreCase(status) && !"REJECTED".equalsIgnoreCase(status)) {
            return ResponseEntity.badRequest().body("Invalid status action. Must be APPROVED or REJECTED.");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        if (!"PENDING".equalsIgnoreCase(user.getStatus())) {
            return ResponseEntity.badRequest().body("User registration is not pending approval.");
        }

        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole)) {
            if (callerBlock == null || callerBlock.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Caller block is required.");
            }
            // Can only approve residents in their block
            boolean isResident = "ROLE_RESIDENT".equalsIgnoreCase(user.getRole()) || 
                                 "ROLE_HOUSEHOLD_USER".equalsIgnoreCase(user.getRole());
            if (!isResident || !callerBlock.equalsIgnoreCase(user.getApartmentBlock())) {
                return ResponseEntity.status(403).body("Access denied. You can only approve residents in your block.");
            }
        } else if ("ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
            // Super Admin can only approve/reject Community Admins
            if (!"ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.status(403).body("Access denied. Super Admin can only approve or reject Community Admins.");
            }
        } else {
            return ResponseEntity.status(403).body("Access denied. Invalid caller role.");
        }
        user.setStatus(status.toUpperCase());
        userRepository.save(user);
        if ("APPROVED".equalsIgnoreCase(status) && ("ROLE_RESIDENT".equalsIgnoreCase(user.getRole()) || "ROLE_HOUSEHOLD_USER".equalsIgnoreCase(user.getRole()))) {
            syncUserToHousehold(user);
        }

        // Send approval email if role is COMMUNITY_ADMIN and status is APPROVED
        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(user.getRole()) && "APPROVED".equalsIgnoreCase(status)) {
            try {
                emailService.sendCommunityApprovalEmail(user.getEmail(), user.getFullName(), user.getColonyName());
            } catch (Exception e) {
                System.err.println("Error sending community admin approval email: " + e.getMessage());
            }
        }

        return ResponseEntity.ok("Registration request has been " + status.toLowerCase() + " successfully.");
    }

    // PUT: Suspend or Activate a Community Admin (ROLE_ADMIN only)
    @PutMapping("/{id}/status")
    public ResponseEntity<?> actionChangeUserStatus(
            @PathVariable Long id,
            @RequestParam String callerRole,
            @RequestParam String status) {

        if (!"ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(403).body("Access denied. Only Super Admin can suspend/activate accounts.");
        }

        if (!"APPROVED".equalsIgnoreCase(status) && !"SUSPENDED".equalsIgnoreCase(status)) {
            return ResponseEntity.badRequest().body("Invalid status action. Must be APPROVED or SUSPENDED.");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        // Super Admin can only suspend/activate Community Admins
        if (!"ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(user.getRole())) {
            return ResponseEntity.status(403).body("Access denied. Super Admin can only change status of Community Admins.");
        }

        user.setStatus(status.toUpperCase());
        userRepository.save(user);

        return ResponseEntity.ok("User status has been updated to " + status.toLowerCase() + " successfully.");
    }

    // 7. POST: Send single household user invitation
    @PostMapping("/invite")
    public ResponseEntity<?> inviteHouseholdUser(
            @RequestParam String callerRole,
            @RequestParam String callerUsername,
            @RequestParam String callerBlock,
            @RequestBody Map<String, String> request) {

        if (!"ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole) && !"ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(403).body("Access denied. Only Community Admins and Admins can invite residents.");
        }

        String fullName = request.get("fullName");
        String email = request.get("email");
        String houseNumber = request.get("houseNumber"); // NEW: flat/house number pre-assigned at invite time

        if (fullName == null || fullName.trim().isEmpty() || email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Full Name and Email are required.");
        }
        if (houseNumber == null || houseNumber.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("House / Flat number is required when sending an invitation.");
        }

        email = email.trim().toLowerCase();

        // Check if user already exists
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body("Error: Email is already registered in the system.");
        }

        // Get the inviter details to copy community name
        User communityAdmin = userRepository.findByUsername(callerUsername)
                .orElseThrow(() -> new RuntimeException("Community Admin not found: " + callerUsername));

        // Create or update invitation
        Optional<Invitation> existingOpt = invitationRepository.findByEmail(email);
        Invitation invitation;
        String token = UUID.randomUUID().toString();
        LocalDateTime expiry = LocalDateTime.now().plusHours(48);

        if (existingOpt.isPresent()) {
            invitation = existingOpt.get();
            invitation.setFullName(fullName);
            invitation.setToken(token);
            invitation.setExpiryDate(expiry);
            invitation.setStatus("PENDING");
            invitation.setColonyName(communityAdmin.getColonyName());
            invitation.setApartmentBlock(callerBlock);
            invitation.setHouseNumber(houseNumber.trim());
            invitation.setInvitedBy(callerUsername);
        } else {
            invitation = new Invitation(
                    email,
                    fullName,
                    token,
                    expiry,
                    communityAdmin.getColonyName(),
                    callerBlock,
                    houseNumber.trim(),
                    callerUsername
            );
        }

        invitationRepository.save(invitation);

        // Send Email
        emailService.sendInvitationEmail(email, fullName, communityAdmin.getColonyName(), token);

        return ResponseEntity.ok("Invitation sent successfully to " + email);
    }


    // 8. POST: Bulk import household users via CSV
    @PostMapping("/invite/bulk")
    public ResponseEntity<?> bulkInviteHouseholdUsers(
            @RequestParam String callerRole,
            @RequestParam String callerUsername,
            @RequestParam String callerBlock,
            @RequestParam("file") MultipartFile file) {

        if (!"ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(403).body("Access denied. Only Community Admins can import residents.");
        }

        User communityAdmin = userRepository.findByUsername(callerUsername)
                .orElseThrow(() -> new RuntimeException("Community Admin not found: " + callerUsername));

        int totalRows = 0;
        int imported = 0;
        int failed = 0;
        int duplicates = 0;
        int invalidEmails = 0;

        List<Map<String, String>> reportDetails = new ArrayList<>();
        java.util.Set<String> processedEmails = new java.util.HashSet<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            boolean isHeader = true;

            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;

                // Simple split by comma
                String[] parts = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
                if (isHeader) {
                    isHeader = false;
                    continue; // Skip header row
                }

                totalRows++;
                if (parts.length < 2) {
                    failed++;
                    Map<String, String> rowReport = new HashMap<>();
                    rowReport.put("row", String.valueOf(totalRows));
                    rowReport.put("status", "FAILED");
                    rowReport.put("reason", "Missing columns. Requires Full Name and Email.");
                    reportDetails.add(rowReport);
                    continue;
                }

                String fullName = parts[0].replaceAll("^\"|\"$", "").trim();
                String email = parts[1].replaceAll("^\"|\"$", "").trim().toLowerCase();

                if (fullName.isEmpty() || email.isEmpty()) {
                    failed++;
                    Map<String, String> rowReport = new HashMap<>();
                    rowReport.put("row", String.valueOf(totalRows));
                    rowReport.put("status", "FAILED");
                    rowReport.put("reason", "Name or Email is empty.");
                    reportDetails.add(rowReport);
                    continue;
                }

                if (!email.contains("@")) {
                    invalidEmails++;
                    failed++;
                    Map<String, String> rowReport = new HashMap<>();
                    rowReport.put("row", String.valueOf(totalRows));
                    rowReport.put("email", email);
                    rowReport.put("status", "INVALID_EMAIL");
                    rowReport.put("reason", "Invalid email format.");
                    reportDetails.add(rowReport);
                    continue;
                }

                if (processedEmails.contains(email)) {
                    duplicates++;
                    failed++;
                    Map<String, String> rowReport = new HashMap<>();
                    rowReport.put("row", String.valueOf(totalRows));
                    rowReport.put("email", email);
                    rowReport.put("status", "DUPLICATE_IN_FILE");
                    rowReport.put("reason", "Duplicate email entry in CSV.");
                    reportDetails.add(rowReport);
                    continue;
                }
                processedEmails.add(email);

                if (userRepository.existsByEmail(email)) {
                    duplicates++;
                    failed++;
                    Map<String, String> rowReport = new HashMap<>();
                    rowReport.put("row", String.valueOf(totalRows));
                    rowReport.put("email", email);
                    rowReport.put("status", "DUPLICATE_IN_DB");
                    rowReport.put("reason", "Email already exists in system.");
                    reportDetails.add(rowReport);
                    continue;
                }

                String token = UUID.randomUUID().toString();
                LocalDateTime expiry = LocalDateTime.now().plusHours(48);

                Optional<Invitation> existingOpt = invitationRepository.findByEmail(email);
                Invitation invitation;
                if (existingOpt.isPresent()) {
                    invitation = existingOpt.get();
                    invitation.setFullName(fullName);
                    invitation.setToken(token);
                    invitation.setExpiryDate(expiry);
                    invitation.setStatus("PENDING");
                    invitation.setColonyName(communityAdmin.getColonyName());
                    invitation.setApartmentBlock(callerBlock);
                    // houseNumber not available in bulk CSV; resident fills it during registration
                    invitation.setInvitedBy(callerUsername);
                } else {
                    invitation = new Invitation(
                            email,
                            fullName,
                            token,
                            expiry,
                            communityAdmin.getColonyName(),
                            callerBlock,
                            null, // houseNumber not available in bulk CSV
                            callerUsername
                    );
                }
                invitationRepository.save(invitation);

                emailService.sendInvitationEmail(email, fullName, communityAdmin.getColonyName(), token);

                imported++;
                Map<String, String> rowReport = new HashMap<>();
                rowReport.put("row", String.valueOf(totalRows));
                rowReport.put("email", email);
                rowReport.put("status", "SUCCESS");
                reportDetails.add(rowReport);
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error parsing CSV: " + e.getMessage());
        }

        double successPercentage = totalRows > 0 ? ((double) imported / totalRows) * 100 : 0;

        Map<String, Object> summaryReport = new HashMap<>();
        summaryReport.put("totalRows", totalRows);
        summaryReport.put("imported", imported);
        summaryReport.put("failed", failed);
        summaryReport.put("duplicates", duplicates);
        summaryReport.put("invalidEmails", invalidEmails);
        summaryReport.put("successPercentage", String.format("%.2f%%", successPercentage));
        summaryReport.put("details", reportDetails);

        // Notify the Community Admin that bulk upload has completed
        String notifTitle = "Bulk Upload Completed";
        String notifMsg = String.format("Bulk import of household users completed. Imported: %d, Failed: %d, Duplicates: %d, Total Rows: %d.", 
                imported, failed, duplicates, totalRows);
        notificationRepository.save(new Notification(callerUsername, "BULK_UPLOAD", notifTitle, notifMsg));

        return ResponseEntity.ok(summaryReport);
    }

    // 9. PUT: Approve/Reject/Request Re-upload of Resident Verification Documents
    @PutMapping("/verify/{residentId}/action")
    public ResponseEntity<?> actionResidentVerification(
            @PathVariable Long residentId,
            @RequestParam String callerRole,
            @RequestParam String callerUsername,
            @RequestParam String action,
            @RequestBody(required = false) Map<String, String> body) {

        if (!"ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole) && !"ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(403).body("Access denied. Only Community Admins and Admins can verify documents.");
        }

        User resident = userRepository.findById(residentId)
                .orElseThrow(() -> new RuntimeException("Resident not found with ID: " + residentId));

        String rejectReason = body != null ? body.get("reason") : null;

        if (("REJECT".equalsIgnoreCase(action) || "REQUEST_REUPLOAD".equalsIgnoreCase(action)) &&
                (rejectReason == null || rejectReason.trim().isEmpty())) {
            return ResponseEntity.badRequest().body("Error: Rejection reason is mandatory when rejecting or requesting re-upload.");
        }

        if ("APPROVE".equalsIgnoreCase(action)) {
            resident.setVerificationStatus("VERIFIED");
            resident.setVerificationRejectReason(null);
            // Notify the resident
            notificationRepository.save(new Notification(
                    resident.getUsername(), "VERIFICATION_APPROVED",
                    "Identity Verified ✓",
                    "Your residency documents have been verified and approved by your Community Admin. You now have full access to your dashboard."
            ));
        } else if ("REJECT".equalsIgnoreCase(action)) {
            resident.setVerificationStatus("REJECTED");
            resident.setVerificationRejectReason(rejectReason);
            // Notify the resident
            notificationRepository.save(new Notification(
                    resident.getUsername(), "VERIFICATION_REJECTED",
                    "Verification Rejected",
                    "Your document was rejected. Reason: " + rejectReason + ". Please re-upload a valid document."
            ));
        } else if ("REQUEST_REUPLOAD".equalsIgnoreCase(action)) {
            resident.setVerificationStatus("REJECTED"); // Prompt user to reupload
            resident.setVerificationRejectReason("Re-upload requested: " + rejectReason);
            // Notify the resident
            notificationRepository.save(new Notification(
                    resident.getUsername(), "VERIFICATION_REUPLOAD",
                    "Re-upload Required",
                    "Your Community Admin has requested you to re-upload your documents. Reason: " + rejectReason
            ));
        } else {
            return ResponseEntity.badRequest().body("Invalid action. Must be APPROVE, REJECT, or REQUEST_REUPLOAD.");
        }

        userRepository.save(resident);
        if ("APPROVE".equalsIgnoreCase(action)) {
            syncUserToHousehold(resident);
        }
        return ResponseEntity.ok(resident);
    }

    // 10. GET: List residents with PENDING_VERIFICATION status (scoped by block for community admins)
    @GetMapping("/pending-verifications")
    public ResponseEntity<?> getPendingVerifications(
            @RequestParam String callerRole,
            @RequestParam(required = false) String callerBlock) {

        List<User> pending;
        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole) && callerBlock != null) {
            pending = userRepository.findAll().stream()
                    .filter(u -> "PENDING_VERIFICATION".equalsIgnoreCase(u.getVerificationStatus())
                            && callerBlock.equalsIgnoreCase(u.getApartmentBlock()))
                    .collect(Collectors.toList());
        } else if ("ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
            pending = userRepository.findAll().stream()
                    .filter(u -> "PENDING_VERIFICATION".equalsIgnoreCase(u.getVerificationStatus()))
                    .collect(Collectors.toList());
        } else {
            return ResponseEntity.status(403).body("Access denied.");
        }

        // Build response with document metadata
        List<Map<String, Object>> result = new ArrayList<>();
        for (User u : pending) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", u.getId());
            entry.put("username", u.getUsername());
            entry.put("fullName", u.getFullName());
            entry.put("email", u.getEmail());
            entry.put("houseNumber", u.getHouseNumber());
            entry.put("apartmentBlock", u.getApartmentBlock());
            entry.put("colonyName", u.getColonyName());
            entry.put("verificationStatus", u.getVerificationStatus());
            // Include document metadata (not binary)
            List<UserDocument> docs = userDocumentRepository.findByUsername(u.getUsername());
            List<Map<String, Object>> docList = new ArrayList<>();
            for (UserDocument doc : docs) {
                Map<String, Object> dMap = new HashMap<>();
                dMap.put("id", doc.getId());
                dMap.put("documentType", doc.getDocumentType());
                dMap.put("fileName", doc.getFileName());
                dMap.put("fileType", doc.getFileType());
                docList.add(dMap);
            }
            entry.put("documents", docList);
            result.add(entry);
        }
        return ResponseEntity.ok(result);
    }
}
