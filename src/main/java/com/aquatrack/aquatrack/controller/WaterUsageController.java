package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.WaterUsageLog;
import com.aquatrack.aquatrack.repository.WaterUsageRepository;
import com.aquatrack.aquatrack.repository.UserRepository;
import com.aquatrack.aquatrack.service.AlertService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.aquatrack.aquatrack.model.WaterUsageAuditLog;
import com.aquatrack.aquatrack.model.Notification;
import com.aquatrack.aquatrack.repository.WaterUsageAuditLogRepository;
import com.aquatrack.aquatrack.repository.NotificationRepository;
import java.time.LocalDateTime;


import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/usage")
public class WaterUsageController {

    @Autowired
    private WaterUsageRepository repository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AlertService alertService;

    @Autowired
    private WaterUsageAuditLogRepository auditLogRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    // 1. POST: Submit a single manual meter reading
    @PostMapping("/log")
    public ResponseEntity<?> logWaterUsage(
            @Valid @RequestBody WaterUsageLog log,
            @RequestParam(required = false) String callerRole) {
        
        if (!"ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(403).body("Access denied. Only Community Admins can log water usage.");
        }

        if (log.getHouseNumber() != null) {
            java.util.Optional<com.aquatrack.aquatrack.model.User> targetUser = userRepository.findByHouseNumber(log.getHouseNumber());
            if (targetUser.isPresent() && "ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(targetUser.get().getRole())) {
                return ResponseEntity.status(403).body("Access denied. Cannot log water usage for a Community Admin.");
            }
        }

        log.setSource("MANUAL");

        // Resolve household user's username
        String targetUsername = null;
        if (log.getHouseNumber() != null) {
            java.util.Optional<com.aquatrack.aquatrack.model.User> targetUser = userRepository.findByHouseNumber(log.getHouseNumber());
            if (targetUser.isPresent()) {
                targetUsername = targetUser.get().getUsername();
            }
        }

        // Run anomaly detection and threshold alerts
        alertService.analyzeUsage(log, targetUsername);

        WaterUsageLog savedLog = repository.save(log);

        // Notify the household user
        if (targetUsername != null) {
            Notification notif = new Notification(
                targetUsername,
                "SYSTEM",
                "Water Meter Reading Logged",
                String.format(
                    "A new water meter reading of %.0f Liters was logged for your household (%s) on %s.",
                    log.getReadingLiters(), log.getHouseNumber(), log.getReadingDate()
                )
            );
            notif.setReferenceId(savedLog.getId());
            notif.setReferenceType("USAGE_LOG");
            notificationRepository.save(notif);
        }

        return ResponseEntity.ok(savedLog);
    }

    // GET: Download CSV prefilled template for logging water usage
    @GetMapping("/template")
    public ResponseEntity<String> downloadTemplate(
            @RequestParam(required = false) String apartmentBlock) {
        
        List<com.aquatrack.aquatrack.model.User> residents;
        if (apartmentBlock != null && !apartmentBlock.trim().isEmpty()) {
            residents = userRepository.findAll().stream()
                    .filter(u -> "ROLE_RESIDENT".equalsIgnoreCase(u.getRole()) || "ROLE_HOUSEHOLD_USER".equalsIgnoreCase(u.getRole()))
                    .filter(u -> "APPROVED".equalsIgnoreCase(u.getStatus()))
                    .filter(u -> apartmentBlock.equalsIgnoreCase(u.getApartmentBlock()))
                    .collect(java.util.stream.Collectors.toList());
        } else {
            // Find all approved household residents
            residents = userRepository.findAll().stream()
                    .filter(u -> "ROLE_RESIDENT".equalsIgnoreCase(u.getRole()) || "ROLE_HOUSEHOLD_USER".equalsIgnoreCase(u.getRole()))
                    .filter(u -> "APPROVED".equalsIgnoreCase(u.getStatus()))
                    .collect(java.util.stream.Collectors.toList());
        }

        StringBuilder csvContent = new StringBuilder();
        csvContent.append("houseNumber,apartmentBlock,readingDate,readingLiters,logType\n");

        LocalDate today = LocalDate.now();
        for (com.aquatrack.aquatrack.model.User resident : residents) {
            String house = resident.getHouseNumber();
            String block = resident.getApartmentBlock();
            if (house != null && block != null) {
                csvContent.append(String.format("%s,%s,%s,,MONTHLY\n", house, block, today.toString()));
            }
        }

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=water_usage_template.csv")
                .header("Content-Type", "text/csv")
                .body(csvContent.toString());
    }

