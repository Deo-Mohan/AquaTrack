package com.aquatrack.aquatrack.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Entity
@Table(name = "bills")
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "House number is required")
    @Column(name = "house_number")
    private String houseNumber;

    @Column(name = "apartment_block")
    private String apartmentBlock;

    // Consumption-based charge (from tiered tariff)
    @Column(name = "base_charge")
    private Double baseCharge = 0.0;

    // Shared area cost allocation (garden, pool, lobby water)
    @Column(name = "shared_area_charge")
    private Double sharedAreaCharge = 0.0;

    // Fixed monthly charge from tariff plan
    @Column(name = "fixed_charge")
    private Double fixedCharge = 0.0;

    // Any manual adjustments (credits/debits)
    @Column(name = "adjustments")
    private Double adjustments = 0.0;

    // Total amount = baseCharge + sharedAreaCharge + fixedCharge + adjustments
    @NotNull(message = "Amount is required")
    @Column(name = "amount")
    private Double amount;

    // Total liters consumed during billing period
    @Column(name = "consumption_liters")
    private Double consumptionLiters = 0.0;

    @NotNull(message = "Due date is required")
    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "status")
    private String status; // "PAID", "UNPAID", "OVERDUE"

    @Column(name = "billing_cycle_id")
    private Long billingCycleId;

    @Column(name = "generated_date")
    private LocalDate generatedDate;

    @Column(name = "meter_id")
    private String meterId;

    // Tariff breakdown fields
    @Column(name = "within_limit_liters")
    private Double withinLimitLiters = 0.0;

    @Column(name = "excess_liters")
    private Double excessLiters = 0.0;

    @Column(name = "base_rate_per_liter")
    private Double baseRatePerLiter = 0.0;

    @Column(name = "excess_rate_per_liter")
    private Double excessRatePerLiter = 0.0;

    @Column(name = "excess_charge")
    private Double excessCharge = 0.0;

    @Column(name = "monthly_limit_liters")
    private Double monthlyLimitLiters = 0.0;

    // Explicit human-readable billing period label, e.g. "June 2026"
    @Column(name = "billing_period")
    private String billingPeriod;

    // Default Constructor
    public Bill() {}

    // Convenience Constructor
    public Bill(String houseNumber, Double amount, LocalDate dueDate, String status) {
        this.houseNumber = houseNumber;
        this.amount = amount;
        this.dueDate = dueDate;
        this.status = status;
        this.generatedDate = LocalDate.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getHouseNumber() { return houseNumber; }
    public void setHouseNumber(String houseNumber) { this.houseNumber = houseNumber; }

    public String getApartmentBlock() { return apartmentBlock; }
    public void setApartmentBlock(String apartmentBlock) { this.apartmentBlock = apartmentBlock; }

    public Double getBaseCharge() { return baseCharge; }
    public void setBaseCharge(Double baseCharge) { this.baseCharge = baseCharge; }

    public Double getSharedAreaCharge() { return sharedAreaCharge; }
    public void setSharedAreaCharge(Double sharedAreaCharge) { this.sharedAreaCharge = sharedAreaCharge; }

    public Double getFixedCharge() { return fixedCharge; }
    public void setFixedCharge(Double fixedCharge) { this.fixedCharge = fixedCharge; }

    public Double getAdjustments() { return adjustments; }
    public void setAdjustments(Double adjustments) { this.adjustments = adjustments; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public Double getConsumptionLiters() { return consumptionLiters; }
    public void setConsumptionLiters(Double consumptionLiters) { this.consumptionLiters = consumptionLiters; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getBillingCycleId() { return billingCycleId; }
    public void setBillingCycleId(Long billingCycleId) { this.billingCycleId = billingCycleId; }

    public LocalDate getGeneratedDate() { return generatedDate; }
    public void setGeneratedDate(LocalDate generatedDate) { this.generatedDate = generatedDate; }

    public String getMeterId() { return meterId; }
    public void setMeterId(String meterId) { this.meterId = meterId; }

    public Double getWithinLimitLiters() { return withinLimitLiters; }
    public void setWithinLimitLiters(Double withinLimitLiters) { this.withinLimitLiters = withinLimitLiters; }

    public Double getExcessLiters() { return excessLiters; }
    public void setExcessLiters(Double excessLiters) { this.excessLiters = excessLiters; }

    public Double getBaseRatePerLiter() { return baseRatePerLiter; }
    public void setBaseRatePerLiter(Double baseRatePerLiter) { this.baseRatePerLiter = baseRatePerLiter; }

    public Double getExcessRatePerLiter() { return excessRatePerLiter; }
    public void setExcessRatePerLiter(Double excessRatePerLiter) { this.excessRatePerLiter = excessRatePerLiter; }

    public Double getExcessCharge() { return excessCharge; }
    public void setExcessCharge(Double excessCharge) { this.excessCharge = excessCharge; }

    public Double getMonthlyLimitLiters() { return monthlyLimitLiters; }
    public void setMonthlyLimitLiters(Double monthlyLimitLiters) { this.monthlyLimitLiters = monthlyLimitLiters; }

    public String getBillingPeriod() { return billingPeriod; }
    public void setBillingPeriod(String billingPeriod) { this.billingPeriod = billingPeriod; }
}
