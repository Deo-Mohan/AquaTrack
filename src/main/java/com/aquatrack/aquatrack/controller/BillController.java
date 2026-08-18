package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.Bill;
import com.aquatrack.aquatrack.model.Notification;
import com.aquatrack.aquatrack.repository.BillRepository;
import com.aquatrack.aquatrack.repository.NotificationRepository;
import com.aquatrack.aquatrack.repository.UserRepository;
import jakarta.validation.Valid;
import com.aquatrack.aquatrack.service.PaymentReminderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import org.json.JSONObject;

import java.util.List;

@RestController
@RequestMapping("/api/bills")
public class BillController {

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Autowired
    private BillRepository repository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.aquatrack.aquatrack.repository.WaterUsageRepository waterUsageRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PaymentReminderService paymentReminderService;

    @Autowired
    private com.aquatrack.aquatrack.service.EmailService emailService;
    private void updateLateFeeAndStatus(Bill bill) {
        if (bill == null) return;

        // 1. Resolve lateFeePerMonth from household user or Community Admin if not populated
        if (bill.getLateFeePerMonth() == null || bill.getLateFeePerMonth() <= 0) {
            if (bill.getHouseNumber() != null) {
                userRepository.findByHouseNumber(bill.getHouseNumber()).ifPresent(u -> {
                    Double fee = u.getLateFeePerMonth();
                    if (fee == null || fee <= 0) {
                        String blk = u.getApartmentBlock();
                        if (blk != null) {
                            List<com.aquatrack.aquatrack.model.User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", blk);
                            if (!admins.isEmpty() && admins.get(0).getLateFeePerMonth() != null) {
                                fee = admins.get(0).getLateFeePerMonth();
                            }
                        }
                    }
                    if (fee != null) bill.setLateFeePerMonth(fee);
                });
            }
        }

        // 2. Lock historical state if the bill is already PAID
        if ("PAID".equalsIgnoreCase(bill.getStatus())) {
            return;
        }

        // 3. Dynamic overdue & late fee accrual calculation
        java.time.LocalDate dueDate = bill.getDueDate();
        java.time.LocalDate today = java.time.LocalDate.now();

        if (dueDate != null && today.isAfter(dueDate)) {
            long daysPast = java.time.temporal.ChronoUnit.DAYS.between(dueDate, today);
            int monthsLate = (int) Math.max(1, Math.ceil(daysPast / 30.0));
            double feePerMonth = bill.getLateFeePerMonth() != null ? bill.getLateFeePerMonth() : 0.0;
            double totalLateFee = Math.round(monthsLate * feePerMonth * 100.0) / 100.0;

            boolean changed = false;
            if (!Integer.valueOf(monthsLate).equals(bill.getMonthsOverdue())) {
                bill.setMonthsOverdue(monthsLate);
                changed = true;
            }
            if (!Double.valueOf(totalLateFee).equals(bill.getLateFeeAmount())) {
                bill.setLateFeeAmount(totalLateFee);
                changed = true;
            }
            if (!"OVERDUE".equalsIgnoreCase(bill.getStatus())) {
                bill.setStatus("OVERDUE");
                changed = true;
            }
            if (changed) {
                repository.save(bill);
            }
        } else if ("OVERDUE".equalsIgnoreCase(bill.getStatus()) && (dueDate == null || !today.isAfter(dueDate))) {
            bill.setMonthsOverdue(0);
            bill.setLateFeeAmount(0.0);
            bill.setStatus("UNPAID");
            repository.save(bill);
        }
    }

    private void validateBillGeneration(String houseNumber, java.time.LocalDate generatedDate) {
        if (houseNumber == null || houseNumber.trim().isEmpty()) {
            return;
        }
        if (generatedDate == null) {
            generatedDate = java.time.LocalDate.now();
        }

        // 1. Get all usage logs for this household
        List<com.aquatrack.aquatrack.model.WaterUsageLog> logs = waterUsageRepository.findByHouseNumber(houseNumber);
        
        // 2. Check if logs exist for the specific billing month and year
        int targetYear = generatedDate.getYear();
        int targetMonth = generatedDate.getMonthValue();
        boolean hasLogsInMonth = false;
        for (com.aquatrack.aquatrack.model.WaterUsageLog log : logs) {
            if (log.getReadingDate() != null 
                    && log.getReadingDate().getYear() == targetYear 
                    && log.getReadingDate().getMonthValue() == targetMonth) {
                hasLogsInMonth = true;
                break;
            }
        }

        if (!hasLogsInMonth) {
            throw new IllegalArgumentException("No water usage details found for " + generatedDate.getMonth().name() + " " + targetYear + ". Contact your Community Admin to log usage first.");
        }

        // 3. Find if there is already a bill generated in the same month & year
        List<Bill> existingBills = repository.findByHouseNumber(houseNumber);
        if (!existingBills.isEmpty()) {
            for (Bill b : existingBills) {
                if (b.getGeneratedDate() != null 
                        && b.getGeneratedDate().getYear() == targetYear 
                        && b.getGeneratedDate().getMonthValue() == targetMonth) {
                    throw new IllegalArgumentException("A bill has already been generated for this household for " 
                            + generatedDate.getMonth().name() + " " + targetYear + ".");
                }
            }
        }
    }

