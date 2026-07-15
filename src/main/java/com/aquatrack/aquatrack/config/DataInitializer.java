package com.aquatrack.aquatrack.config;

import com.aquatrack.aquatrack.model.User;
import com.aquatrack.aquatrack.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public DataInitializer(UserRepository userRepository,
                           org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        try {
            System.out.println("Checking all tables for 'household_id' column...");
            List<java.util.Map<String, Object>> cols = jdbcTemplate.queryForList(
                "SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA " +
                "FROM INFORMATION_SCHEMA.COLUMNS " +
                "WHERE TABLE_SCHEMA = 'aquatrack'"
            );
            for (java.util.Map<String, Object> col : cols) {
                System.out.println("DB SCHEMA: Table=" + col.get("TABLE_NAME") +
                                   ", Column=" + col.get("COLUMN_NAME") +
                                   ", Type=" + col.get("COLUMN_TYPE") +
                                   ", Null=" + col.get("IS_NULLABLE") +
                                   ", Key=" + col.get("COLUMN_KEY") +
                                   ", Extra=" + col.get("EXTRA"));
            }

            System.out.println("Checking database triggers...");
            List<java.util.Map<String, Object>> triggers = jdbcTemplate.queryForList(
                "SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_STATEMENT " +
                "FROM INFORMATION_SCHEMA.TRIGGERS " +
                "WHERE TRIGGER_SCHEMA = 'aquatrack'"
            );
            for (java.util.Map<String, Object> trigger : triggers) {
                System.out.println("TRIGGER: Name=" + trigger.get("TRIGGER_NAME") +
                                   ", Event=" + trigger.get("EVENT_MANIPULATION") +
                                   ", Table=" + trigger.get("EVENT_OBJECT_TABLE") +
                                   ", Statement=" + trigger.get("ACTION_STATEMENT"));
            }
        } catch (Exception e) {
            System.err.println("Error inspecting schema/triggers: " + e.getMessage());
            e.printStackTrace();
        }

        // Seed/Update Super Admin (krishna)
        seedOrUpdateUser("krishna", "pwjeeprayas@gmail.com", "Krishna1234@", "ROLE_ADMIN", "N/A", "System", "N/A", "Male");
    }

    private void seedOrUpdateUser(String username, String email, String password, String role, String houseNumber, String colonyName, String apartmentBlock, String gender) {
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Force update password and email as requested
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setStatus("APPROVED");
            user.setRole(role);
            userRepository.save(user);
            System.out.println("Updated admin credentials for user: " + username);
        } else {
            // Create user
            User user = new User();
            user.setUsername(username);
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(role);
            user.setHouseNumber(houseNumber);
            user.setColonyName(colonyName);
            user.setApartmentBlock(apartmentBlock);
            user.setGender(gender);
            user.setFullName("Krishna");
            user.setMobileNumber("9876543210");
            user.setWhatsAppNumber("9876543210");
            user.setStatus("APPROVED");
            user.setVerificationStatus("APPROVED");
            userRepository.save(user);
            System.out.println("Successfully seeded admin user: " + username + " with role: " + role);
        }
    }
}
