package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.User;
import com.aquatrack.aquatrack.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tariff")
public class TariffController {

    @Autowired
    private UserRepository userRepository;

    // GET: Fetch tariff settings for a community admin's block
    @GetMapping
    public ResponseEntity<?> getTariffSettings(
            @RequestParam String callerUsername,
            @RequestParam(required = false) String callerBlock) {

        User caller = userRepository.findByUsername(callerUsername).orElse(null);
        if (caller == null) {
            return ResponseEntity.status(404).body("User not found.");
        }

        String block = callerBlock != null ? callerBlock : caller.getApartmentBlock();

        List<User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", block);
        User admin = admins.isEmpty() ? null : admins.get(0);

        if (admin == null) {
            return ResponseEntity.ok(Map.of(
                "block", block,
                "baseRatePerLiter", 0.0,
                "monthlyLimitLiters", 0.0,
                "excessRatePerLiter", 0.0
            ));
        }

        return ResponseEntity.ok(Map.of(
            "block", block,
            "baseRatePerLiter", admin.getWaterRatePerLiter() != null ? admin.getWaterRatePerLiter() : 0.0,
            "monthlyLimitLiters", admin.getMonthlyLimitLiters() != null ? admin.getMonthlyLimitLiters() : 0.0,
            "excessRatePerLiter", admin.getExcessRatePerLiter() != null ? admin.getExcessRatePerLiter() : 0.0
        ));
    }

    // PUT: Update tariff settings — Community Admin only
    @PutMapping
    public ResponseEntity<?> updateTariffSettings(
            @RequestParam String callerUsername,
            @RequestParam String callerRole,
            @RequestParam(required = false) String callerBlock,
            @RequestBody Map<String, Object> body) {

        if (!"ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole) && !"ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
            return ResponseEntity.status(403).body("Access denied.");
        }

        User caller = userRepository.findByUsername(callerUsername).orElse(null);
        if (caller == null) {
            return ResponseEntity.status(404).body("Caller user not found.");
        }

        String block = callerBlock != null ? callerBlock : caller.getApartmentBlock();

        List<User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", block);
        if (admins.isEmpty()) {
            return ResponseEntity.status(404).body("No community admin found for block: " + block);
        }

        User admin = admins.get(0);

        Double baseRate = body.get("baseRatePerLiter") != null ? ((Number) body.get("baseRatePerLiter")).doubleValue() : null;
        Double limit = body.get("monthlyLimitLiters") != null ? ((Number) body.get("monthlyLimitLiters")).doubleValue() : null;
        Double excessRate = body.get("excessRatePerLiter") != null ? ((Number) body.get("excessRatePerLiter")).doubleValue() : null;

        // Base rate is a Super Admin-only setting — Community Admins cannot change it
        if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(callerRole)) {
            baseRate = null; // Silently reject any base rate change from CA
        }

        if (baseRate != null) admin.setWaterRatePerLiter(baseRate);
        if (limit != null) admin.setMonthlyLimitLiters(limit);
        if (excessRate != null) admin.setExcessRatePerLiter(excessRate);

        userRepository.save(admin);

        // Propagate to all residents
        List<User> residents1 = userRepository.findByRoleAndApartmentBlock("ROLE_RESIDENT", block);
        List<User> residents2 = userRepository.findByRoleAndApartmentBlock("ROLE_HOUSEHOLD_USER", block);
        java.util.List<User> allResidents = new java.util.ArrayList<>();
        allResidents.addAll(residents1);
        allResidents.addAll(residents2);

        for (User resident : allResidents) {
            if (baseRate != null) resident.setWaterRatePerLiter(baseRate);
            if (limit != null) resident.setMonthlyLimitLiters(limit);
            if (excessRate != null) resident.setExcessRatePerLiter(excessRate);
            userRepository.save(resident);
        }

        return ResponseEntity.ok(Map.of(
            "message", "Tariff updated and propagated to " + allResidents.size() + " residents.",
            "block", block,
            "baseRatePerLiter", admin.getWaterRatePerLiter() != null ? admin.getWaterRatePerLiter() : 0.0,
            "monthlyLimitLiters", admin.getMonthlyLimitLiters() != null ? admin.getMonthlyLimitLiters() : 0.0,
            "excessRatePerLiter", admin.getExcessRatePerLiter() != null ? admin.getExcessRatePerLiter() : 0.0
        ));
    }
}
