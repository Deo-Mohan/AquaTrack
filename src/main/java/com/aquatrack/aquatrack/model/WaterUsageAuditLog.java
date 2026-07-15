package com.aquatrack.aquatrack.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "water_usage_audit_logs")
public class WaterUsageAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "original_log_id")
    private Long originalLogId;

    @Column(name = "house_number")
    private String houseNumber;

    @Column(name = "apartment_block")
    private String apartmentBlock;

    @Column(name = "action")
    private String action; // "EDITED" or "DELETED"

    @Column(name = "old_reading_liters")
    private Double oldReadingLiters;

    @Column(name = "new_reading_liters")
    private Double newReadingLiters;

    @Column(name = "action_time")
    private LocalDateTime actionTime;

    @Column(name = "performed_by")
    private String performedBy;

    public WaterUsageAuditLog() {
        this.actionTime = LocalDateTime.now();
    }

    public WaterUsageAuditLog(Long originalLogId, String houseNumber, String apartmentBlock, String action, Double oldReadingLiters, Double newReadingLiters, String performedBy) {
        this.originalLogId = originalLogId;
        this.houseNumber = houseNumber;
        this.apartmentBlock = apartmentBlock;
        this.action = action;
        this.oldReadingLiters = oldReadingLiters;
        this.newReadingLiters = newReadingLiters;
        this.performedBy = performedBy;
        this.actionTime = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOriginalLogId() { return originalLogId; }
    public void setOriginalLogId(Long originalLogId) { this.originalLogId = originalLogId; }
    public String getHouseNumber() { return houseNumber; }
    public void setHouseNumber(String houseNumber) { this.houseNumber = houseNumber; }
    public String getApartmentBlock() { return apartmentBlock; }
    public void setApartmentBlock(String apartmentBlock) { this.apartmentBlock = apartmentBlock; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public Double getOldReadingLiters() { return oldReadingLiters; }
    public void setOldReadingLiters(Double oldReadingLiters) { this.oldReadingLiters = oldReadingLiters; }
    public Double getNewReadingLiters() { return newReadingLiters; }
    public void setNewReadingLiters(Double newReadingLiters) { this.newReadingLiters = newReadingLiters; }
    public LocalDateTime getActionTime() { return actionTime; }
    public void setActionTime(LocalDateTime actionTime) { this.actionTime = actionTime; }
    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
}
