package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.Bill;
import com.aquatrack.aquatrack.model.BulkWaterPurchase;
import com.aquatrack.aquatrack.model.User;
import com.aquatrack.aquatrack.repository.BillRepository;
import com.aquatrack.aquatrack.repository.BulkWaterPurchaseRepository;
import com.aquatrack.aquatrack.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bulk-purchases")
public class BulkWaterPurchaseController {

    @Autowired
    private BulkWaterPurchaseRepository repository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BillRepository billRepository;

    // LOG or update a bulk water purchase (Community Admin)
    @PostMapping
    public ResponseEntity<?> logPurchase(
            @RequestParam(required = false) String callerUsername,
            @Valid @RequestBody BulkWaterPurchase purchase) {

        try {
            if (callerUsername != null && !callerUsername.isEmpty()) {
                Optional<User> userOpt = userRepository.findByUsername(callerUsername);
                if (userOpt.isPresent()) {
                    User u = userOpt.get();
                    if (u.getApartmentBlock() != null) {
                        purchase.setApartmentBlock(u.getApartmentBlock());
                    }
                    if (purchase.getApartmentId() == null && u.getId() != null) {
                        purchase.setApartmentId(u.getId());
                    }
                }
            }
            if (purchase.getApartmentId() == null) {
                purchase.setApartmentId(1L);
            }

            // Auto-compute totalCost or unitCostPerLiter
            if (purchase.getVolumeLiters() != null && purchase.getVolumeLiters() > 0) {
                if (purchase.getTotalCost() != null && purchase.getTotalCost() > 0) {
                    purchase.setUnitCostPerLiter(purchase.getTotalCost() / purchase.getVolumeLiters());
                } else if (purchase.getUnitCostPerLiter() != null && purchase.getUnitCostPerLiter() > 0) {
                    purchase.setTotalCost(purchase.getVolumeLiters() * purchase.getUnitCostPerLiter());
                }
            }

            if (purchase.getPurchaseDate() == null) {
                purchase.setPurchaseDate(LocalDate.now());
            }

            BulkWaterPurchase saved = repository.save(purchase);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", "Failed to save purchase: " + e.getMessage()));
        }
    }

