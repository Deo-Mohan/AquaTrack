package com.aquatrack.aquatrack.service;

import com.aquatrack.aquatrack.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * Dashboard Statistics Service
 *
 * Aggregates data from across all repositories to provide
 * statistics for Admin, Community Admin, and Household User dashboards.
 */
@Service
public class DashboardStatsService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private WaterUsageRepository waterUsageRepository;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private ApartmentRepository apartmentRepository;

    /**
     * Get platform-wide statistics for the Super Admin dashboard.
     */
    public Map<String, Object> getAdminStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.countApprovedUsers());
        stats.put("totalHouseholds", householdRepository.count());
        stats.put("totalApartments", apartmentRepository.count());
        stats.put("totalCommunityAdmins", userRepository.countApprovedByRole("ROLE_COMMUNITY_ADMIN"));
        stats.put("totalHouseholdUsers", userRepository.countApprovedHouseholdUsers());
        stats.put("totalBills", billRepository.count());
        stats.put("totalUsageLogs", waterUsageRepository.count());
        return stats;
    }

    /**
     * Get community-level statistics for a Community Admin's apartment block.
     */
    public Map<String, Object> getCommunityAdminStats(String apartmentBlock) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalHouseholds", householdRepository.countByBlock(apartmentBlock));
        stats.put("totalResidents", userRepository.countApprovedHouseholdUsersByBlock(apartmentBlock));

        // Total usage this month
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate monthEnd = LocalDate.now();
        Double totalUsage = waterUsageRepository.sumConsumptionByBlockAndDateRange(
                apartmentBlock, monthStart, monthEnd);
        stats.put("totalUsageThisMonth", totalUsage != null ? totalUsage : 0.0);

        // Bills summary
        stats.put("totalBills", billRepository.findByApartmentBlock(apartmentBlock).size());

        return stats;
    }

    /**
     * Get household-level statistics for a resident's personal dashboard.
     */
    public Map<String, Object> getHouseholdStats(String houseNumber) {
        Map<String, Object> stats = new HashMap<>();

        // Total usage this month
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate monthEnd = LocalDate.now();
        Double monthlyUsage = waterUsageRepository.sumConsumptionByHouseholdAndDateRange(
                houseNumber, monthStart, monthEnd);
        stats.put("monthlyUsage", monthlyUsage != null ? monthlyUsage : 0.0);

        // Average daily usage
        Double avgUsage = waterUsageRepository.avgConsumptionByHousehold(houseNumber);
        stats.put("averageDailyUsage", avgUsage != null ? avgUsage : 0.0);

        // Outstanding bills
        Double unpaidTotal = billRepository.sumUnpaidByHousehold(houseNumber);
        stats.put("unpaidBillAmount", unpaidTotal != null ? unpaidTotal : 0.0);

        // Latest reading
        var latestLog = waterUsageRepository.findTopByHouseNumberOrderByReadingDateDesc(houseNumber);
        stats.put("latestReading", latestLog != null ? latestLog.getReadingLiters() : 0.0);
        stats.put("latestReadingDate", latestLog != null ? latestLog.getReadingDate().toString() : "N/A");

        return stats;
    }
}
