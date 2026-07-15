package com.aquatrack.aquatrack.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "buildings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"building_name", "colony_id"})
})
public class Building {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Building name is required")
    @Column(name = "building_name", nullable = false)
    private String buildingName; // e.g., "Akash Block", "Block A", "Tower 1"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "colony_id", nullable = false)
    @JsonBackReference
    private Colony colony;

    public Building() {}

    public Building(String buildingName, Colony colony) {
        this.buildingName = buildingName;
        this.colony = colony;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getBuildingName() { return buildingName; }
    public void setBuildingName(String buildingName) { this.buildingName = buildingName; }
    public Colony getColony() { return colony; }
    public void setColony(Colony colony) { this.colony = colony; }
}
