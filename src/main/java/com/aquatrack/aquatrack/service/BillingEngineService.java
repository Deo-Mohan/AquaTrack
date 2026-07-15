package com.aquatrack.aquatrack.service;

import com.aquatrack.aquatrack.model.TariffPlan;
import com.aquatrack.aquatrack.model.User;
import com.aquatrack.aquatrack.repository.TariffPlanRepository;
import com.aquatrack.aquatrack.repository.WaterUsageRepository;
import com.aquatrack.aquatrack.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Optional;

/**
 * Tiered Tariff Billing Engine
 * 
 * Calculates per-household water charges based on metered consumption volume,
 * applying configurable rate tiers stored per apartment.
 * 
 * Tier 1: Base rate for first N kL (e.g., ₹5/kL for 0-10 kL)
 * Tier 2: Higher rate beyond tier 1 (e.g., ₹12/kL for 10-30 kL)
 * Tier 3: Penalty rate for excessive usage (e.g., ₹20/kL beyond 30 kL)
 */
@Service
public class BillingEngineService {

    @Autowired
    private TariffPlanRepository tariffPlanRepository;

    @Autowired
    private WaterUsageRepository waterUsageRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Calculate the consumption-based charge for a single household.
     * 
     * @param houseNumber  The household identifier
     * @param startDate    Billing period start
     * @param endDate      Billing period end
     * @param tariffPlan   The applicable tariff plan
     * @return A map containing charge breakdown and total
     */
    public Map<String, Double> calculateHouseholdBill(String houseNumber, LocalDate startDate,
                                                       LocalDate endDate, TariffPlan tariffPlan) {
        Double totalLiters = waterUsageRepository.sumConsumptionByHouseholdAndDateRange(
                houseNumber, startDate, endDate);
        if (totalLiters == null) {
            totalLiters = 0.0;
        }

        // 2. Convert liters to kiloliters (1 kL = 1000 L)
        double consumptionKL = totalLiters / 1000.0;

        // 3. Find if there is a custom rate per liter set for this block
        Double customRatePerLiter = null;
        Optional<User> userOpt = userRepository.findByHouseNumber(houseNumber);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getWaterRatePerLiter() != null) {
                customRatePerLiter = user.getWaterRatePerLiter();
            } else if ("ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(user.getRole())) {
                customRatePerLiter = user.getWaterRatePerLiter();
            } else {
                String block = user.getApartmentBlock();
                if (block != null && !block.trim().isEmpty()) {
                    List<User> communityAdmins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", block);
                    for (User admin : communityAdmins) {
                        if (admin.getWaterRatePerLiter() != null) {
                            customRatePerLiter = admin.getWaterRatePerLiter();
                            break;
                        }
                    }
                }
            }
        }

        // 4. Calculate charges
        double tier1Charge = 0.0;
        double tier2Charge = 0.0;
        double tier3Charge = 0.0;

        if (customRatePerLiter != null) {
            tier1Charge = totalLiters * customRatePerLiter;
        } else {
            double remainingKL = consumptionKL;

            // Tier 1 calculation
            double tier1Usage = Math.min(remainingKL, tariffPlan.getTier1LimitKL());
            tier1Charge = tier1Usage * tariffPlan.getTier1RatePerKL();
            remainingKL -= tier1Usage;

            // Tier 2 calculation
            if (remainingKL > 0) {
                double tier2Limit = (tariffPlan.getTier3LimitKL() != null)
                        ? tariffPlan.getTier3LimitKL() - tariffPlan.getTier1LimitKL()
                        : remainingKL; // If no tier 3, all remaining goes to tier 2
                double tier2Usage = Math.min(remainingKL, tier2Limit);
                tier2Charge = tier2Usage * tariffPlan.getTier2RatePerKL();
                remainingKL -= tier2Usage;
            }

            // Tier 3 calculation (penalty rate)
            if (remainingKL > 0 && tariffPlan.getTier3RatePerKL() != null) {
                tier3Charge = remainingKL * tariffPlan.getTier3RatePerKL();
            }
        }

        // 5. Add fixed monthly charge
        double fixedCharge = tariffPlan.getFixedCharge() != null ? tariffPlan.getFixedCharge() : 0.0;

        // 6. Build result breakdown
        double totalCharge = tier1Charge + tier2Charge + tier3Charge + fixedCharge;

        Map<String, Double> breakdown = new HashMap<>();
        breakdown.put("consumptionLiters", totalLiters);
        breakdown.put("consumptionKL", consumptionKL);
        breakdown.put("tier1Charge", tier1Charge);
        breakdown.put("tier2Charge", tier2Charge);
        breakdown.put("tier3Charge", tier3Charge);
        breakdown.put("baseCharge", tier1Charge + tier2Charge + tier3Charge);
        breakdown.put("fixedCharge", fixedCharge);
        breakdown.put("totalCharge", totalCharge);

        return breakdown;
    }

    /**
     * Get the active tariff plan for an apartment, or return a default plan.
     */
    public TariffPlan getActiveTariff(Long apartmentId) {
        return tariffPlanRepository.findByApartmentIdAndIsActive(apartmentId, true)
                .orElseGet(() -> {
                    // Default tariff if none configured
                    TariffPlan defaultPlan = new TariffPlan();
                    defaultPlan.setPlanName("Default Plan");
                    defaultPlan.setTier1LimitKL(10.0);
                    defaultPlan.setTier1RatePerKL(5.0);
                    defaultPlan.setTier2RatePerKL(12.0);
                    defaultPlan.setTier3LimitKL(30.0);
                    defaultPlan.setTier3RatePerKL(20.0);
                    defaultPlan.setFixedCharge(50.0);
                    return defaultPlan;
                });
    }
}
