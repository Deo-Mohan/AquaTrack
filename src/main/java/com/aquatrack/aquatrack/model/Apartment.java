package com.aquatrack.aquatrack.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "apartments")
public class Apartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Apartment name is required")
    @Column(name = "name", unique = true)
    private String name; // e.g., "Skyline Heights"

    @NotBlank(message = "Address is required")
    private String address;

    // One apartment can have many households
    @OneToMany(mappedBy = "apartment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Household> households = new ArrayList<>();

    public Apartment() {}

    public Apartment(String name, String address) {
        this.name = name;
        this.address = address;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public List<Household> getHouseholds() { return households; }
    public void setHouseholds(List<Household> households) { this.households = households; }
}