    // 2. POST: Bulk CSV upload of meter readings
    // CSV format: houseNumber,apartmentBlock,readingDate(YYYY-MM-DD),readingLiters,logType
    @PostMapping("/upload-csv")
    public ResponseEntity<?> uploadCsvReadings(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String callerRole) {
        
        if (!"ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(403).body("Access denied. Only Community Admins can upload CSV readings.");
        }

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("CSV file is empty.");
        }

        List<WaterUsageLog> savedLogs = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int lineNumber = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                lineNumber++;

                // Skip header row
                if (lineNumber == 1 && (line.toLowerCase().contains("housenumber") || line.toLowerCase().contains("householdid"))) continue;

                String[] parts = line.split(",", -1);
                if (parts.length < 4) {
                    errors.add("Line " + lineNumber + ": insufficient columns");
                    continue;
                }

                try {
                    String houseNumber = parts[0].trim();
                    String apartmentBlock = parts[1].trim();
                    LocalDate readingDate = LocalDate.parse(parts[2].trim());
                    
                    String readingLitersStr = parts[3].trim();
                    if (readingLitersStr.isEmpty()) {
                        // Skip blank rows where the community admin didn't input a reading
                        continue;
                    }
                    Double readingLiters = Double.parseDouble(readingLitersStr);
                    
                    String logType = "MONTHLY";
                    if (parts.length >= 5 && !parts[4].trim().isEmpty()) {
                        String typeVal = parts[4].trim().toUpperCase();
                        if ("DAILY".equals(typeVal) || "MONTHLY".equals(typeVal)) {
                            logType = typeVal;
                        }
                    }

                    // Check if target is community admin
                    java.util.Optional<com.aquatrack.aquatrack.model.User> targetUser = userRepository.findByHouseNumber(houseNumber);
                    if (targetUser.isPresent() && "ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(targetUser.get().getRole())) {
                        errors.add("Line " + lineNumber + ": Access denied. Cannot log water usage for a Community Admin.");
                        continue;
                    }

                    // Duplicate detection
                    if (repository.existsByHouseNumberAndReadingDate(houseNumber, readingDate)) {
                        errors.add("Line " + lineNumber + ": duplicate reading for " + houseNumber +
                                " on " + readingDate);
                        continue;
                    }

                    WaterUsageLog log = new WaterUsageLog();
                    log.setHouseNumber(houseNumber);
                    log.setApartmentBlock(apartmentBlock);
                    log.setReadingDate(readingDate);
                    log.setReadingLiters(readingLiters);
                    log.setLogType(logType);
                    log.setSource("CSV");

                    // Resolve household user's username
                    String targetUsername = null;
                    if (targetUser.isPresent()) {
                        targetUsername = targetUser.get().getUsername();
                    }

                    // Run anomaly detection
                    alertService.analyzeUsage(log, targetUsername);

                    WaterUsageLog savedLog = repository.save(log);
                    savedLogs.add(savedLog);

                    // Notify the household user
                    if (targetUsername != null) {
                        Notification notif = new Notification(
                            targetUsername,
                            "SYSTEM",
                            "Water Meter Reading Logged (CSV)",
                            String.format(
                                "A new water meter reading of %.0f Liters was logged via CSV for your household (%s) on %s.",
                                log.getReadingLiters(), log.getHouseNumber(), log.getReadingDate()
                            )
                        );
                        notif.setReferenceId(savedLog.getId());
                        notif.setReferenceType("USAGE_LOG");
                        notificationRepository.save(notif);
                    }
                } catch (Exception e) {
                    errors.add("Line " + lineNumber + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error processing CSV: " + e.getMessage());
        }

        return ResponseEntity.ok("Processed " + savedLogs.size() + " readings successfully. " +
                (errors.isEmpty() ? "No errors." : errors.size() + " errors: " + errors));
    }

