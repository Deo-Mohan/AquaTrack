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
    private void validateBillGeneration(String houseNumber) {
        if (houseNumber == null || houseNumber.trim().isEmpty()) {
            return;
        }

        // 1. Get all usage logs for this household
        List<com.aquatrack.aquatrack.model.WaterUsageLog> logs = waterUsageRepository.findByHouseNumber(houseNumber);
        if (logs.isEmpty()) {
            throw new IllegalArgumentException("No water usage details found. Contact your Community Admin to log usage first.");
        }

        // 2. Find the latest log date
        java.time.LocalDate latestLogDate = null;
        for (com.aquatrack.aquatrack.model.WaterUsageLog log : logs) {
            java.time.LocalDate d = log.getReadingDate();
            if (d != null) {
                if (latestLogDate == null || d.isAfter(latestLogDate)) {
                    latestLogDate = d;
                }
            }
        }

        if (latestLogDate == null) {
            throw new IllegalArgumentException("No valid water usage reading dates found.");
        }

        // 3. Find the latest generated bill date
        List<Bill> existingBills = repository.findByHouseNumber(houseNumber);
        if (!existingBills.isEmpty()) {
            java.time.LocalDate latestBillDate = null;
            for (Bill b : existingBills) {
                java.time.LocalDate d = b.getGeneratedDate();
                if (d != null) {
                    if (latestBillDate == null || d.isAfter(latestBillDate)) {
                        latestBillDate = d;
                    }
                }
            }

            if (latestBillDate != null && !latestLogDate.isAfter(latestBillDate)) {
                throw new IllegalArgumentException("A bill has already been generated for all current water usage logs. No new usage to bill.");
            }
        }
    }

    // POST: Create a new bill (Admin / Community Admin)
    @PostMapping("/create")
    public ResponseEntity<?> createBill(
            @Valid @RequestBody Bill bill,
            @RequestParam(required = false) String callerRole) {
        
        if (bill.getHouseNumber() != null) {
            java.util.Optional<com.aquatrack.aquatrack.model.User> targetUser = userRepository.findByHouseNumber(bill.getHouseNumber());
            if (targetUser.isPresent() && "ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(targetUser.get().getRole())) {
                if (!"ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
                    return ResponseEntity.status(403).body("Access denied. Only Super Admin can generate bills for a Community Admin.");
                }
            }

            // Validate to prevent duplicate billing
            try {
                validateBillGeneration(bill.getHouseNumber());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(e.getMessage());
            }
        }

        if (bill.getGeneratedDate() == null) {
            bill.setGeneratedDate(java.time.LocalDate.now());
        }
        if (bill.getHouseNumber() != null) {
            java.util.Optional<com.aquatrack.aquatrack.model.User> residentOpt = userRepository.findByHouseNumber(bill.getHouseNumber());
            if (residentOpt.isPresent()) {
                bill.setMeterId(residentOpt.get().getMeterId());
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

                // 2. Email dispatch since it is created by Community Admin
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
                            savedBill.getMeterId()
                        );
                    } catch (Exception e) {
                        System.err.println("SMTP dispatch failed for custom bill generated email: " + e.getMessage());
                    }
                }
            }
        }

        return ResponseEntity.ok(savedBill);
    }

    // GET: Retrieve all bills (Admin)
    @GetMapping("/all")
    public ResponseEntity<List<Bill>> getAllBills() {
        return ResponseEntity.ok(repository.findAll());
    }

    // GET: Fetch bills for a single household (Resident)
    @GetMapping("/household/{houseNumber}")
    public ResponseEntity<List<Bill>> getBillsByHousehold(@PathVariable String houseNumber) {
        return ResponseEntity.ok(repository.findByHouseNumberOrderByDueDateDesc(houseNumber));
    }

    // GET: Fetch bills by status (PAID, UNPAID, OVERDUE)
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Bill>> getBillsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(repository.findByStatus(status));
    }

    // GET: Fetch bills for a billing cycle
    @GetMapping("/cycle/{billingCycleId}")
    public ResponseEntity<List<Bill>> getBillsByCycle(@PathVariable Long billingCycleId) {
        return ResponseEntity.ok(repository.findByBillingCycleId(billingCycleId));
    }

    // GET: Fetch bills for an apartment block
    @GetMapping("/block/{apartmentBlock}")
    public ResponseEntity<List<Bill>> getBillsByBlock(@PathVariable String apartmentBlock) {
        return ResponseEntity.ok(repository.findByApartmentBlock(apartmentBlock));
    }

    // GET: Get total unpaid amount for a household
    @GetMapping("/household/{houseNumber}/unpaid-total")
    public ResponseEntity<?> getUnpaidTotal(@PathVariable String houseNumber) {
        Double total = repository.sumUnpaidByHousehold(houseNumber);
        return ResponseEntity.ok(java.util.Map.of(
                "houseNumber", houseNumber,
                "unpaidTotal", total != null ? total : 0.0
        ));
    }

    // POST: Generate bill for a household user dynamically
    @PostMapping("/household/{houseNumber}/generate")
    public ResponseEntity<?> generateBillForHousehold(@PathVariable String houseNumber) {
        java.util.Optional<com.aquatrack.aquatrack.model.User> userOpt = userRepository.findByHouseNumber(houseNumber);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body("User not found for house number: " + houseNumber);
        }

        // Validate to prevent duplicate billing
        try {
            validateBillGeneration(houseNumber);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }

        com.aquatrack.aquatrack.model.User user = userOpt.get();

        // 1. Get all usage logs
        List<com.aquatrack.aquatrack.model.WaterUsageLog> logs = waterUsageRepository.findByHouseNumber(houseNumber);

        // 2. Find the cut-off date (latest generated bill date)
        List<Bill> existingBills = repository.findByHouseNumber(houseNumber);
        java.time.LocalDate latestBillDate = null;
        if (!existingBills.isEmpty()) {
            latestBillDate = existingBills.stream()
                    .map(b -> b.getGeneratedDate())
                    .filter(d -> d != null)
                    .max((d1, d2) -> d1.compareTo(d2))
                    .orElse(null);
        }

        // 3. Filter for unbilled logs
        final java.time.LocalDate cutOffDate = latestBillDate;
        List<com.aquatrack.aquatrack.model.WaterUsageLog> unbilledLogs = logs.stream()
                .filter(log -> cutOffDate == null || log.getReadingDate().isAfter(cutOffDate))
                .collect(java.util.stream.Collectors.toList());

        if (unbilledLogs.isEmpty()) {
            return ResponseEntity.badRequest().body("No water usage detail found, contact community admin");
        }

        double totalLiters = unbilledLogs.stream()
                .mapToDouble(log -> log.getReadingLiters() != null ? log.getReadingLiters() : 0.0)
                .sum();

        if (totalLiters <= 0) {
            return ResponseEntity.badRequest().body("No water usage detail found, contact community admin");
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
        bill.setGeneratedDate(java.time.LocalDate.now());
        bill.setDueDate(java.time.LocalDate.now().plusDays(15));
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

        bill.setStatus("PAID");
        Bill saved = repository.save(bill);

        // Notify the household user
        java.util.Optional<com.aquatrack.aquatrack.model.User> userOpt = userRepository.findByHouseNumber(bill.getHouseNumber());
        if (userOpt.isPresent()) {
            com.aquatrack.aquatrack.model.User user = userOpt.get();
            String title = "Payment Received — Invoice Ready";
            String message = String.format(
                "Your water bill of ₹%.2f for %s (Due: %s) has been marked PAID. Thank you! Your invoice is available for download.",
                bill.getAmount(), bill.getHouseNumber(), bill.getDueDate()
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

        try {
            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", Math.round(bill.getAmount() * 100)); // in paise
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
                bill.setStatus("PAID");
                Bill saved = repository.save(bill);

                // Notify household user
                java.util.Optional<com.aquatrack.aquatrack.model.User> userOpt = userRepository.findByHouseNumber(bill.getHouseNumber());
                if (userOpt.isPresent()) {
                    com.aquatrack.aquatrack.model.User user = userOpt.get();
                    String title = "Payment Received — Invoice Ready";
                    String message = String.format(
                        "Your water bill of ₹%.2f for %s (Due: %s) has been marked PAID. Thank you! Your invoice is available for download.",
                        bill.getAmount(), bill.getHouseNumber(), bill.getDueDate()
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
