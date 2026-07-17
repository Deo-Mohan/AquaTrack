package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.*;
import com.aquatrack.aquatrack.repository.*;
import com.aquatrack.aquatrack.service.BillingEngineService;
import com.aquatrack.aquatrack.service.ConsumptionDistributionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/billing-cycles")
public class BillingCycleController {

    @Autowired
    private BillingCycleRepository billingCycleRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private BillingEngineService billingEngineService;

    @Autowired
    private ConsumptionDistributionService distributionService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private WaterUsageRepository waterUsageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.aquatrack.aquatrack.service.EmailService emailService;

    // CREATE a new billing cycle (Community Admin)
    @PostMapping
    public ResponseEntity<BillingCycle> createCycle(@Valid @RequestBody BillingCycle cycle) {
        cycle.setStatus("OPEN");
        return ResponseEntity.ok(billingCycleRepository.save(cycle));
    }

    // GET all billing cycles
    @GetMapping
    public ResponseEntity<List<BillingCycle>> getAllCycles() {
        return ResponseEntity.ok(billingCycleRepository.findAll());
    }

    // GET billing cycles for a specific apartment
    @GetMapping("/apartment/{apartmentId}")
    public ResponseEntity<List<BillingCycle>> getCyclesByApartment(@PathVariable Long apartmentId) {
        return ResponseEntity.ok(billingCycleRepository.findByApartmentId(apartmentId));
    }

    // GET a single billing cycle
    @GetMapping("/{id}")
    public ResponseEntity<BillingCycle> getCycleById(@PathVariable Long id) {
        BillingCycle cycle = billingCycleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Billing cycle not found with ID: " + id));
        return ResponseEntity.ok(cycle);
    }

