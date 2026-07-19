package com.aquatrack.aquatrack.config;

import com.aquatrack.aquatrack.model.User;
import com.aquatrack.aquatrack.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // Admin credentials — only used when seeding for the first time
    private static final String ADMIN_USERNAME = "krishna";
    private static final String ADMIN_EMAIL    = "pwjeeprayas@gmail.com";
    private static final String ADMIN_PASSWORD  = "Krishna1234@";

    public DataInitializer(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        ensureAdminExists();
    }

    /**
     * Seeds the Super Admin account exactly once.
     * On subsequent boots the admin already exists, so we skip the costly
     * BCrypt hash and avoid any unnecessary DB writes.
     */
    private void ensureAdminExists() {
        Optional<User> existing = userRepository.findByUsername(ADMIN_USERNAME);

        if (existing.isEmpty()) {
            User admin = new User();
            admin.setUsername(ADMIN_USERNAME);
            admin.setEmail(ADMIN_EMAIL);
            admin.setPassword(passwordEncoder.encode(ADMIN_PASSWORD)); // BCrypt only runs once
            admin.setRole("ROLE_ADMIN");
            admin.setHouseNumber("313");
            admin.setColonyName("KRISHNA");
            admin.setApartmentBlock("Block B");
            admin.setGender("Male");
            admin.setFullName("Krishna");
            admin.setMobileNumber("9876543210");
            admin.setWhatsAppNumber("9876543210");
            admin.setStatus("APPROVED");
            admin.setVerificationStatus("APPROVED");
            userRepository.save(admin);
            System.out.println("[AquaTrack] Super Admin seeded: " + ADMIN_USERNAME);
        } else {
            // Admin already exists — ensure status/role are correct without re-hashing password
            User admin = existing.get();
            boolean changed = false;
            if (!"APPROVED".equals(admin.getStatus()))       { admin.setStatus("APPROVED");      changed = true; }
            if (!"ROLE_ADMIN".equals(admin.getRole()))       { admin.setRole("ROLE_ADMIN");       changed = true; }
            if (!ADMIN_EMAIL.equalsIgnoreCase(admin.getEmail())) { admin.setEmail(ADMIN_EMAIL);   changed = true; }
            if (changed) userRepository.save(admin);
            System.out.println("[AquaTrack] Super Admin verified: " + ADMIN_USERNAME);
        }
    }
}
