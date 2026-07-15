package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.service.DashboardStatsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardStatsController {

    @Autowired
    private DashboardStatsService dashboardStatsService;

    // GET Super Admin dashboard statistics
    @GetMapping("/admin")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        return ResponseEntity.ok(dashboardStatsService.getAdminStats());
    }

    // GET Community Admin dashboard statistics for a specific block
    @GetMapping("/community/{apartmentBlock}")
    public ResponseEntity<Map<String, Object>> getCommunityStats(@PathVariable String apartmentBlock) {
        return ResponseEntity.ok(dashboardStatsService.getCommunityAdminStats(apartmentBlock));
    }

    // GET Household User dashboard statistics
    @GetMapping("/household/{houseNumber}")
    public ResponseEntity<Map<String, Object>> getHouseholdStats(@PathVariable String houseNumber) {
        return ResponseEntity.ok(dashboardStatsService.getHouseholdStats(houseNumber));
    }
}
