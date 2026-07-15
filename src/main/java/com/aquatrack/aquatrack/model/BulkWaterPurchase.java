package com.aquatrack.aquatrack.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;

@Entity
@Table(name = "bulk_water_purchases")
public class BulkWaterPurchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Apartment ID is required")
    @Column(name = "apartment_id")
    private Long apartmentId;

    // Source type: TANKER, MUNICIPAL, BOREWELL
    @NotBlank(message = "Source type is required")
    @Column(name = "source_type")
    private String sourceType;

    @NotNull(message = "Volume in liters is required")
    @Positive(message = "Volume must be positive")
    @Column(name = "volume_liters")
    private Double volumeLiters;

    @NotNull(message = "Cost amount is required")
    @Positive(message = "Cost must be positive")
    @Column(name = "total_cost")
    private Double totalCost;

    // Computed: totalCost / volumeLiters
    @Column(name = "unit_cost_per_liter")
    private Double unitCostPerLiter;

    @NotNull(message = "Purchase date is required")
    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "vendor_name")
    private String vendorName;

    @Column(name = "notes")
    private String notes;

    // Link to billing cycle (optional)
    @Column(name = "billing_cycle_id")
    private Long billingCycleId;

    public BulkWaterPurchase() {}

    public BulkWaterPurchase(Long apartmentId, String sourceType, Double volumeLiters,
                              Double totalCost, LocalDate purchaseDate, String vendorName) {
        this.apartmentId = apartmentId;
        this.sourceType = sourceType;
        this.volumeLiters = volumeLiters;
        this.totalCost = totalCost;
        this.purchaseDate = purchaseDate;
        this.vendorName = vendorName;
        this.unitCostPerLiter = totalCost / volumeLiters;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getApartmentId() { return apartmentId; }
    public void setApartmentId(Long apartmentId) { this.apartmentId = apartmentId; }
    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    public Double getVolumeLiters() { return volumeLiters; }
    public void setVolumeLiters(Double volumeLiters) { this.volumeLiters = volumeLiters; }
    public Double getTotalCost() { return totalCost; }
    public void setTotalCost(Double totalCost) { this.totalCost = totalCost; }
    public Double getUnitCostPerLiter() { return unitCostPerLiter; }
    public void setUnitCostPerLiter(Double unitCostPerLiter) { this.unitCostPerLiter = unitCostPerLiter; }
    public LocalDate getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(LocalDate purchaseDate) { this.purchaseDate = purchaseDate; }
    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Long getBillingCycleId() { return billingCycleId; }
    public void setBillingCycleId(Long billingCycleId) { this.billingCycleId = billingCycleId; }
}