    // GET all bulk purchases, optionally filtered by callerUsername or apartmentBlock
    @GetMapping
    public ResponseEntity<List<BulkWaterPurchase>> getAllPurchases(
            @RequestParam(required = false) String callerUsername,
            @RequestParam(required = false) String apartmentBlock,
            @RequestParam(required = false) String billingMonth) {

        try {
            String blockToUse = apartmentBlock;
            if ((blockToUse == null || blockToUse.isEmpty()) && callerUsername != null && !callerUsername.isEmpty()) {
                Optional<User> userOpt = userRepository.findByUsername(callerUsername);
                if (userOpt.isPresent()) {
                    blockToUse = userOpt.get().getApartmentBlock();
                }
            }

            List<BulkWaterPurchase> list = repository.findAll();

            if (blockToUse != null && !blockToUse.isEmpty()) {
                String finalBlock = blockToUse;
                list = list.stream()
                        .filter(p -> p.getApartmentBlock() == null || finalBlock.equalsIgnoreCase(p.getApartmentBlock()))
                        .collect(Collectors.toList());
            }

            if (billingMonth != null && !billingMonth.isEmpty()) {
                String finalMonth = billingMonth;
                list = list.stream()
                        .filter(p -> p.getBillingMonth() == null || finalMonth.equalsIgnoreCase(p.getBillingMonth()))
                        .collect(Collectors.toList());
            }

            // Sort by purchaseDate descending
            list.sort((a, b) -> {
                if (a.getPurchaseDate() == null || b.getPurchaseDate() == null) return 0;
                return b.getPurchaseDate().compareTo(a.getPurchaseDate());
            });

            return ResponseEntity.ok(list);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    // GET P&L Summary (Water Cost vs Resident Billing Revenue)
    @GetMapping("/summary")
    public ResponseEntity<?> getProfitAndLossSummary(
            @RequestParam(required = false) String callerUsername,
            @RequestParam(required = false) String apartmentBlock,
            @RequestParam(required = false) String billingMonth) {

        try {
            String blockToUse = apartmentBlock;
            if ((blockToUse == null || blockToUse.isEmpty()) && callerUsername != null && !callerUsername.isEmpty()) {
                Optional<User> userOpt = userRepository.findByUsername(callerUsername);
                if (userOpt.isPresent()) {
                    blockToUse = userOpt.get().getApartmentBlock();
                }
            }

            // 1. Fetch bulk water purchase logs
            List<BulkWaterPurchase> purchases = repository.findAll();

            if (blockToUse != null && !blockToUse.isEmpty()) {
                String finalBlock = blockToUse;
                purchases = purchases.stream()
                        .filter(p -> p.getApartmentBlock() == null || finalBlock.equalsIgnoreCase(p.getApartmentBlock()))
                        .collect(Collectors.toList());
            }

            if (billingMonth != null && !billingMonth.isEmpty()) {
                String finalMonth = billingMonth;
                purchases = purchases.stream()
                        .filter(p -> p.getBillingMonth() == null || finalMonth.equalsIgnoreCase(p.getBillingMonth()))
                        .collect(Collectors.toList());
            }

            double totalWaterPurchasedLiters = 0.0;
            double totalPurchaseCost = 0.0;

            Map<String, Map<String, Object>> sourceBreakdown = new HashMap<>();

            for (BulkWaterPurchase p : purchases) {
                double liters = p.getVolumeLiters() != null ? p.getVolumeLiters() : 0.0;
                double cost = p.getTotalCost() != null ? p.getTotalCost() : 0.0;

                totalWaterPurchasedLiters += liters;
                totalPurchaseCost += cost;

                String src = p.getSourceType() != null ? p.getSourceType() : "OTHER";
                sourceBreakdown.putIfAbsent(src, new HashMap<>());
                Map<String, Object> srcData = sourceBreakdown.get(src);
                double existingLiters = (double) srcData.getOrDefault("liters", 0.0);
                double existingCost = (double) srcData.getOrDefault("cost", 0.0);
                srcData.put("liters", existingLiters + liters);
                srcData.put("cost", existingCost + cost);
            }

            // 2. Fetch resident bills for the same block/month
            List<Bill> residentBills = billRepository.findAll();
            if (blockToUse != null && !blockToUse.isEmpty()) {
                String finalBlock = blockToUse;
                residentBills = residentBills.stream()
                        .filter(b -> b.getApartmentBlock() == null || finalBlock.equalsIgnoreCase(b.getApartmentBlock()))
                        .collect(Collectors.toList());
            }
            if (billingMonth != null && !billingMonth.isEmpty()) {
                String finalMonth = billingMonth;
                residentBills = residentBills.stream()
                        .filter(b -> finalMonth.equalsIgnoreCase(b.getBillingPeriod()))
                        .collect(Collectors.toList());
            }

            double totalResidentConsumptionLiters = 0.0;
            double totalResidentBilledRevenue = 0.0;
            double totalLateFeesBilled = 0.0;

            for (Bill b : residentBills) {
                double liters = b.getConsumptionLiters() != null ? b.getConsumptionLiters() : 0.0;
                double amt = b.getAmount() != null ? b.getAmount() : 0.0;
                double lateFee = b.getLateFeeAmount() != null ? b.getLateFeeAmount() : 0.0;

                totalResidentConsumptionLiters += liters;
                totalResidentBilledRevenue += (amt + lateFee);
                totalLateFeesBilled += lateFee;
            }

            // 3. Compute Net Profit/Loss & Margins
            double netProfitLoss = totalResidentBilledRevenue - totalPurchaseCost;
            double profitMarginPercent = totalResidentBilledRevenue > 0
                    ? (netProfitLoss / totalResidentBilledRevenue) * 100.0
                    : 0.0;
            double volumeEfficiencyPercent = totalWaterPurchasedLiters > 0
                    ? (totalResidentConsumptionLiters / totalWaterPurchasedLiters) * 100.0
                    : 0.0;

            // 4. Build 12-month comparison trend data for the current year
            int currentYear = LocalDate.now().getYear();
            String[] monthNames = {
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            };

            List<BulkWaterPurchase> allBlockPurchases = repository.findAll();
            if (blockToUse != null && !blockToUse.isEmpty()) {
                String finalBlock = blockToUse;
                allBlockPurchases = allBlockPurchases.stream()
                        .filter(p -> p.getApartmentBlock() == null || finalBlock.equalsIgnoreCase(p.getApartmentBlock()))
                        .collect(Collectors.toList());
            }

            List<Bill> allBlockBills = billRepository.findAll();
            if (blockToUse != null && !blockToUse.isEmpty()) {
                String finalBlock = blockToUse;
                allBlockBills = allBlockBills.stream()
                        .filter(b -> b.getApartmentBlock() == null || finalBlock.equalsIgnoreCase(b.getApartmentBlock()))
                        .collect(Collectors.toList());
            }

            List<Map<String, Object>> monthlyTrends = new ArrayList<>();
            for (String mName : monthNames) {
                String monthKey = mName + " " + currentYear;

                double mPurchaseCost = allBlockPurchases.stream()
                        .filter(p -> monthKey.equalsIgnoreCase(p.getBillingMonth()))
                        .mapToDouble(p -> p.getTotalCost() != null ? p.getTotalCost() : 0.0)
                        .sum();

                double mResidentRevenue = allBlockBills.stream()
                        .filter(b -> monthKey.equalsIgnoreCase(b.getBillingPeriod()))
                        .mapToDouble(b -> (b.getAmount() != null ? b.getAmount() : 0.0) + (b.getLateFeeAmount() != null ? b.getLateFeeAmount() : 0.0))
                        .sum();

                Map<String, Object> mTrend = new HashMap<>();
                mTrend.put("month", mName);
                mTrend.put("fullMonth", monthKey);
                mTrend.put("waterPurchaseCost", Math.round(mPurchaseCost * 100.0) / 100.0);
                mTrend.put("residentRevenueBilled", Math.round(mResidentRevenue * 100.0) / 100.0);
                mTrend.put("netProfitLoss", Math.round((mResidentRevenue - mPurchaseCost) * 100.0) / 100.0);
                monthlyTrends.add(mTrend);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("apartmentBlock", blockToUse != null ? blockToUse : "All Blocks");
            response.put("billingMonth", billingMonth != null ? billingMonth : "All Months");
            response.put("totalWaterPurchasedLiters", Math.round(totalWaterPurchasedLiters * 100.0) / 100.0);
            response.put("totalPurchaseCost", Math.round(totalPurchaseCost * 100.0) / 100.0);
            response.put("totalResidentConsumptionLiters", Math.round(totalResidentConsumptionLiters * 100.0) / 100.0);
            response.put("totalResidentBilledRevenue", Math.round(totalResidentBilledRevenue * 100.0) / 100.0);
            response.put("totalLateFeesBilled", Math.round(totalLateFeesBilled * 100.0) / 100.0);
            response.put("netProfitLoss", Math.round(netProfitLoss * 100.0) / 100.0);
            response.put("isProfit", netProfitLoss >= 0);
            response.put("profitMarginPercent", Math.round(profitMarginPercent * 10.0) / 10.0);
            response.put("volumeEfficiencyPercent", Math.round(volumeEfficiencyPercent * 10.0) / 10.0);
            response.put("purchaseLogsCount", purchases.size());
            response.put("residentBillsCount", residentBills.size());
            response.put("sourceBreakdown", sourceBreakdown);
            response.put("monthlyTrends", monthlyTrends);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("apartmentBlock", apartmentBlock != null ? apartmentBlock : "All Blocks");
            fallback.put("billingMonth", billingMonth != null ? billingMonth : "All Months");
            fallback.put("totalWaterPurchasedLiters", 0);
            fallback.put("totalPurchaseCost", 0);
            fallback.put("totalResidentConsumptionLiters", 0);
            fallback.put("totalResidentBilledRevenue", 0);
            fallback.put("totalLateFeesBilled", 0);
            fallback.put("netProfitLoss", 0);
            fallback.put("isProfit", true);
            fallback.put("profitMarginPercent", 0);
            fallback.put("volumeEfficiencyPercent", 0);
            fallback.put("purchaseLogsCount", 0);
            fallback.put("residentBillsCount", 0);
            fallback.put("sourceBreakdown", new HashMap<>());
            return ResponseEntity.ok(fallback);
        }
    }

    // DELETE a purchase record
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePurchase(@PathVariable Long id) {
        try {
            repository.deleteById(id);
            return ResponseEntity.ok("Bulk purchase record deleted successfully.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}