    // FINALIZE a billing cycle — triggers bill generation for all households
    @PostMapping("/{id}/finalize")
    public ResponseEntity<?> finalizeCycle(@PathVariable Long id) {
        BillingCycle cycle = billingCycleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Billing cycle not found with ID: " + id));

        if (!"OPEN".equals(cycle.getStatus())) {
            return ResponseEntity.badRequest().body("Billing cycle is already " + cycle.getStatus());
        }

        // Get the households in this apartment community
        List<Household> households = householdRepository.findAll().stream()
                .filter(h -> h.getApartment() != null && h.getApartment().getId().equals(cycle.getApartmentId()))
                .toList();

        // If cycle is scoped to a specific block, filter households by that block
        if (cycle.getApartmentBlock() != null && !cycle.getApartmentBlock().trim().isEmpty()) {
            households = households.stream()
                    .filter(h -> cycle.getApartmentBlock().equalsIgnoreCase(h.getBlock()))
                    .toList();
        }

        if (households.isEmpty()) {
            return ResponseEntity.badRequest().body("No households found for this billing cycle's scope.");
        }

        // Validate that each household has a water usage log recorded in this billing cycle period
        java.util.List<String> missingHouseholds = new java.util.ArrayList<>();
        for (Household household : households) {
            Double consumption = waterUsageRepository.sumConsumptionByHouseholdAndDateRange(
                    household.getHouseNumber(), cycle.getStartDate(), cycle.getEndDate());
            if (consumption == null) {
                missingHouseholds.add(household.getHouseNumber());
            }
        }

        if (!missingHouseholds.isEmpty()) {
            // Send reminder notification to the community admin(s)
            String blockName = cycle.getApartmentBlock() != null ? cycle.getApartmentBlock() : "Unassigned";
            List<User> admins;
            if (cycle.getApartmentBlock() != null && !cycle.getApartmentBlock().trim().isEmpty()) {
                admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", cycle.getApartmentBlock());
            } else {
                admins = userRepository.findAll().stream()
                        .filter(u -> "ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(u.getRole()))
                        .toList();
            }

            String title = "Missing Water Logs for " + cycle.getCycleName();
            String message = "Please record water usage logs for these households: " + String.join(", ", missingHouseholds);

            for (User admin : admins) {
                Notification reminder = new Notification();
                reminder.setUsername(admin.getUsername());
                reminder.setType("WATER_LOG_REMINDER");
                reminder.setTitle(title);
                reminder.setMessage(message);
                reminder.setReferenceType("BILLING_CYCLE");
                reminder.setReferenceId(cycle.getId());
                notificationRepository.save(reminder);
            }

            // Also notify super admin
            Notification superAdminReminder = new Notification();
            superAdminReminder.setUsername("krishna");
            superAdminReminder.setType("WATER_LOG_REMINDER");
            superAdminReminder.setTitle(title);
            superAdminReminder.setMessage(message + " (Block: " + blockName + ")");
            superAdminReminder.setReferenceType("BILLING_CYCLE");
            superAdminReminder.setReferenceId(cycle.getId());
            notificationRepository.save(superAdminReminder);

            return ResponseEntity.badRequest().body("Cannot finalize billing cycle. The following households are missing water logs: " 
                    + String.join(", ", missingHouseholds) + ". A reminder has been sent to the Community Admin.");
        }

        double totalConsumption = 0.0;
        double totalBilled = 0.0;

        // Get active tariff for this apartment (used as fallback only)
        TariffPlan tariff = billingEngineService.getActiveTariff(cycle.getApartmentId());

        // Cache shared cost distributions per block to avoid recalculating
        java.util.Map<String, java.util.Map<String, Double>> blockSharedCostsCache = new java.util.HashMap<>();

        // Generate a bill for each household
        for (Household household : households) {
            String blockName = household.getBlock() != null ? household.getBlock() : "Unassigned";

            if (!blockSharedCostsCache.containsKey(blockName)) {
                java.util.Map<String, Double> sharedCosts = distributionService.distributeSharedCosts(
                        cycle.getApartmentId(), blockName, cycle.getStartDate(), cycle.getEndDate());
                blockSharedCostsCache.put(blockName, sharedCosts);
            }

            Map<String, Double> breakdown = billingEngineService.calculateHouseholdBill(
                    household.getHouseNumber(), cycle.getStartDate(), cycle.getEndDate(), tariff);

            double sharedCharge = blockSharedCostsCache.get(blockName).getOrDefault(household.getHouseNumber(), 0.0);

            java.util.Optional<User> userOpt = userRepository.findByHouseNumber(household.getHouseNumber());

            // --- Resolve tariff settings from resident or their community admin ---
            double totalLiters = breakdown.get("consumptionLiters");
            Double waterRate = null;
            Double monthlyLimit = null;
            Double excessRate = null;

            if (userOpt.isPresent()) {
                User resUser = userOpt.get();
                waterRate = resUser.getWaterRatePerLiter();
                monthlyLimit = resUser.getMonthlyLimitLiters();
                excessRate = resUser.getExcessRatePerLiter();
            }
            // Fall back to community admin of the same block if any value is missing or zero
            boolean needsRateFallback = (waterRate == null || waterRate <= 0);
            boolean needsLimitFallback = (monthlyLimit == null);
            boolean needsExcessFallback = (excessRate == null);
            if (needsRateFallback || needsLimitFallback || needsExcessFallback) {
                java.util.List<User> blockAdmins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", blockName);
                for (User admin : blockAdmins) {
                    if (needsRateFallback && admin.getWaterRatePerLiter() != null && admin.getWaterRatePerLiter() > 0) waterRate = admin.getWaterRatePerLiter();
                    if (needsLimitFallback && admin.getMonthlyLimitLiters() != null) monthlyLimit = admin.getMonthlyLimitLiters();
                    if (needsExcessFallback && admin.getExcessRatePerLiter() != null) excessRate = admin.getExcessRatePerLiter();
                    if (!needsRateFallback && !needsLimitFallback && !needsExcessFallback) break;
                    needsRateFallback = (waterRate == null || waterRate <= 0);
                    needsLimitFallback = (monthlyLimit == null);
                    needsExcessFallback = (excessRate == null);
                    if (!needsRateFallback && !needsLimitFallback && !needsExcessFallback) break;
                }
            }

            // --- Apply tiered tariff calculation ---
            double withinLimit = totalLiters;
            double excessLiters = 0.0;
            double excessCharge = 0.0;
            double baseCharge;
            double totalAmount;

            if (waterRate != null) {
                // Use user-level tariff: base rate + excess rate above monthly limit
                if (monthlyLimit != null && monthlyLimit > 0 && excessRate != null && totalLiters > monthlyLimit) {
                    withinLimit = monthlyLimit;
                    excessLiters = totalLiters - monthlyLimit;
                    excessCharge = excessLiters * excessRate;
                }
                baseCharge = withinLimit * waterRate;
                totalAmount = Math.round((baseCharge + excessCharge + sharedCharge) * 100.0) / 100.0;
            } else {
                // Fall back to TariffPlan KL-based engine result
                baseCharge = breakdown.get("baseCharge");
                waterRate = totalLiters > 0 ? baseCharge / totalLiters : 0.0;
                monthlyLimit = 0.0;
                excessRate = 0.0;
                totalAmount = Math.round((breakdown.get("totalCharge") + sharedCharge) * 100.0) / 100.0;
            }

            Bill bill = new Bill();
            bill.setHouseNumber(household.getHouseNumber());
            bill.setApartmentBlock(blockName);
            bill.setBaseCharge(baseCharge);
            bill.setExcessCharge(excessCharge);
            bill.setSharedAreaCharge(sharedCharge);
            bill.setFixedCharge(breakdown.get("fixedCharge"));
            bill.setAmount(totalAmount);
            bill.setConsumptionLiters(totalLiters);
            bill.setWithinLimitLiters(withinLimit);
            bill.setExcessLiters(excessLiters);
            bill.setBaseRatePerLiter(waterRate);
            bill.setExcessRatePerLiter(excessRate != null ? excessRate : 0.0);
            bill.setMonthlyLimitLiters(monthlyLimit != null ? monthlyLimit : 0.0);
            bill.setDueDate(cycle.getEndDate().plusDays(15));
            bill.setStatus("UNPAID");
            bill.setBillingCycleId(cycle.getId());
            bill.setGeneratedDate(LocalDate.now());
            if (userOpt.isPresent()) {
                bill.setMeterId(userOpt.get().getMeterId());
            }

            billRepository.save(bill);

            totalConsumption += totalLiters;
            totalBilled += totalAmount;

            // Send notification to household user
            Notification notification = new Notification();
            notification.setUsername(household.getHouseNumber()); // Will match by houseNumber
            notification.setType("BILL_GENERATED");
            notification.setTitle("New Bill Generated");
            notification.setMessage("Your bill for " + cycle.getCycleName() + " is ₹" +
                    String.format("%.2f", totalAmount) + ". Due by " + cycle.getEndDate().plusDays(15) + ".");
            notification.setReferenceType("BILLING_CYCLE");
            notification.setReferenceId(cycle.getId());
            notificationRepository.save(notification);

            // Send email to resident
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
                    try {
                        emailService.sendBillGeneratedEmail(
                            user.getEmail(),
                            user.getFullName() != null && !user.getFullName().trim().isEmpty() ? user.getFullName() : user.getUsername(),
                            bill.getHouseNumber(),
                            bill.getAmount(),
                            bill.getGeneratedDate(),
                            bill.getDueDate(),
                            bill.getConsumptionLiters(),
                            bill.getMeterId(),
                            bill.getWithinLimitLiters(),
                            bill.getExcessLiters(),
                            bill.getBaseRatePerLiter(),
                            bill.getExcessRatePerLiter(),
                            bill.getMonthlyLimitLiters()
                        );
                    } catch (Exception e) {
                        System.err.println("SMTP dispatch failed for billing cycle email: " + e.getMessage());
                    }
                }
            }
        }

        // Update cycle with totals and finalize
        cycle.setTotalConsumptionLiters(totalConsumption);
        cycle.setTotalBilledAmount(Math.round(totalBilled * 100.0) / 100.0);
        cycle.setStatus("FINALIZED");
        cycle.setFinalizedDate(LocalDate.now());
        billingCycleRepository.save(cycle);

        return ResponseEntity.ok("Billing cycle finalized. " + households.size() + " bills generated. Total: ₹" +
                String.format("%.2f", totalBilled));
    }

    // ARCHIVE a finalized billing cycle
    @PostMapping("/{id}/archive")
    public ResponseEntity<?> archiveCycle(@PathVariable Long id) {
        BillingCycle cycle = billingCycleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Billing cycle not found with ID: " + id));

        if (!"FINALIZED".equals(cycle.getStatus())) {
            return ResponseEntity.badRequest().body("Only FINALIZED cycles can be archived.");
        }

        cycle.setStatus("ARCHIVED");
        billingCycleRepository.save(cycle);
        return ResponseEntity.ok("Billing cycle archived successfully.");
    }
}
