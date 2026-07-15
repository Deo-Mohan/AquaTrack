package com.aquatrack.aquatrack.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Entity
@Table(name = "households")
public class Household {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "House number is required")
    @Column(name = "house_number", unique = true)
    private String houseNumber; // e.g., "H-204"

    @NotBlank(message = "Block name is required")
    @Column(name = "block")
    private String block; // e.g., "Block B"

    @NotNull(message = "Flat size area square footage is required")
    @Positive(message = "Flat size must be greater than zero")
    @Column(name = "flat_size_sqft")
    private Double flatSizeSqft; // Used for area-based charge distribution module fallbacks

    @NotNull(message = "Occupancy count is required")
    @Positive(message = "Occupancy must be at least 1 person")
    private Integer occupancy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    @JsonIgnore // Prevents JSON infinite looping issues during API serialization
    private Apartment apartment;

    public Household() {}

    public Household(String houseNumber, String block, Double flatSizeSqft, Integer occupancy, Apartment apartment) {
        this.houseNumber = houseNumber;
        this.block = block;
        this.flatSizeSqft = flatSizeSqft;
        this.occupancy = occupancy;
        this.apartment = apartment;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getHouseNumber() { return houseNumber; }
    public void setHouseNumber(String houseNumber) { this.houseNumber = houseNumber; }
    public String getBlock() { return block; }
    public void setBlock(String block) { this.block = block; }
    public Double getFlatSizeSqft() { return flatSizeSqft; }
    public void setFlatSizeSqft(Double flatSizeSqft) { this.flatSizeSqft = flatSizeSqft; }
    public Integer getOccupancy() { return occupancy; }
    public void setOccupancy(Integer occupancy) { this.occupancy = occupancy; }
    public Apartment getApartment() { return apartment; }
    public void setApartment(Apartment apartment) { this.apartment = apartment; }
}