    // POST: Create a new bill (Admin / Community Admin)
    @PostMapping("/create")
    public ResponseEntity<?> createBill(
            @Valid @RequestBody Bill bill,
            @RequestParam(required = false) String callerRole) {
        
        if (bill.getGeneratedDate() == null) {
            bill.setGeneratedDate(java.time.LocalDate.now());
        }
        if (bill.getDueDate() == null) {
            int graceDays = 20;
            if (bill.getHouseNumber() != null) {
                java.util.Optional<com.aquatrack.aquatrack.model.User> residentOpt = userRepository.findByHouseNumber(bill.getHouseNumber());
                if (residentOpt.isPresent() && residentOpt.get().getGracePeriodDays() != null) {
                    graceDays = residentOpt.get().getGracePeriodDays();
                }
            }
            bill.setDueDate(bill.getGeneratedDate().plusDays(graceDays));
        }

        if (bill.getHouseNumber() != null) {
            java.util.Optional<com.aquatrack.aquatrack.model.User> targetUser = userRepository.findByHouseNumber(bill.getHouseNumber());
            if (targetUser.isPresent() && "ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(targetUser.get().getRole())) {
                if (!"ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
                    return ResponseEntity.status(403).body("Access denied. Only Super Admin can generate bills for a Community Admin.");
                }
            }

            // Validate to prevent duplicate billing
            try {
                validateBillGeneration(bill.getHouseNumber(), bill.getGeneratedDate());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(e.getMessage());
            }
        }

        if (bill.getHouseNumber() != null) {
            java.util.Optional<com.aquatrack.aquatrack.model.User> residentOpt = userRepository.findByHouseNumber(bill.getHouseNumber());
            if (residentOpt.isPresent()) {
                bill.setMeterId(residentOpt.get().getMeterId());

                // --- Auto-populate consumption and tariff breakdown from unbilled usage logs ---
                com.aquatrack.aquatrack.model.User resUser = residentOpt.get();

                // Find logs for the selected month and year
                List<com.aquatrack.aquatrack.model.WaterUsageLog> allLogs = waterUsageRepository.findByHouseNumber(bill.getHouseNumber());
                int targetYear = bill.getGeneratedDate().getYear();
                int targetMonth = bill.getGeneratedDate().getMonthValue();
                
                List<com.aquatrack.aquatrack.model.WaterUsageLog> monthLogs = allLogs.stream()
                        .filter(log -> log.getReadingDate() != null 
                                && log.getReadingDate().getYear() == targetYear 
                                && log.getReadingDate().getMonthValue() == targetMonth)
                        .collect(java.util.stream.Collectors.toList());

                double totalLiters = monthLogs.stream()
                        .mapToDouble(log -> log.getReadingLiters() != null ? log.getReadingLiters() : 0.0)
                        .sum();

                // Resolve tariff settings: user first, then community admin fallback
                Double waterRate = resUser.getWaterRatePerLiter();
                Double monthlyLimit = resUser.getMonthlyLimitLiters();
                Double excessRate = resUser.getExcessRatePerLiter();
                if ((waterRate == null || waterRate <= 0) || monthlyLimit == null || excessRate == null) {
                    String blk = resUser.getApartmentBlock();
                    if (blk != null && !blk.trim().isEmpty()) {
                        List<com.aquatrack.aquatrack.model.User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", blk);
                        for (com.aquatrack.aquatrack.model.User adm : admins) {
                            if ((waterRate == null || waterRate <= 0) && adm.getWaterRatePerLiter() != null && adm.getWaterRatePerLiter() > 0) waterRate = adm.getWaterRatePerLiter();
                            if (monthlyLimit == null && adm.getMonthlyLimitLiters() != null) monthlyLimit = adm.getMonthlyLimitLiters();
                            if (excessRate == null && adm.getExcessRatePerLiter() != null) excessRate = adm.getExcessRatePerLiter();
                            if (waterRate != null && waterRate > 0 && monthlyLimit != null && excessRate != null) break;
                        }
                    }
                }

                if (totalLiters > 0 && waterRate != null && waterRate > 0) {
                    double withinLimit = totalLiters;
                    double excessLiters = 0.0;
                    double excessCharge = 0.0;
                    if (monthlyLimit != null && monthlyLimit > 0 && excessRate != null && totalLiters > monthlyLimit) {
                        withinLimit = monthlyLimit;
                        excessLiters = totalLiters - monthlyLimit;
                        excessCharge = excessLiters * excessRate;
                    }
                    double baseCharge = withinLimit * waterRate;
                    double computedAmount = Math.round((baseCharge + excessCharge) * 100.0) / 100.0;

                    bill.setConsumptionLiters(totalLiters);
                    bill.setWithinLimitLiters(withinLimit);
                    bill.setExcessLiters(excessLiters);
                    bill.setBaseRatePerLiter(waterRate);
                    bill.setExcessRatePerLiter(excessRate != null ? excessRate : 0.0);
                    bill.setMonthlyLimitLiters(monthlyLimit != null ? monthlyLimit : 0.0);
                    bill.setBaseCharge(baseCharge);
                    bill.setExcessCharge(excessCharge);
                    // Set billing period label from the generatedDate (which represents the billing month)
                    if (bill.getBillingPeriod() == null || bill.getBillingPeriod().trim().isEmpty()) {
                        String bpl = bill.getGeneratedDate().getMonth().getDisplayName(
                            java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH)
                            + " " + bill.getGeneratedDate().getYear();
                        bill.setBillingPeriod(bpl);
                    }
                    // Always use backend-computed amount (backend is source of truth for billing)
                    bill.setAmount(computedAmount);
                }
            }
        }
        Bill savedBill = repository.save(bill);

        // Notify the household user
        if (bill.getHouseNumber() != null) {
            java.util.Optional<com.aquatrack.aquatrack.model.User> residentOpt = userRepository.findByHouseNumber(bill.getHouseNumber());
            if (residentOpt.isPresent()) {
                com.aquatrack.aquatrack.model.User user = residentOpt.get();
                
                // 1. In-app notification
                String title = "New Water Bill Generated";
                String message = String.format(
                    "A new water bill of ₹%.2f has been generated for your household (%s). Due Date: %s.",
                    savedBill.getAmount(), savedBill.getHouseNumber(), savedBill.getDueDate()
                );
                Notification notif = new Notification(user.getUsername(), "BILL_GENERATED", title, message);
                notif.setReferenceId(savedBill.getId());
                notif.setReferenceType("BILL");
                notificationRepository.save(notif);

                // 2. Email dispatch with full tariff breakdown
                if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
                    try {
                        emailService.sendBillGeneratedEmail(
                            user.getEmail(),
                            user.getFullName() != null && !user.getFullName().trim().isEmpty() ? user.getFullName() : user.getUsername(),
                            savedBill.getHouseNumber(),
                            savedBill.getAmount(),
                            savedBill.getGeneratedDate(),
                            savedBill.getDueDate(),
                            savedBill.getConsumptionLiters(),
                            savedBill.getMeterId(),
                            savedBill.getWithinLimitLiters(),
                            savedBill.getExcessLiters(),
                            savedBill.getBaseRatePerLiter(),
                            savedBill.getExcessRatePerLiter(),
                            savedBill.getMonthlyLimitLiters(),
                            savedBill.getBillingPeriod()
                        );
                    } catch (Exception e) {
                        System.err.println("SMTP dispatch failed for custom bill generated email: " + e.getMessage());
                    }
                }
            }
        }

