package com.aquatrack.aquatrack.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.LocalDate;

@Entity
@Table(name = "water_usage_logs")
public class WaterUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "House number is required")
    @Column(name = "house_number")
    private String houseNumber; // Represents household tracking (e.g., "H-204")

    @NotNull(message = "Apartment block area is required")
    @Column(name = "apartment_block")
    private String apartmentBlock; // Represents apartment tracking (e.g., "Block B")

    @NotNull(message = "Reading date is required")
    @Column(name = "reading_date")
    private LocalDate readingDate;

    @NotNull(message = "Meter reading volume is required")
    @PositiveOrZero(message = "Reading cannot be negative")
    @Column(name = "reading_liters")
    private Double readingLiters; // Manual household entry or meter data input[cite: 1]

    @Column(name = "status")
    private String status; // Will display status tags like "Normal" or "Overuse"

    // How the reading was submitted: MANUAL, CSV, IOT
    @Column(name = "source")
    private String source = "MANUAL";

    // DAILY, MONTHLY
    @Column(name = "log_type")
    private String logType = "DAILY";

    // 1. Required Default Constructor (Used by Hibernate)
    public WaterUsageLog() {}

    // 2. Convenience Constructor for creation
    public WaterUsageLog(String houseNumber, String apartmentBlock, LocalDate readingDate, Double readingLiters, String status) {
        this.houseNumber = houseNumber;
        this.apartmentBlock = apartmentBlock;
        this.readingDate = readingDate;
        this.readingLiters = readingLiters;
        this.status = status;
    }

    // 3. Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getHouseNumber() { return houseNumber; }
    public void setHouseNumber(String houseNumber) { this.houseNumber = houseNumber; }

    public String getApartmentBlock() { return apartmentBlock; }
    public void setApartmentBlock(String apartmentBlock) { this.apartmentBlock = apartmentBlock; }

    public LocalDate getReadingDate() { return readingDate; }
    public void setReadingDate(LocalDate readingDate) { this.readingDate = readingDate; }

    public Double getReadingLiters() { return readingLiters; }
    public void setReadingLiters(Double readingLiters) { this.readingLiters = readingLiters; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getLogType() { return logType; }
    public void setLogType(String logType) { this.logType = logType; }
}