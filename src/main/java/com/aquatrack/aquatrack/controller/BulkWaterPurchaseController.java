package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.BulkWaterPurchase;
import com.aquatrack.aquatrack.repository.BulkWaterPurchaseRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bulk-purchases")
public class BulkWaterPurchaseController {

    @Autowired
    private BulkWaterPurchaseRepository repository;

    // LOG a new bulk water purchase (Community Admin)
    @PostMapping
    public ResponseEntity<BulkWaterPurchase> logPurchase(@Valid @RequestBody BulkWaterPurchase purchase) {
        // Auto-compute unit cost
        if (purchase.getVolumeLiters() > 0) {
            purchase.setUnitCostPerLiter(purchase.getTotalCost() / purchase.getVolumeLiters());
        }
        return ResponseEntity.ok(repository.save(purchase));
    }

    // GET all bulk purchases
    @GetMapping
    public ResponseEntity<List<BulkWaterPurchase>> getAllPurchases() {
        return ResponseEntity.ok(repository.findAll());
    }

    // GET purchases for a specific apartment
    @GetMapping("/apartment/{apartmentId}")
    public ResponseEntity<List<BulkWaterPurchase>> getPurchasesByApartment(@PathVariable Long apartmentId) {
        return ResponseEntity.ok(repository.findByApartmentId(apartmentId));
    }

    // GET purchases for a billing cycle
    @GetMapping("/cycle/{billingCycleId}")
    public ResponseEntity<List<BulkWaterPurchase>> getPurchasesByCycle(@PathVariable Long billingCycleId) {
        return ResponseEntity.ok(repository.findByBillingCycleId(billingCycleId));
    }

    // DELETE a purchase record
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePurchase(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.ok("Bulk purchase record deleted.");
    }
}
