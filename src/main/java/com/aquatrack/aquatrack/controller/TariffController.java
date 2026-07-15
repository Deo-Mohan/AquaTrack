package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.TariffPlan;
import com.aquatrack.aquatrack.repository.TariffPlanRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tariffs")
public class TariffController {

    @Autowired
    private TariffPlanRepository tariffPlanRepository;

    // CREATE a new tariff plan (Admin / Community Admin)
    @PostMapping
    public ResponseEntity<TariffPlan> createTariff(@Valid @RequestBody TariffPlan tariffPlan) {
        // Deactivate existing active tariff for the same apartment before saving new one
        if (tariffPlan.getApartmentId() != null) {
            tariffPlanRepository.findByApartmentIdAndIsActive(tariffPlan.getApartmentId(), true)
                    .ifPresent(existing -> {
                        existing.setIsActive(false);
                        tariffPlanRepository.save(existing);
                    });
        }
        tariffPlan.setIsActive(true);
        return ResponseEntity.ok(tariffPlanRepository.save(tariffPlan));
    }

    // GET all tariff plans
    @GetMapping
    public ResponseEntity<List<TariffPlan>> getAllTariffs() {
        return ResponseEntity.ok(tariffPlanRepository.findAll());
    }

    // GET active tariff plans only
    @GetMapping("/active")
    public ResponseEntity<List<TariffPlan>> getActiveTariffs() {
        return ResponseEntity.ok(tariffPlanRepository.findByIsActive(true));
    }

    // GET tariff plans for a specific apartment
    @GetMapping("/apartment/{apartmentId}")
    public ResponseEntity<List<TariffPlan>> getTariffsByApartment(@PathVariable Long apartmentId) {
        return ResponseEntity.ok(tariffPlanRepository.findByApartmentId(apartmentId));
    }

    // GET a single tariff plan by ID
    @GetMapping("/{id}")
    public ResponseEntity<TariffPlan> getTariffById(@PathVariable Long id) {
        TariffPlan plan = tariffPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tariff plan not found with ID: " + id));
        return ResponseEntity.ok(plan);
    }

    // UPDATE a tariff plan
    @PutMapping("/{id}")
    public ResponseEntity<TariffPlan> updateTariff(@PathVariable Long id,
                                                    @Valid @RequestBody TariffPlan updated) {
        TariffPlan existing = tariffPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tariff plan not found with ID: " + id));

        existing.setPlanName(updated.getPlanName());
        existing.setTier1LimitKL(updated.getTier1LimitKL());
        existing.setTier1RatePerKL(updated.getTier1RatePerKL());
        existing.setTier2RatePerKL(updated.getTier2RatePerKL());
        existing.setTier3LimitKL(updated.getTier3LimitKL());
        existing.setTier3RatePerKL(updated.getTier3RatePerKL());
        existing.setFixedCharge(updated.getFixedCharge());

        return ResponseEntity.ok(tariffPlanRepository.save(existing));
    }

    // DELETE a tariff plan
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTariff(@PathVariable Long id) {
        tariffPlanRepository.deleteById(id);
        return ResponseEntity.ok("Tariff plan deleted successfully.");
    }
}