        return ResponseEntity.ok(savedBill);
    }

    // POST: Create multiple bills in a single bulk transaction (High Performance Batching)
    @PostMapping("/create-batch")
    public ResponseEntity<?> createBatchBills(
            @Valid @RequestBody List<Bill> bills,
            @RequestParam(required = false) String callerRole) {
        
        List<Bill> savedBillsList = new java.util.ArrayList<>();
        List<Notification> notificationsToSave = new java.util.ArrayList<>();

        for (Bill bill : bills) {
            if (bill.getGeneratedDate() == null) {
                bill.setGeneratedDate(java.time.LocalDate.now());
            }
            if (bill.getDueDate() == null) {
                int graceDays = 20;
                if (bill.getHouseNumber() != null) {
                    java.util.Optional<com.aquatrack.aquatrack.model.User> residentOpt = userRepository.findByHouseNumber(bill.getHouseNumber());
                    if (residentOpt.isPresent() && residentOpt.get().getGracePeriodDays() != null) {
                        graceDays = residentOpt.get().getGracePeriodDays();
                    }
                }
                bill.setDueDate(bill.getGeneratedDate().plusDays(graceDays));
            }

            if (bill.getHouseNumber() != null) {
                java.util.Optional<com.aquatrack.aquatrack.model.User> residentOpt = userRepository.findByHouseNumber(bill.getHouseNumber());
                if (residentOpt.isPresent()) {
                    com.aquatrack.aquatrack.model.User resUser = residentOpt.get();
                    if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(resUser.getRole()) && !"ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
                        continue;
                    }
                    bill.setMeterId(resUser.getMeterId());

                    // Auto-calculate tiered breakdown if not pre-calculated
                    List<com.aquatrack.aquatrack.model.WaterUsageLog> allLogs = waterUsageRepository.findByHouseNumber(bill.getHouseNumber());
                    int targetYear = bill.getGeneratedDate().getYear();
                    int targetMonth = bill.getGeneratedDate().getMonthValue();
                    
                    List<com.aquatrack.aquatrack.model.WaterUsageLog> monthLogs = allLogs.stream()
                            .filter(log -> log.getReadingDate() != null 
                                    && log.getReadingDate().getYear() == targetYear 
                                    && log.getReadingDate().getMonthValue() == targetMonth)
                            .collect(java.util.stream.Collectors.toList());

                    double totalLiters = monthLogs.stream()
                            .mapToDouble(log -> log.getReadingLiters() != null ? log.getReadingLiters() : 0.0)
                            .sum();

                    Double waterRate = resUser.getWaterRatePerLiter();
                    Double monthlyLimit = resUser.getMonthlyLimitLiters();
                    Double excessRate = resUser.getExcessRatePerLiter();
                    if ((waterRate == null || waterRate <= 0) || monthlyLimit == null || excessRate == null) {
                        String blk = resUser.getApartmentBlock();
                        if (blk != null && !blk.trim().isEmpty()) {
                            List<com.aquatrack.aquatrack.model.User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", blk);
                            for (com.aquatrack.aquatrack.model.User adm : admins) {
                                if ((waterRate == null || waterRate <= 0) && adm.getWaterRatePerLiter() != null && adm.getWaterRatePerLiter() > 0) waterRate = adm.getWaterRatePerLiter();
                                if (monthlyLimit == null && adm.getMonthlyLimitLiters() != null) monthlyLimit = adm.getMonthlyLimitLiters();
                                if (excessRate == null && adm.getExcessRatePerLiter() != null) excessRate = adm.getExcessRatePerLiter();
                                if (waterRate != null && waterRate > 0 && monthlyLimit != null && excessRate != null) break;
                            }
                        }
                    }

                    if (totalLiters > 0 && waterRate != null && waterRate > 0) {
                        double withinLimit = totalLiters;
                        double excessLiters = 0.0;
                        double excessCharge = 0.0;
                        if (monthlyLimit != null && monthlyLimit > 0 && excessRate != null && totalLiters > monthlyLimit) {
                            withinLimit = monthlyLimit;
                            excessLiters = totalLiters - monthlyLimit;
                            excessCharge = excessLiters * excessRate;
                        }
                        double baseCharge = withinLimit * waterRate;
                        double computedAmount = Math.round((baseCharge + excessCharge) * 100.0) / 100.0;

                        bill.setConsumptionLiters(totalLiters);
                        bill.setWithinLimitLiters(withinLimit);
                        bill.setExcessLiters(excessLiters);
                        bill.setBaseRatePerLiter(waterRate);
                        bill.setExcessRatePerLiter(excessRate != null ? excessRate : 0.0);
                        bill.setMonthlyLimitLiters(monthlyLimit != null ? monthlyLimit : 0.0);
                        bill.setBaseCharge(baseCharge);
                        bill.setExcessCharge(excessCharge);
                        if (bill.getBillingPeriod() == null || bill.getBillingPeriod().trim().isEmpty()) {
                            String bpl = bill.getGeneratedDate().getMonth().getDisplayName(
                                java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH)
                                + " " + bill.getGeneratedDate().getYear();
                            bill.setBillingPeriod(bpl);
                        }
                        bill.setAmount(computedAmount);
                    }

                    // Prepare notification
                    String title = "New Water Bill Generated";
                    String message = String.format(
                        "A new water bill of ₹%.2f has been generated for your household (%s). Due Date: %s.",
                        bill.getAmount(), bill.getHouseNumber(), bill.getDueDate()
                    );
                    Notification notif = new Notification(resUser.getUsername(), "BILL_GENERATED", title, message);
                    notif.setReferenceType("BILL");
                    notificationsToSave.add(notif);
                }
            }
            savedBillsList.add(bill);
        }

        List<Bill> persistedBills = repository.saveAll(savedBillsList);
        if (!notificationsToSave.isEmpty()) {
            for (int i = 0; i < Math.min(persistedBills.size(), notificationsToSave.size()); i++) {
                notificationsToSave.get(i).setReferenceId(persistedBills.get(i).getId());
            }
            notificationRepository.saveAll(notificationsToSave);
        }

        return ResponseEntity.ok(persistedBills);
    }

    // POST: Recalculate an existing bill's consumption and amount from its generatedDate month logs
    // This fixes bills that were created with stale/incorrect breakdown data
    @PostMapping("/{id}/recalculate")
    public ResponseEntity<?> recalculateBill(@PathVariable Long id,
            @RequestParam(required = false) String callerRole) {
        Bill bill = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bill not found with ID: " + id));

        if ("PAID".equalsIgnoreCase(bill.getStatus())) {
            return ResponseEntity.badRequest().body("Cannot recalculate a PAID bill.");
        }

        if (bill.getGeneratedDate() == null) {
            return ResponseEntity.badRequest().body("Bill has no generatedDate; cannot determine billing month.");
        }

        int targetYear  = bill.getGeneratedDate().getYear();
        int targetMonth = bill.getGeneratedDate().getMonthValue();

        // Re-fetch all logs for this house number filtered to the billing month
        List<com.aquatrack.aquatrack.model.WaterUsageLog> allLogs =
                waterUsageRepository.findByHouseNumber(bill.getHouseNumber());

        List<com.aquatrack.aquatrack.model.WaterUsageLog> monthLogs = allLogs.stream()
                .filter(log -> log.getReadingDate() != null
                        && log.getReadingDate().getYear()       == targetYear
                        && log.getReadingDate().getMonthValue() == targetMonth)
                .collect(java.util.stream.Collectors.toList());

        double totalLiters = monthLogs.stream()
                .mapToDouble(log -> log.getReadingLiters() != null ? log.getReadingLiters() : 0.0)
                .sum();

        if (totalLiters <= 0) {
            return ResponseEntity.badRequest().body("No water usage logs found for "
                    + bill.getGeneratedDate().getMonth().getDisplayName(
                        java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH)
                    + " " + targetYear + ". Cannot recalculate.");
        }

        // Resolve tariff from resident → community admin fallback
        java.util.Optional<com.aquatrack.aquatrack.model.User> resOpt =
                userRepository.findByHouseNumber(bill.getHouseNumber());
        Double waterRate    = null;
        Double monthlyLimit = null;
        Double excessRate   = null;

        if (resOpt.isPresent()) {
            com.aquatrack.aquatrack.model.User res = resOpt.get();
            waterRate    = res.getWaterRatePerLiter();
            monthlyLimit = res.getMonthlyLimitLiters();
            excessRate   = res.getExcessRatePerLiter();

            if ((waterRate == null || waterRate <= 0) || monthlyLimit == null || excessRate == null) {
                String blk = res.getApartmentBlock();
                if (blk != null && !blk.trim().isEmpty()) {
                    List<com.aquatrack.aquatrack.model.User> admins =
                            userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", blk);
                    for (com.aquatrack.aquatrack.model.User adm : admins) {
                        if ((waterRate == null || waterRate <= 0) && adm.getWaterRatePerLiter() != null && adm.getWaterRatePerLiter() > 0)
                            waterRate = adm.getWaterRatePerLiter();
                        if (monthlyLimit == null && adm.getMonthlyLimitLiters() != null)
                            monthlyLimit = adm.getMonthlyLimitLiters();
                        if (excessRate == null && adm.getExcessRatePerLiter() != null)
                            excessRate = adm.getExcessRatePerLiter();
                        if (waterRate != null && waterRate > 0 && monthlyLimit != null && excessRate != null) break;
                    }
                }
            }
        }

        if (waterRate == null || waterRate <= 0) {
            return ResponseEntity.badRequest().body("Water rate not configured for this household. Cannot recalculate.");
        }

        // Apply tiered tariff
        double withinLimit  = totalLiters;
        double excessLiters = 0.0;
        double excessCharge = 0.0;
        if (monthlyLimit != null && monthlyLimit > 0 && excessRate != null && totalLiters > monthlyLimit) {
            withinLimit  = monthlyLimit;
            excessLiters = totalLiters - monthlyLimit;
            excessCharge = excessLiters * excessRate;
        }
        double baseCharge    = withinLimit * waterRate;
        double computedAmount = Math.round((baseCharge + excessCharge) * 100.0) / 100.0;

        // Update all fields from fresh calculation
        bill.setConsumptionLiters(totalLiters);
        bill.setWithinLimitLiters(withinLimit);
        bill.setExcessLiters(excessLiters);
        bill.setBaseRatePerLiter(waterRate);
        bill.setExcessRatePerLiter(excessRate != null ? excessRate : 0.0);
        bill.setMonthlyLimitLiters(monthlyLimit != null ? monthlyLimit : 0.0);
        bill.setBaseCharge(baseCharge);
        bill.setExcessCharge(excessCharge);
        bill.setAmount(computedAmount);

        // Refresh billingPeriod label
        String periodLabel = bill.getGeneratedDate().getMonth().getDisplayName(
                java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH)
                + " " + targetYear;
        bill.setBillingPeriod(periodLabel);

        Bill updated = repository.save(bill);
        return ResponseEntity.ok(updated);
    }

    // GET: Retrieve all bills (Admin)
    @GetMapping("/all")
    public ResponseEntity<List<Bill>> getAllBills() {
        List<Bill> list = repository.findAll();
        list.forEach(this::updateLateFeeAndStatus);
        return ResponseEntity.ok(list);
    }

    // GET: Fetch bills for a single household (Resident)
    @GetMapping("/household/{houseNumber}")
    public ResponseEntity<List<Bill>> getBillsByHousehold(@PathVariable String houseNumber) {
        List<Bill> list = repository.findByHouseNumberOrderByDueDateDesc(houseNumber);
        list.forEach(this::updateLateFeeAndStatus);
        return ResponseEntity.ok(list);
    }

    // GET: Fetch bills by status (PAID, UNPAID, OVERDUE)
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Bill>> getBillsByStatus(@PathVariable String status) {
        // Run check on all bills first so status updates are current
        List<Bill> all = repository.findAll();
        all.forEach(this::updateLateFeeAndStatus);
        return ResponseEntity.ok(repository.findByStatus(status));
    }

    // GET: Fetch bills for a billing cycle
    @GetMapping("/cycle/{billingCycleId}")
    public ResponseEntity<List<Bill>> getBillsByCycle(@PathVariable Long billingCycleId) {
        List<Bill> list = repository.findByBillingCycleId(billingCycleId);
        list.forEach(this::updateLateFeeAndStatus);
        return ResponseEntity.ok(list);
    }

    // GET: Fetch bills for an apartment block
    @GetMapping("/block/{apartmentBlock}")
    public ResponseEntity<List<Bill>> getBillsByBlock(@PathVariable String apartmentBlock) {
        List<Bill> list = repository.findByApartmentBlock(apartmentBlock);
        list.forEach(this::updateLateFeeAndStatus);
        return ResponseEntity.ok(list);
    }

    // GET: Get total unpaid amount for a household
    @GetMapping("/household/{houseNumber}/unpaid-total")
    public ResponseEntity<?> getUnpaidTotal(@PathVariable String houseNumber) {
        List<Bill> list = repository.findByHouseNumberOrderByDueDateDesc(houseNumber);
        list.forEach(this::updateLateFeeAndStatus);
        double total = list.stream()
                .filter(b -> !"PAID".equalsIgnoreCase(b.getStatus()))
                .mapToDouble(b -> (b.getAmount() != null ? b.getAmount() : 0.0) + (b.getLateFeeAmount() != null ? b.getLateFeeAmount() : 0.0))
                .sum();
        return ResponseEntity.ok(java.util.Map.of(
                "houseNumber", houseNumber,
                "unpaidTotal", Math.round(total * 100.0) / 100.0
        ));
    }

    // POST: Generate bill for a household user dynamically
    @PostMapping("/household/{houseNumber}/generate")
    public ResponseEntity<?> generateBillForHousehold(@PathVariable String houseNumber) {
        java.util.Optional<com.aquatrack.aquatrack.model.User> userOpt = userRepository.findByHouseNumber(houseNumber);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body("User not found for house number: " + houseNumber);
        }

        java.time.LocalDate targetDate = java.time.LocalDate.now();

        // Validate to prevent duplicate billing
        try {
            validateBillGeneration(houseNumber, targetDate);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }

        com.aquatrack.aquatrack.model.User user = userOpt.get();

        // 1. Get all usage logs
        List<com.aquatrack.aquatrack.model.WaterUsageLog> logs = waterUsageRepository.findByHouseNumber(houseNumber);

        // 2. Filter for logs in the target month and year
        int targetYear = targetDate.getYear();
        int targetMonth = targetDate.getMonthValue();
        
        List<com.aquatrack.aquatrack.model.WaterUsageLog> monthLogs = logs.stream()
                .filter(log -> log.getReadingDate() != null 
                        && log.getReadingDate().getYear() == targetYear 
                        && log.getReadingDate().getMonthValue() == targetMonth)
                        .collect(java.util.stream.Collectors.toList());

        if (monthLogs.isEmpty()) {
            return ResponseEntity.badRequest().body("No water usage detail found for this month, contact community admin");
        }

        double totalLiters = monthLogs.stream()
                .mapToDouble(log -> log.getReadingLiters() != null ? log.getReadingLiters() : 0.0)
                .sum();

        if (totalLiters <= 0) {
            return ResponseEntity.badRequest().body("No water usage detail found for this month, contact community admin");
        }

        // 4. Resolve water rate and tariff settings from user or their community admin
        Double waterRate = user.getWaterRatePerLiter();
        Double monthlyLimit = user.getMonthlyLimitLiters();
        Double excessRate = user.getExcessRatePerLiter();

        boolean needsRateFallback = (waterRate == null || waterRate <= 0);
        boolean needsLimitFallback = (monthlyLimit == null);
        boolean needsExcessFallback = (excessRate == null);

        if (needsRateFallback || needsLimitFallback || needsExcessFallback) {
            String block = user.getApartmentBlock();
            if (block != null && !block.trim().isEmpty()) {
                List<com.aquatrack.aquatrack.model.User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", block);
                for (com.aquatrack.aquatrack.model.User admin : admins) {
                    if (needsRateFallback && admin.getWaterRatePerLiter() != null && admin.getWaterRatePerLiter() > 0) waterRate = admin.getWaterRatePerLiter();
                    if (needsLimitFallback && admin.getMonthlyLimitLiters() != null) monthlyLimit = admin.getMonthlyLimitLiters();
                    if (needsExcessFallback && admin.getExcessRatePerLiter() != null) excessRate = admin.getExcessRatePerLiter();
                    needsRateFallback = (waterRate == null || waterRate <= 0);
                    needsLimitFallback = (monthlyLimit == null);
                    needsExcessFallback = (excessRate == null);
                    if (!needsRateFallback && !needsLimitFallback && !needsExcessFallback) break;
                }
            }
        }

        if (waterRate == null) {
            return ResponseEntity.badRequest().body("Water rate is not configured. Contact community admin.");
        }

        // 5. Apply tiered tariff calculation
        double withinLimit = totalLiters;
        double excessLiters = 0.0;
        double excessCharge = 0.0;
        double baseCharge;

        if (monthlyLimit != null && monthlyLimit > 0 && excessRate != null && totalLiters > monthlyLimit) {
            withinLimit = monthlyLimit;
            excessLiters = totalLiters - monthlyLimit;
            excessCharge = excessLiters * excessRate;
        }
        baseCharge = withinLimit * waterRate;
        double amount = Math.round((baseCharge + excessCharge) * 100.0) / 100.0;

        // 6. Save Bill
        Bill bill = new Bill();
        bill.setHouseNumber(houseNumber);
        bill.setApartmentBlock(user.getApartmentBlock());
        bill.setAmount(amount);
        bill.setBaseCharge(baseCharge);
        bill.setExcessCharge(excessCharge);
        bill.setConsumptionLiters(totalLiters);
        bill.setWithinLimitLiters(withinLimit);
        bill.setExcessLiters(excessLiters);
        bill.setBaseRatePerLiter(waterRate);
        bill.setExcessRatePerLiter(excessRate != null ? excessRate : 0.0);
        bill.setMonthlyLimitLiters(monthlyLimit != null ? monthlyLimit : 0.0);
        int graceDays = 20;
        if (user.getGracePeriodDays() != null) {
            graceDays = user.getGracePeriodDays();
        } else if (user.getApartmentBlock() != null) {
            List<com.aquatrack.aquatrack.model.User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", user.getApartmentBlock());
            if (!admins.isEmpty() && admins.get(0).getGracePeriodDays() != null) {
                graceDays = admins.get(0).getGracePeriodDays();
            }
        }
        bill.setGeneratedDate(java.time.LocalDate.now());
        bill.setDueDate(java.time.LocalDate.now().plusDays(graceDays));
        bill.setStatus("UNPAID");
        bill.setBillingCycleId(1L); // Default fallback cycle
        bill.setMeterId(user.getMeterId());

        Bill saved = repository.save(bill);

        // Notify the household user
        String title = "New Water Bill Generated";
        String message = String.format(
            "A new water bill of ₹%.2f has been generated for your household (%s). Due Date: %s.",
            saved.getAmount(), saved.getHouseNumber(), saved.getDueDate()
        );
        Notification notif = new Notification(user.getUsername(), "BILL_GENERATED", title, message);
        notif.setReferenceId(saved.getId());
        notif.setReferenceType("BILL");
        notificationRepository.save(notif);

        return ResponseEntity.ok(saved);
    }

    // PUT: Update bill status (e.g., mark as PAID)
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateBillStatus(@PathVariable Long id, @RequestParam String status) {
        Bill bill = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bill not found with ID: " + id));
        if ("PAID".equalsIgnoreCase(bill.getStatus()) && !"PAID".equalsIgnoreCase(status)) {
            return ResponseEntity.badRequest().body("A paid bill status cannot be reverted or changed.");
        }
        bill.setStatus(status.toUpperCase());
        repository.save(bill);
        return ResponseEntity.ok("Bill status updated to " + status.toUpperCase());
    }

    // POST: Mark a bill as PAID and notify the household user
    @PostMapping("/{id}/mark-paid")
    public ResponseEntity<?> markBillPaid(@PathVariable Long id) {
        Bill bill = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bill not found with ID: " + id));
        
        // No-op if already paid
        if ("PAID".equalsIgnoreCase(bill.getStatus())) {
            return ResponseEntity.ok(bill);
        }

        // Lock current late fee state before setting to PAID
        updateLateFeeAndStatus(bill);
        bill.setStatus("PAID");
        Bill saved = repository.save(bill);

        // Notify the household user
        java.util.Optional<com.aquatrack.aquatrack.model.User> userOpt = userRepository.findByHouseNumber(bill.getHouseNumber());
        if (userOpt.isPresent()) {
            com.aquatrack.aquatrack.model.User user = userOpt.get();
            double totalPaid = (bill.getAmount() != null ? bill.getAmount() : 0.0) + (bill.getLateFeeAmount() != null ? bill.getLateFeeAmount() : 0.0);
            String title = "Payment Received — Invoice Ready";
            String message = String.format(
                "Your water bill of ₹%.2f for %s (Due: %s) has been marked PAID. Thank you! Your invoice is available for download.",
                totalPaid, bill.getHouseNumber(), bill.getDueDate()
            );
            Notification notif = new Notification(user.getUsername(), "BILL_GENERATED", title, message);
            notif.setReferenceId(bill.getId());
            notif.setReferenceType("BILL");
            notificationRepository.save(notif);
        }

        return ResponseEntity.ok(saved);
    }

    // GET: Get a single bill by ID (for invoice rendering)
    @GetMapping("/{id}")
    public ResponseEntity<Bill> getBillById(@PathVariable Long id) {
        Bill bill = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bill not found with ID: " + id));
        updateLateFeeAndStatus(bill);
        return ResponseEntity.ok(bill);
    }

    // PUT: Update a bill details
    @PutMapping("/{id}")
    public ResponseEntity<?> updateBill(
            @PathVariable Long id,
            @Valid @RequestBody Bill updatedBill,
            @RequestParam(required = false) String callerRole) {
        
        Bill bill = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bill not found with ID: " + id));

        if ("PAID".equalsIgnoreCase(bill.getStatus())) {
            return ResponseEntity.badRequest().body("A paid bill cannot be edited or modified.");
        }

        // Check if the bill's household belongs to a community admin
        if (bill.getHouseNumber() != null) {
            java.util.Optional<com.aquatrack.aquatrack.model.User> targetUser = userRepository.findByHouseNumber(bill.getHouseNumber());
            if (targetUser.isPresent() && "ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(targetUser.get().getRole())) {
                if (!"ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
                    return ResponseEntity.status(403).body("Access denied. Only Super Admin can modify bills for a Community Admin.");
                }
            }
        }

        bill.setAmount(updatedBill.getAmount());
        bill.setDueDate(updatedBill.getDueDate());
        bill.setStatus(updatedBill.getStatus().toUpperCase());
        if (updatedBill.getGeneratedDate() != null) {
            bill.setGeneratedDate(updatedBill.getGeneratedDate());
        }
        if (updatedBill.getBillingCycleId() != null) {
            bill.setBillingCycleId(updatedBill.getBillingCycleId());
        }
        if (updatedBill.getHouseNumber() != null) {
            bill.setHouseNumber(updatedBill.getHouseNumber());
        }
        if (updatedBill.getApartmentBlock() != null) {
            bill.setApartmentBlock(updatedBill.getApartmentBlock());
        }
        Bill saved = repository.save(bill);
        updateLateFeeAndStatus(saved);
        return ResponseEntity.ok(saved);
    }

    // DELETE: Remove a bill (Admin only)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBill(@PathVariable Long id) {
        Bill bill = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bill not found with ID: " + id));
        if ("PAID".equalsIgnoreCase(bill.getStatus())) {
            return ResponseEntity.badRequest().body("A paid bill cannot be deleted.");
        }
        repository.delete(bill);
        return ResponseEntity.ok("Bill deleted successfully.");
    }

    // POST: Trigger manual scan for unpaid bills and notify Community Admins
    @PostMapping("/reminders/check")
    public ResponseEntity<?> checkAndNotifyUnpaidBills() {
        java.util.Map<String, Integer> scanResults = paymentReminderService.checkAndNotifyUnpaidBills();
        return ResponseEntity.ok(scanResults);
    }

    // POST: Send reminder to a single household user
    @PostMapping("/reminders/send")
    public ResponseEntity<?> sendReminderToResident(
            @RequestParam String houseNumber,
            @RequestParam String apartmentBlock) {
        paymentReminderService.sendReminderToResident(houseNumber, apartmentBlock);
        return ResponseEntity.ok("Reminder notice successfully sent to household " + houseNumber);
    }

    // POST: Send reminders to all unpaid households in a block
    @PostMapping("/reminders/send-all")
    public ResponseEntity<?> sendRemindersToAllUnpaidInBlock(
            @RequestParam String apartmentBlock) {
        paymentReminderService.sendRemindersToAllUnpaidInBlock(apartmentBlock);
        return ResponseEntity.ok("Reminders successfully dispatched to all unpaid households in block " + apartmentBlock);
    }

    // POST: Create a Razorpay Order ID for a bill payment
    @PostMapping("/{id}/create-order")
    public ResponseEntity<?> createRazorpayOrder(@PathVariable Long id) {
        Bill bill = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bill not found with ID: " + id));

        updateLateFeeAndStatus(bill);
        double totalPayable = (bill.getAmount() != null ? bill.getAmount() : 0.0) + (bill.getLateFeeAmount() != null ? bill.getLateFeeAmount() : 0.0);

        try {
            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", Math.round(totalPayable * 100)); // in paise
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "rcpt_" + bill.getId());

            Order order = client.orders.create(orderRequest);
            
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("orderId", order.get("id"));
            response.put("amount", order.get("amount"));
            response.put("currency", order.get("currency"));
            response.put("keyId", razorpayKeyId);

            return ResponseEntity.ok(response);
        } catch (RazorpayException e) {
            return ResponseEntity.status(500).body("Error creating Razorpay order: " + e.getMessage());
        }
    }

    // POST: Verify Razorpay payment signature and mark bill as paid
    @PostMapping("/{id}/verify-payment")
    public ResponseEntity<?> verifyRazorpayPayment(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> payload) {
        Bill bill = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bill not found with ID: " + id));

        String orderId = payload.get("razorpay_order_id");
        String paymentId = payload.get("razorpay_payment_id");
        String signature = payload.get("razorpay_signature");

        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", orderId);
            options.put("razorpay_payment_id", paymentId);
            options.put("razorpay_signature", signature);

            boolean isSignatureValid = Utils.verifyPaymentSignature(options, razorpayKeySecret);

            if (isSignatureValid) {
                updateLateFeeAndStatus(bill);
                bill.setStatus("PAID");
                Bill saved = repository.save(bill);

                // Notify household user
                java.util.Optional<com.aquatrack.aquatrack.model.User> userOpt = userRepository.findByHouseNumber(bill.getHouseNumber());
                if (userOpt.isPresent()) {
                    com.aquatrack.aquatrack.model.User user = userOpt.get();
                    double totalPaid = (bill.getAmount() != null ? bill.getAmount() : 0.0) + (bill.getLateFeeAmount() != null ? bill.getLateFeeAmount() : 0.0);
                    String title = "Payment Received — Invoice Ready";
                    String message = String.format(
                        "Your water bill of ₹%.2f for %s (Due: %s) has been marked PAID. Thank you! Your invoice is available for download.",
                        totalPaid, bill.getHouseNumber(), bill.getDueDate()
                    );
                    Notification notif = new Notification(user.getUsername(), "BILL_GENERATED", title, message);
                    notif.setReferenceId(bill.getId());
                    notif.setReferenceType("BILL");
                    notificationRepository.save(notif);
                }

                return ResponseEntity.ok(saved);
            } else {
                return ResponseEntity.badRequest().body("Invalid payment signature verification failed.");
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error verifying Razorpay payment: " + e.getMessage());
        }
    }
}