    // 3. GET: Retrieve all logs (Admin)
    @GetMapping("/all")
    public ResponseEntity<List<WaterUsageLog>> getAllLogs() {
        return ResponseEntity.ok(repository.findAll());
    }

    // 4. GET: Fetch history for a single household (Resident)
    @GetMapping("/household/{houseNumber}")
    public ResponseEntity<List<WaterUsageLog>> getLogsByHousehold(@PathVariable String houseNumber) {
        return ResponseEntity.ok(repository.findByHouseNumber(houseNumber));
    }

    // 5. GET: Fetch logs for an apartment block (Community Admin)
    @GetMapping("/block/{apartmentBlock}")
    public ResponseEntity<List<WaterUsageLog>> getLogsByBlock(@PathVariable String apartmentBlock) {
        return ResponseEntity.ok(repository.findByApartmentBlock(apartmentBlock));
    }

    // 6. GET: Fetch logs for a household within a date range
    @GetMapping("/household/{houseNumber}/range")
    public ResponseEntity<List<WaterUsageLog>> getLogsByHouseholdAndRange(
            @PathVariable String houseNumber,
            @RequestParam String start,
            @RequestParam String end) {
        LocalDate startDate = LocalDate.parse(start);
        LocalDate endDate = LocalDate.parse(end);
        return ResponseEntity.ok(
                repository.findByHouseNumberAndReadingDateBetween(houseNumber, startDate, endDate));
    }

    // 7. GET: Get average and standard deviation for a household (for anomaly display)
    @GetMapping("/household/{houseNumber}/stats")
    public ResponseEntity<?> getHouseholdUsageStats(@PathVariable String houseNumber) {
        Double avg = repository.avgConsumptionByHousehold(houseNumber);
        Double stddev = repository.stddevConsumptionByHousehold(houseNumber);
        var latest = repository.findTopByHouseNumberOrderByReadingDateDesc(houseNumber);

        return ResponseEntity.ok(java.util.Map.of(
                "average", avg != null ? avg : 0.0,
                "standardDeviation", stddev != null ? stddev : 0.0,
                "upperThreshold", (avg != null && stddev != null) ? avg + (2 * stddev) : 0.0,
                "latestReading", latest != null ? latest.getReadingLiters() : 0.0
        ));
    }

