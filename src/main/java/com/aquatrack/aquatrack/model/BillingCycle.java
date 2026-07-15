package com.aquatrack.aquatrack.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Entity
@Table(name = "billing_cycles")
public class BillingCycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Cycle name is required")
    @Column(name = "cycle_name")
    private String cycleName; // e.g., "July 2026"

    @NotNull(message = "Start date is required")
    @Column(name = "start_date")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    @Column(name = "end_date")
    private LocalDate endDate;

    // OPEN, FINALIZED, ARCHIVED
    @NotBlank
    @Column(name = "status")
    private String status = "OPEN";

    @NotNull
    @Column(name = "apartment_id")
    private Long apartmentId;

    // Total water consumed across all households during this cycle (liters)
    @Column(name = "total_consumption_liters")
    private Double totalConsumptionLiters = 0.0;

    // Total billed amount for the entire cycle
    @Column(name = "total_billed_amount")
    private Double totalBilledAmount = 0.0;

    // Total shared area cost allocated during this cycle
    @Column(name = "shared_area_cost")
    private Double sharedAreaCost = 0.0;

    @Column(name = "finalized_date")
    private LocalDate finalizedDate;

    @Column(name = "apartment_block")
    private String apartmentBlock;

    public BillingCycle() {}

    public BillingCycle(String cycleName, LocalDate startDate, LocalDate endDate, Long apartmentId, String apartmentBlock) {
        this.cycleName = cycleName;
        this.startDate = startDate;
        this.endDate = endDate;
        this.apartmentId = apartmentId;
        this.apartmentBlock = apartmentBlock;
        this.status = "OPEN";
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCycleName() { return cycleName; }
    public void setCycleName(String cycleName) { this.cycleName = cycleName; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getApartmentId() { return apartmentId; }
    public void setApartmentId(Long apartmentId) { this.apartmentId = apartmentId; }
    public String getApartmentBlock() { return apartmentBlock; }
    public void setApartmentBlock(String apartmentBlock) { this.apartmentBlock = apartmentBlock; }
    public Double getTotalConsumptionLiters() { return totalConsumptionLiters; }
    public void setTotalConsumptionLiters(Double totalConsumptionLiters) { this.totalConsumptionLiters = totalConsumptionLiters; }
    public Double getTotalBilledAmount() { return totalBilledAmount; }
    public void setTotalBilledAmount(Double totalBilledAmount) { this.totalBilledAmount = totalBilledAmount; }
    public Double getSharedAreaCost() { return sharedAreaCost; }
    public void setSharedAreaCost(Double sharedAreaCost) { this.sharedAreaCost = sharedAreaCost; }
    public LocalDate getFinalizedDate() { return finalizedDate; }
    public void setFinalizedDate(LocalDate finalizedDate) { this.finalizedDate = finalizedDate; }
}
