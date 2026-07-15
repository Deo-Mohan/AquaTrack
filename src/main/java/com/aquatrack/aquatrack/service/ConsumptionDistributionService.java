package com.aquatrack.aquatrack.service;

import com.aquatrack.aquatrack.model.*;
import com.aquatrack.aquatrack.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

/**
 * Consumption-Based Charge Distribution Service
 *
 * Apportions the total apartment water cost (from bulk purchases) across households
 * proportionally by their metered consumption. Falls back to flat area distribution
 * for households without meters.
 */
@Service
public class ConsumptionDistributionService {

    @Autowired
    private WaterUsageRepository waterUsageRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private BulkWaterPurchaseRepository bulkWaterPurchaseRepository;

    /**
     * Calculate each household's share of the total apartment water cost
     * for a given billing period.
     *
     * @param apartmentId  The apartment entity ID
     * @param block        The apartment block name
     * @param startDate    Billing period start
     * @param endDate      Billing period end
     * @return Map of houseNumber -> shared cost allocation
     */
    public Map<String, Double> distributeSharedCosts(Long apartmentId, String block,
                                                      LocalDate startDate, LocalDate endDate) {
        Map<String, Double> allocation = new HashMap<>();

        // 1. Get total bulk water purchase cost for this apartment in the period
        List<BulkWaterPurchase> purchases = bulkWaterPurchaseRepository
                .findByApartmentIdAndPurchaseDateBetween(apartmentId, startDate, endDate);

        double totalSharedCost = purchases.stream()
                .mapToDouble(p -> p.getTotalCost() != null ? p.getTotalCost() : 0.0)
                .sum();

        if (totalSharedCost <= 0) return allocation;

        // 2. Get all households in this apartment block
        List<Household> households = householdRepository.findByBlock(block);
        if (households.isEmpty()) return allocation;

        // 3. Calculate each household's consumption
        Map<String, Double> householdConsumption = new HashMap<>();
        double totalConsumption = 0.0;
        List<Household> unmeteredHouseholds = new ArrayList<>();

        for (Household h : households) {
            Double consumption = waterUsageRepository.sumConsumptionByHouseholdAndDateRange(
                    h.getHouseNumber(), startDate, endDate);

            if (consumption != null && consumption > 0) {
                householdConsumption.put(h.getHouseNumber(), consumption);
                totalConsumption += consumption;
            } else {
                // No meter data — will use flat area fallback
                unmeteredHouseholds.add(h);
            }
        }

        // 4. Proportional distribution for metered households
        if (totalConsumption > 0) {
            // Reserve a portion for unmetered households based on their area ratio
            double totalArea = households.stream()
                    .mapToDouble(h -> h.getFlatSizeSqft() != null ? h.getFlatSizeSqft() : 1000.0)
                    .sum();
            double unmeteredArea = unmeteredHouseholds.stream()
                    .mapToDouble(h -> h.getFlatSizeSqft() != null ? h.getFlatSizeSqft() : 1000.0)
                    .sum();

            double meteredShareOfCost = totalSharedCost * (1 - (unmeteredArea / totalArea));
            double unmeteredShareOfCost = totalSharedCost - meteredShareOfCost;

            // Distribute metered portion by consumption ratio
            for (Map.Entry<String, Double> entry : householdConsumption.entrySet()) {
                double share = (entry.getValue() / totalConsumption) * meteredShareOfCost;
                allocation.put(entry.getKey(), Math.round(share * 100.0) / 100.0);
            }

            // Distribute unmetered portion by flat area ratio
            for (Household h : unmeteredHouseholds) {
                double area = h.getFlatSizeSqft() != null ? h.getFlatSizeSqft() : 1000.0;
                double share = (area / unmeteredArea) * unmeteredShareOfCost;
                allocation.put(h.getHouseNumber(), Math.round(share * 100.0) / 100.0);
            }
        } else {
            // No metered data at all — distribute entirely by flat area
            double totalArea = households.stream()
                    .mapToDouble(h -> h.getFlatSizeSqft() != null ? h.getFlatSizeSqft() : 1000.0)
                    .sum();

            for (Household h : households) {
                double area = h.getFlatSizeSqft() != null ? h.getFlatSizeSqft() : 1000.0;
                double share = (area / totalArea) * totalSharedCost;
                allocation.put(h.getHouseNumber(), Math.round(share * 100.0) / 100.0);
            }
        }

        return allocation;
    }
}
