package com.aquatrack.aquatrack.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "colonies")
public class Colony {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Colony name is required")
    @Column(name = "colony_name", unique = true, nullable = false)
    private String colonyName; // e.g., "Sheetal Paradise"

    @Column(name = "address")
    private String address; // e.g., "Sector 14, Noida"

    // One colony has many buildings
    @OneToMany(mappedBy = "colony", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<Building> buildings = new ArrayList<>();

    public Colony() {}

    public Colony(String colonyName, String address) {
        this.colonyName = colonyName;
        this.address = address;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getColonyName() { return colonyName; }
    public void setColonyName(String colonyName) { this.colonyName = colonyName; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public List<Building> getBuildings() { return buildings; }
    public void setBuildings(List<Building> buildings) { this.buildings = buildings; }
}
