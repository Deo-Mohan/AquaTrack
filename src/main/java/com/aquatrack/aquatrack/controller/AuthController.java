package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.dto.RegisterRequest;
import com.aquatrack.aquatrack.dto.LoginRequest;
import com.aquatrack.aquatrack.model.*;
import com.aquatrack.aquatrack.repository.*;
import com.aquatrack.aquatrack.service.JwtUtils;
import com.aquatrack.aquatrack.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ApartmentRepository apartmentRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private InvitationRepository invitationRepository;

    @Autowired
    private OtpTokenRepository otpTokenRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private EmailService emailService;

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


    // 0. Check Username Endpoint
    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestParam String username) {
        boolean exists = userRepository.existsByUsername(username);
        return ResponseEntity.ok(Collections.singletonMap("exists", exists));
    }

    // 1. PUBLIC REGISTER ENDPOINT (Only for Community Admin)
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest signUpRequest) {
        if (signUpRequest.getEmail() == null || !signUpRequest.getEmail().contains("@")) {
            return ResponseEntity.badRequest().body("Error: Email must contain '@' and be a valid address.");
        }
        
        signUpRequest.setEmail(signUpRequest.getEmail().trim().toLowerCase());

        // Strictly restrict public registration to COMMUNITY_ADMIN. RESIDENT is Invitation Only!
        if ("RESIDENT".equalsIgnoreCase(signUpRequest.getRole()) || "ROLE_RESIDENT".equalsIgnoreCase(signUpRequest.getRole())) {
            return ResponseEntity.badRequest().body("Error: Household registration is disabled on the public portal. You must register via invitation link sent by your Community Admin.");
        }

        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity.badRequest().body("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest().body("Error: Email is already in use!");
        }

        String mobile = signUpRequest.getMobileNumber();
        if (mobile == null || !mobile.matches("\\d{10}")) {
            return ResponseEntity.badRequest().body("Error: Mobile number must be exactly 10 digits.");
        }

        String hashed_password = passwordEncoder.encode(signUpRequest.getPassword());

        User user = new User();
        user.setUsername(signUpRequest.getUsername());
        user.setEmail(signUpRequest.getEmail());
        user.setPassword(hashed_password);
        user.setRole("ROLE_" + signUpRequest.getRole().toUpperCase());
        user.setHouseNumber(signUpRequest.getHouseNumber());
        user.setColonyName(signUpRequest.getColonyName());
        user.setApartmentBlock(signUpRequest.getApartmentBlock());
        user.setGender(signUpRequest.getGender());
        user.setFullName(signUpRequest.getFullName());
        user.setMobileNumber(signUpRequest.getMobileNumber());
        user.setWhatsAppNumber(signUpRequest.getWhatsAppNumber() != null ? signUpRequest.getWhatsAppNumber() : signUpRequest.getMobileNumber());
        
        // Status set to PENDING for approval
        user.setStatus("PENDING");
        user.setVerificationStatus("NOT_SUBMITTED"); // Verification happens after approval for household users, or community admin can set theirs

        userRepository.save(user);

        // Notify Super Admins
        String block = signUpRequest.getApartmentBlock() != null ? signUpRequest.getApartmentBlock() : "Unassigned";
        String notifTitle = "New Community Admin Request";
        String notifMessage = "A new Community Admin registration request has been received from '" 
                + signUpRequest.getFullName() + "' (" + signUpRequest.getColonyName() + " - " + block + ").";

        List<User> superAdmins = userRepository.findByRole("ROLE_ADMIN");
        for (User admin : superAdmins) {
            if ("APPROVED".equalsIgnoreCase(admin.getStatus())) {
                notificationRepository.save(new Notification(
                        admin.getUsername(), "APPROVAL_REQUEST", notifTitle, notifMessage
                ));
            }
        }

        return ResponseEntity.ok("Your Community Admin registration request has been submitted successfully and is pending administrator approval.");
    }

    // 2. LOGIN ENDPOINT (Supports Username OR Email automatically)
    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        String loginInput = loginRequest.getUsername().trim();
        Optional<User> userOpt;

        // Auto-detect username or email
        if (loginInput.contains("@")) {
            // Find by Email
            userOpt = userRepository.findAll().stream()
                    .filter(u -> loginInput.equalsIgnoreCase(u.getEmail()))
                    .findFirst();
        } else {
            // Find by Username
            userOpt = userRepository.findByUsername(loginInput);
        }

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Either your username/email or password is wrong.");
        }

        User user = userOpt.get();

        // Verify status
        if ("REJECTED".equalsIgnoreCase(user.getStatus())) {
            return ResponseEntity.badRequest().body("Error: Your account registration request was rejected by the administrator.");
        }
        if ("PENDING".equalsIgnoreCase(user.getStatus())) {
            return ResponseEntity.badRequest().body("Error: Your account registration is pending administrator approval.");
        }
        if ("SUSPENDED".equalsIgnoreCase(user.getStatus())) {
            return ResponseEntity.badRequest().body("Error: Your account has been suspended by the administrator.");
        }

        // Verify password
        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body("Error: Either your username/email or password is wrong.");
        }

        // Generate JWT Access Token (24 hours)
        String token = jwtUtils.generateToken(user.getUsername(), user.getRole());

        // Generate Refresh Token (7 days)
        String refreshUUID = UUID.randomUUID().toString();
        RefreshToken refreshToken = new RefreshToken(
                user.getUsername(),
                refreshUUID,
                LocalDateTime.now().plusDays(7)
        );
        refreshTokenRepository.save(refreshToken);

        // Build Response
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("refreshToken", refreshUUID);
        response.put("username", user.getUsername());
        response.put("role", user.getRole());
        response.put("email", user.getEmail());
        response.put("houseNumber", user.getHouseNumber());
        response.put("colonyName", user.getColonyName());
        response.put("apartmentBlock", user.getApartmentBlock());
        response.put("gender", user.getGender());
        response.put("fullName", user.getFullName());
        response.put("mobileNumber", user.getMobileNumber());
        response.put("whatsAppNumber", user.getWhatsAppNumber());
        response.put("verificationStatus", user.getVerificationStatus());
        response.put("verificationRejectReason", user.getVerificationRejectReason());

        return ResponseEntity.ok(response);
    }

    // 3. REFRESH TOKEN ENDPOINT
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshAccessToken(@RequestBody Map<String, String> request) {
        String tokenStr = request.get("refreshToken");
        if (tokenStr == null || tokenStr.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Refresh token is required.");
        }

        Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByToken(tokenStr);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Invalid refresh token.");
        }

        RefreshToken refreshToken = tokenOpt.get();
        if (refreshToken.isExpired()) {
            refreshTokenRepository.delete(refreshToken);
            return ResponseEntity.status(401).body("Error: Refresh token expired. Please login again.");
        }

        Optional<User> userOpt = userRepository.findByUsername(refreshToken.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: User not found.");
        }
        User user = userOpt.get();

        // Generate new access token
        String newAccessToken = jwtUtils.generateToken(user.getUsername(), user.getRole());

        // Optional: rotate refresh token
        String newRefreshUUID = UUID.randomUUID().toString();
        refreshToken.setToken(newRefreshUUID);
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshTokenRepository.save(refreshToken);

        Map<String, String> response = new HashMap<>();
        response.put("token", newAccessToken);
        response.put("refreshToken", newRefreshUUID);

        return ResponseEntity.ok(response);
    }

    // 4. LOGOUT ENDPOINT
    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser(@RequestBody Map<String, String> request) {
        String tokenStr = request.get("refreshToken");
        if (tokenStr != null) {
            refreshTokenRepository.deleteByToken(tokenStr);
        }
        return ResponseEntity.ok("Logged out successfully.");
    }

    // 5. LOGOUT ALL DEVICES ENDPOINT
    @PostMapping("/logout-all")
    public ResponseEntity<?> logoutAllDevices(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Username is required.");
        }
        refreshTokenRepository.deleteByUsername(username);
        return ResponseEntity.ok("Logged out from all devices successfully.");
    }

    // 6. INVITATION DETAILS RETRIEVAL
    @GetMapping("/invite/{token}")
    public ResponseEntity<?> getInviteDetails(@PathVariable String token) {
        Optional<Invitation> invitationOpt = invitationRepository.findByToken(token);
        if (invitationOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Invitation link is invalid or expired.");
        }

        Invitation invitation = invitationOpt.get();
        if (invitation.isExpired()) {
            invitation.setStatus("EXPIRED");
            invitationRepository.save(invitation);

            // Notify Community Admin
            String caUsername = invitation.getInvitedBy();
            if (caUsername != null && !caUsername.trim().isEmpty()) {
                String notifTitle = "Invitation Expired";
                String notifMsg = String.format("Invitation sent to '%s' (%s) has expired.", 
                        invitation.getFullName(), invitation.getEmail());
                notificationRepository.save(new Notification(caUsername, "INVITATION_EXPIRED", notifTitle, notifMsg));
            }

            return ResponseEntity.badRequest().body("Error: Invitation link has expired.");
        }

        if (!"PENDING".equalsIgnoreCase(invitation.getStatus())) {
            return ResponseEntity.badRequest().body("Error: Invitation link has already been used.");
        }

        Map<String, String> details = new HashMap<>();
        details.put("fullName", invitation.getFullName());
        details.put("email", invitation.getEmail());
        details.put("colonyName", invitation.getColonyName());
        details.put("apartmentBlock", invitation.getApartmentBlock());
        details.put("houseNumber", invitation.getHouseNumber());
        details.put("invitedBy", invitation.getInvitedBy());
        details.put("meterId", invitation.getMeterId());

        return ResponseEntity.ok(details);
    }

    // 7. COMPLETE REGISTRATION VIA INVITATION
    @PostMapping("/register-invite")
    public ResponseEntity<?> completeInviteRegistration(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String username = body.get("username");
        String password = body.get("password");
        String houseNumber = body.get("houseNumber");
        String mobileNumber = body.get("mobileNumber");
        String whatsAppNumber = body.get("whatsAppNumber");
        String gender = body.get("gender");

        if (token == null || username == null || password == null) {
            return ResponseEntity.badRequest().body("Error: Token, Username, and Password are required.");
        }

        Optional<Invitation> invitationOpt = invitationRepository.findByToken(token);
        if (invitationOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Invitation not found.");
        }

        Invitation invitation = invitationOpt.get();
        if (invitation.isExpired()) {
            invitation.setStatus("EXPIRED");
            invitationRepository.save(invitation);

            // Notify Community Admin
            String caUsername = invitation.getInvitedBy();
            if (caUsername != null && !caUsername.trim().isEmpty()) {
                String notifTitle = "Invitation Expired";
                String notifMsg = String.format("Invitation sent to '%s' (%s) has expired.", 
                        invitation.getFullName(), invitation.getEmail());
                notificationRepository.save(new Notification(caUsername, "INVITATION_EXPIRED", notifTitle, notifMsg));
            }

            return ResponseEntity.badRequest().body("Error: Invitation expired.");
        }

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.badRequest().body("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(invitation.getEmail())) {
            return ResponseEntity.badRequest().body("Error: This email address is already registered.");
        }

        // Create Active User Account
        User user = new User();
        user.setUsername(username);
        user.setEmail(invitation.getEmail());
        user.setPassword(passwordEncoder.encode(password));
        user.setRole("ROLE_RESIDENT");
        user.setStatus("APPROVED"); // Account approved directly
        user.setVerificationStatus("NOT_SUBMITTED");
        user.setFullName(invitation.getFullName());
        user.setColonyName(invitation.getColonyName());
        user.setApartmentBlock(invitation.getApartmentBlock());
        // House number is pre-assigned by the Community Admin when sending the invite
        user.setHouseNumber(invitation.getHouseNumber() != null ? invitation.getHouseNumber() : houseNumber);
        user.setMobileNumber(mobileNumber);
        user.setWhatsAppNumber(whatsAppNumber != null ? whatsAppNumber : mobileNumber);
        user.setGender(gender != null ? gender : "female");
        user.setMeterId(invitation.getMeterId());

        // Inherit tariff settings from the Community Admin of this block
        if (invitation.getApartmentBlock() != null && !invitation.getApartmentBlock().trim().isEmpty()) {
            List<User> blockAdmins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", invitation.getApartmentBlock());
            if (!blockAdmins.isEmpty()) {
                User blockAdmin = blockAdmins.get(0);
                if (blockAdmin.getWaterRatePerLiter() != null) user.setWaterRatePerLiter(blockAdmin.getWaterRatePerLiter());
                if (blockAdmin.getMonthlyLimitLiters() != null) user.setMonthlyLimitLiters(blockAdmin.getMonthlyLimitLiters());
                if (blockAdmin.getExcessRatePerLiter() != null) user.setExcessRatePerLiter(blockAdmin.getExcessRatePerLiter());
            }
        }

        userRepository.save(user);
        syncUserToHousehold(user);

        // Invalidate Token
        invitation.setStatus("COMPLETED");
        invitationRepository.save(invitation);

        // Notify Community Admin
        String caUsername = invitation.getInvitedBy();
        if (caUsername != null && !caUsername.trim().isEmpty()) {
            String notifTitle = "Invitation Accepted";
            String notifMsg = String.format("Resident '%s' (%s) has accepted the invitation and completed registration.", 
                    invitation.getFullName(), invitation.getEmail());
            notificationRepository.save(new Notification(caUsername, "INVITATION_ACCEPTED", notifTitle, notifMsg));
        }

        return ResponseEntity.ok("Registration completed successfully! You may now sign in.");
    }

    // 8. FORGOT PASSWORD - REQUEST OTP
    @PostMapping("/forgot-password")
    public ResponseEntity<?> requestPasswordOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Email is required.");
        }

        final String finalEmail = email.trim().toLowerCase();

        // Check if user exists
        long userCount = userRepository.findAll().stream()
                .filter(u -> finalEmail.equalsIgnoreCase(u.getEmail()))
                .count();

        if (userCount == 0) {
            return ResponseEntity.badRequest().body("Error: No account found with that email address.");
        }

        // Rate limit checks (max once every 60 seconds)
        Optional<OtpToken> lastOtpOpt = otpTokenRepository.findTopByEmailOrderByCreatedAtDesc(email);
        if (lastOtpOpt.isPresent()) {
            OtpToken lastOtp = lastOtpOpt.get();
            if (lastOtp.getCreatedAt().plusSeconds(60).isAfter(LocalDateTime.now())) {
                return ResponseEntity.badRequest().body("Error: Please wait 60 seconds before requesting another OTP.");
            }
        }

        // Generate 6-digit OTP
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        String otpCode = String.valueOf(otp);

        // Save to DB (10 min expiry)
        OtpToken otpToken = new OtpToken(email, otpCode, LocalDateTime.now().plusMinutes(10));
        otpTokenRepository.save(otpToken);

        // Send Email
        emailService.sendForgotPasswordOtpEmail(email, otpCode);

        return ResponseEntity.ok("A 6-digit verification OTP has been sent to your email address.");
    }

    // 9. FORGOT PASSWORD - VERIFY OTP
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtpCode(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otpCode = body.get("otpCode");

        if (email == null || otpCode == null) {
            return ResponseEntity.badRequest().body("Error: Email and OTP Code are required.");
        }

        email = email.trim().toLowerCase();

        Optional<OtpToken> otpOpt = otpTokenRepository.findTopByEmailAndOtpCodeOrderByCreatedAtDesc(email, otpCode);
        if (otpOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Invalid verification OTP.");
        }

        OtpToken otpToken = otpOpt.get();
        if (otpToken.isExpired()) {
            return ResponseEntity.badRequest().body("Error: Verification OTP has expired.");
        }

        otpToken.setVerified(true);
        otpTokenRepository.save(otpToken);

        return ResponseEntity.ok(Collections.singletonMap("verified", true));
    }

    // 10. FORGOT PASSWORD - CHANGE PASSWORD
    @PostMapping("/reset-password-otp")
    public ResponseEntity<?> resetPasswordWithOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otpCode = body.get("otpCode");
        String newPassword = body.get("newPassword");

        if (email == null || otpCode == null || newPassword == null) {
            return ResponseEntity.badRequest().body("Error: Email, OTP, and New Password are required.");
        }

        final String finalEmail = email.trim().toLowerCase();

        Optional<OtpToken> otpOpt = otpTokenRepository.findTopByEmailAndOtpCodeOrderByCreatedAtDesc(finalEmail, otpCode);
        if (otpOpt.isEmpty() || !otpOpt.get().isVerified()) {
            return ResponseEntity.badRequest().body("Error: OTP must be verified before resetting password.");
        }

        OtpToken otpToken = otpOpt.get();
        if (otpToken.isExpired()) {
            return ResponseEntity.badRequest().body("Error: OTP has expired.");
        }

        // Find users matching email and update passwords
        Optional<User> userOpt = userRepository.findAll().stream()
                .filter(u -> finalEmail.equalsIgnoreCase(u.getEmail()))
                .findFirst();

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: User not found.");
        }

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Notify of password reset
        if ("ROLE_RESIDENT".equalsIgnoreCase(user.getRole()) && user.getApartmentBlock() != null) {
            List<User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", user.getApartmentBlock());
            for (User ca : admins) {
                String notifTitle = "Password Reset Alert";
                String notifMsg = String.format("Resident '%s' (%s) from apartment block '%s' has successfully reset their password.", 
                        user.getFullName(), user.getEmail(), user.getApartmentBlock());
                notificationRepository.save(new Notification(ca.getUsername(), "PASSWORD_RESET_ALERT", notifTitle, notifMsg));
            }
        } else if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(user.getRole())) {
            String notifTitle = "Security Alert: Password Reset";
            String notifMsg = "Your account password has been successfully reset. If you did not request this, please contact the administrator immediately.";
            notificationRepository.save(new Notification(user.getUsername(), "PASSWORD_RESET_ALERT", notifTitle, notifMsg));
        }

        // Delete all OTPs for this email to invalidate
        List<OtpToken> tokens = otpTokenRepository.findByEmail(email);
        otpTokenRepository.deleteAll(tokens);

        return ResponseEntity.ok("Password has been reset successfully. You may now login.");
    }
}