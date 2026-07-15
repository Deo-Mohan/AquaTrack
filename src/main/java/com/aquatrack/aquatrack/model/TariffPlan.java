package com.aquatrack.aquatrack.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

@Entity
@Table(name = "tariff_plans")
public class TariffPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Tariff plan name is required")
    @Column(name = "plan_name")
    private String planName; // e.g., "Standard Residential", "Premium Block"

    // Tier 1: Base rate for first N kiloliters
    @NotNull
    @PositiveOrZero
    @Column(name = "tier1_limit_kl")
    private Double tier1LimitKL; // e.g., 10.0 kL

    @NotNull
    @PositiveOrZero
    @Column(name = "tier1_rate_per_kl")
    private Double tier1RatePerKL; // e.g., ₹5.00 per kL

    // Tier 2: Higher rate beyond tier 1 limit
    @NotNull
    @PositiveOrZero
    @Column(name = "tier2_rate_per_kl")
    private Double tier2RatePerKL; // e.g., ₹12.00 per kL

    // Tier 3: Penalty rate for excessive usage (optional)
    @Column(name = "tier3_limit_kl")
    private Double tier3LimitKL; // e.g., 30.0 kL

    @Column(name = "tier3_rate_per_kl")
    private Double tier3RatePerKL; // e.g., ₹20.00 per kL

    // Fixed monthly base charge
    @NotNull
    @PositiveOrZero
    @Column(name = "fixed_charge")
    private Double fixedCharge; // e.g., ₹50.00 flat monthly

    // Link to apartment (each apartment can have its own tariff)
    @Column(name = "apartment_id")
    private Long apartmentId;

    @Column(name = "is_active")
    private Boolean isActive = true;

    public TariffPlan() {}

    public TariffPlan(String planName, Double tier1LimitKL, Double tier1RatePerKL,
                      Double tier2RatePerKL, Double tier3LimitKL, Double tier3RatePerKL,
                      Double fixedCharge, Long apartmentId) {
        this.planName = planName;
        this.tier1LimitKL = tier1LimitKL;
        this.tier1RatePerKL = tier1RatePerKL;
        this.tier2RatePerKL = tier2RatePerKL;
        this.tier3LimitKL = tier3LimitKL;
        this.tier3RatePerKL = tier3RatePerKL;
        this.fixedCharge = fixedCharge;
        this.apartmentId = apartmentId;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }
    public Double getTier1LimitKL() { return tier1LimitKL; }
    public void setTier1LimitKL(Double tier1LimitKL) { this.tier1LimitKL = tier1LimitKL; }
    public Double getTier1RatePerKL() { return tier1RatePerKL; }
    public void setTier1RatePerKL(Double tier1RatePerKL) { this.tier1RatePerKL = tier1RatePerKL; }
    public Double getTier2RatePerKL() { return tier2RatePerKL; }
    public void setTier2RatePerKL(Double tier2RatePerKL) { this.tier2RatePerKL = tier2RatePerKL; }
    public Double getTier3LimitKL() { return tier3LimitKL; }
    public void setTier3LimitKL(Double tier3LimitKL) { this.tier3LimitKL = tier3LimitKL; }
    public Double getTier3RatePerKL() { return tier3RatePerKL; }
    public void setTier3RatePerKL(Double tier3RatePerKL) { this.tier3RatePerKL = tier3RatePerKL; }
    public Double getFixedCharge() { return fixedCharge; }
    public void setFixedCharge(Double fixedCharge) { this.fixedCharge = fixedCharge; }
    public Long getApartmentId() { return apartmentId; }
    public void setApartmentId(Long apartmentId) { this.apartmentId = apartmentId; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
