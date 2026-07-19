package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.User;
import com.aquatrack.aquatrack.model.UserDocument;
import com.aquatrack.aquatrack.model.Notification;
import com.aquatrack.aquatrack.repository.UserRepository;
import com.aquatrack.aquatrack.repository.UserDocumentRepository;
import com.aquatrack.aquatrack.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.io.IOException;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserDocumentRepository userDocumentRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    // 1. GET User Profile details from Database by username
    @GetMapping("/profile/{username}")
    public ResponseEntity<?> getUserProfile(@PathVariable String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Error: User not found with username: " + username));
        
        return ResponseEntity.ok(user);
    }

    // 2. PUT Update User Profile details in Database
    @PutMapping("/profile/{username}")
    public ResponseEntity<?> updateUserProfile(
            @PathVariable String username,
            @RequestBody User profileDetails) {
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Error: User not found with username: " + username));

        // Update fields that are editable by the user
        user.setEmail(profileDetails.getEmail());
        user.setGender(profileDetails.getGender());
        user.setFullName(profileDetails.getFullName());
        user.setMobileNumber(profileDetails.getMobileNumber());
        user.setWhatsAppNumber(profileDetails.getWhatsAppNumber());
        
        // Save back to MySQL database
        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }

    // 3. GET contacts for a user (admins/community admins)
    @GetMapping("/contacts/{username}")
    public ResponseEntity<?> getUserContacts(@PathVariable String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Error: User not found with username: " + username));
        
        List<User> contacts = new ArrayList<>();
        List<User> superAdmins = userRepository.findByRole("ROLE_ADMIN");
        
        if ("ROLE_RESIDENT".equalsIgnoreCase(user.getRole()) || "ROLE_HOUSEHOLD_USER".equalsIgnoreCase(user.getRole())) {
            // Add community admins of the same block
            if (user.getApartmentBlock() != null) {
                contacts.addAll(userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", user.getApartmentBlock()));
            }
            // Add super admins
            contacts.addAll(superAdmins);
        } else if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(user.getRole())) {
            // Community admin sees super admins
            contacts.addAll(superAdmins);
        } else if ("ROLE_ADMIN".equalsIgnoreCase(user.getRole())) {
            // Super admins only see the developer (handled in frontend) or other super admins if needed.
            // Returning nothing from DB since they don't need support from Community Admins.
        }
        
        // Return only approved users, and remove sensitive info (like passwords)
        List<User> safeContacts = new ArrayList<>();
        for (User c : contacts) {
            if (c.getStatus() == null || c.getStatus().trim().isEmpty() || "APPROVED".equalsIgnoreCase(c.getStatus())) {
                User safeC = new User();
                safeC.setId(c.getId());
                safeC.setUsername(c.getUsername());
                safeC.setFullName(c.getFullName());
                safeC.setMobileNumber(c.getMobileNumber());
                safeC.setWhatsAppNumber(c.getWhatsAppNumber());
                safeC.setEmail(c.getEmail());
                safeC.setRole(c.getRole());
                safeC.setApartmentBlock(c.getApartmentBlock());
                safeC.setColonyName(c.getColonyName());
                safeC.setGender(c.getGender());
                safeC.setHouseNumber(c.getHouseNumber());
                safeContacts.add(safeC);
            }
        }
        
        return ResponseEntity.ok(safeContacts);
    }

    // 4. POST: Upload Document for ID Verification
    @PostMapping("/profile/verify/upload")
    public ResponseEntity<?> uploadVerificationDocument(
            @RequestParam String username,
            @RequestParam String documentType,
            @RequestParam("file") MultipartFile file) {

        com.aquatrack.aquatrack.model.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Error: User not found with username: " + username));

        try {
            // Delete existing document of same type if present to overwrite
            Optional<UserDocument> existingDoc = userDocumentRepository.findByUsernameAndDocumentType(username, documentType);
            existingDoc.ifPresent(userDocument -> userDocumentRepository.delete(userDocument));

            UserDocument doc = new UserDocument(
                    username,
                    documentType,
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getBytes()
            );
            userDocumentRepository.save(doc);

            // Update user status
            user.setVerificationStatus("PENDING_VERIFICATION");
            userRepository.save(user);

            // Notify Community Admin
            if (user.getApartmentBlock() != null) {
                List<com.aquatrack.aquatrack.model.User> communityAdmins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", user.getApartmentBlock());
                for (com.aquatrack.aquatrack.model.User ca : communityAdmins) {
                    notificationRepository.save(new Notification(
                            ca.getUsername(),
                            "VERIFICATION_REQUEST",
                            "New Verification Document",
                            "Resident '" + user.getFullName() + "' (" + user.getHouseNumber() + ") has uploaded a " + documentType + " for verification."
                    ));
                }
            }

            Map<String, String> res = new HashMap<>();
            res.put("message", "Document uploaded successfully. Status set to PENDING_VERIFICATION.");
            res.put("status", "PENDING_VERIFICATION");
            return ResponseEntity.ok(res);
        } catch (IOException e) {
            return ResponseEntity.badRequest().body("Error: Failed to process uploaded file: " + e.getMessage());
        }
    }

    // 5. GET: Retrieve user uploaded document info (without binary content)
    @GetMapping("/profile/verify/documents/{username}")
    public ResponseEntity<?> getUserDocuments(@PathVariable String username) {
        List<UserDocument> docs = userDocumentRepository.findByUsername(username);
        List<Map<String, Object>> result = new ArrayList<>();
        for (UserDocument doc : docs) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", doc.getId());
            map.put("documentType", doc.getDocumentType());
            map.put("fileName", doc.getFileName());
            map.put("fileType", doc.getFileType());
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    // 6. GET: Download / View uploaded document binary content
    @GetMapping("/profile/verify/documents-download/{id}")
    public ResponseEntity<?> downloadDocument(@PathVariable Long id) {
        UserDocument doc = userDocumentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Error: Document not found with ID: " + id));

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getFileType() != null ? doc.getFileType() : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getFileName() + "\"")
                .body(doc.getFileContent());
    }

    // 7. PUT Change Password
    @PutMapping("/profile/change-password/{username}")
    public ResponseEntity<?> changePassword(
            @PathVariable String username,
            @RequestBody Map<String, String> body) {
        
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        
        if (currentPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body("Error: Current password and new password are required.");
        }
        
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body("Error: New password must be at least 6 characters long.");
        }
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Error: User not found with username: " + username));
        
        org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder passwordEncoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body("Error: Incorrect current password.");
        }
        
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        // Notify user
        notificationRepository.save(new Notification(
                user.getUsername(),
                "PASSWORD_CHANGE",
                "Password Updated Successfully",
                "Your account password was updated successfully. If you did not perform this change, contact administrator immediately."
        ));
        
        Map<String, String> res = new HashMap<>();
        res.put("message", "Password updated successfully!");
        return ResponseEntity.ok(res);
    }
}