    // 8. PUT: Update a water usage log
    @PutMapping("/{id}")
    public ResponseEntity<?> updateWaterUsage(
            @PathVariable Long id,
            @Valid @RequestBody WaterUsageLog updatedLog,
            @RequestParam String username,
            @RequestParam String callerRole) {
        WaterUsageLog existingLog = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Water usage log not found with ID: " + id));

        Double oldLiters = existingLog.getReadingLiters();
        Double newLiters = updatedLog.getReadingLiters();

        existingLog.setReadingLiters(newLiters);
        existingLog.setReadingDate(updatedLog.getReadingDate());
        if (updatedLog.getStatus() != null) {
            existingLog.setStatus(updatedLog.getStatus());
        }

        // Resolve resident username
        String targetUsername = null;
        if (existingLog.getHouseNumber() != null) {
            java.util.Optional<com.aquatrack.aquatrack.model.User> targetUser = userRepository.findByHouseNumber(existingLog.getHouseNumber());
            if (targetUser.isPresent()) {
                targetUsername = targetUser.get().getUsername();
            }
        }

        alertService.analyzeUsage(existingLog, targetUsername);
        WaterUsageLog saved = repository.save(existingLog);

        WaterUsageAuditLog audit = new WaterUsageAuditLog(
                id,
                existingLog.getHouseNumber(),
                existingLog.getApartmentBlock(),
                "EDITED",
                oldLiters,
                newLiters,
                username
        );
        auditLogRepository.save(audit);

        String title = "Water Log Edited";
        String message = "Community Admin '" + username + "' edited a water usage log for house number '" + existingLog.getHouseNumber() + "'. Old: " + oldLiters + "L, New: " + newLiters + "L.";
        
        // Notify Super Admins
        List<com.aquatrack.aquatrack.model.User> superAdmins = userRepository.findByRole("ROLE_ADMIN");
        for (com.aquatrack.aquatrack.model.User admin : superAdmins) {
            if ("APPROVED".equalsIgnoreCase(admin.getStatus())) {
                notificationRepository.save(new Notification(
                        admin.getUsername(), "SYSTEM", title, message
                ));
            }
        }

        // Notify Resident
        if (targetUsername != null) {
            notificationRepository.save(new Notification(
                    targetUsername,
                    "SYSTEM",
                    "Water Meter Reading Updated",
                    String.format(
                        "Your water meter reading for %s has been updated by the Community Admin to %.0f Liters (was %.0f Liters).",
                        existingLog.getReadingDate(), newLiters, oldLiters
                    )
            ));
        }

        return ResponseEntity.ok(saved);
    }

    // 9. DELETE: Delete a water usage log
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteWaterUsage(
            @PathVariable Long id,
            @RequestParam String username,
            @RequestParam String callerRole) {
        WaterUsageLog existingLog = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Water usage log not found with ID: " + id));

        Double oldLiters = existingLog.getReadingLiters();

        // Resolve resident username
        String targetUsername = null;
        if (existingLog.getHouseNumber() != null) {
            java.util.Optional<com.aquatrack.aquatrack.model.User> targetUser = userRepository.findByHouseNumber(existingLog.getHouseNumber());
            if (targetUser.isPresent()) {
                targetUsername = targetUser.get().getUsername();
            }
        }

        WaterUsageAuditLog audit = new WaterUsageAuditLog(
                id,
                existingLog.getHouseNumber(),
                existingLog.getApartmentBlock(),
                "DELETED",
                oldLiters,
                null,
                username
        );
        auditLogRepository.save(audit);

        String title = "Water Log Deleted";
        String message = "Community Admin '" + username + "' deleted a water usage log of " + oldLiters + "L for house number '" + existingLog.getHouseNumber() + "'.";
        
        // Notify Super Admins
        List<com.aquatrack.aquatrack.model.User> superAdmins = userRepository.findByRole("ROLE_ADMIN");
        for (com.aquatrack.aquatrack.model.User admin : superAdmins) {
            if ("APPROVED".equalsIgnoreCase(admin.getStatus())) {
                notificationRepository.save(new Notification(
                        admin.getUsername(), "SYSTEM", title, message
                ));
            }
        }

        // Notify Resident
        if (targetUsername != null) {
            notificationRepository.save(new Notification(
                    targetUsername,
                    "SYSTEM",
                    "Water Meter Reading Deleted",
                    String.format(
                        "Your water meter reading for %s (%.0f Liters) was deleted by the Community Admin.",
                        existingLog.getReadingDate(), oldLiters
                    )
            ));
        }

        repository.delete(existingLog);
        return ResponseEntity.ok("Water usage log deleted successfully.");
    }

    // 10. GET: Get audit log history for last 24 hours (Super Admin)
    @GetMapping("/audit-history")
    public ResponseEntity<List<WaterUsageAuditLog>> getAuditHistory() {
        LocalDateTime twentyFourHoursAgo = LocalDateTime.now().minusHours(24);
        return ResponseEntity.ok(auditLogRepository.findByActionTimeAfterOrderByActionTimeDesc(twentyFourHoursAgo));
    }
}