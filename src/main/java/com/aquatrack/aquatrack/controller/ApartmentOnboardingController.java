package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.Apartment;
import com.aquatrack.aquatrack.model.Household;
import com.aquatrack.aquatrack.repository.ApartmentRepository;
import com.aquatrack.aquatrack.repository.HouseholdRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class ApartmentOnboardingController {

    @Autowired
    private ApartmentRepository apartmentRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    // 1. Onboard a new apartment community
    @PostMapping("/apartments")
    public ResponseEntity<Apartment> createApartment(@Valid @RequestBody Apartment apartment) {
        return ResponseEntity.ok(apartmentRepository.save(apartment));
    }

    // 2. GET all apartments
    @GetMapping("/apartments")
    public ResponseEntity<List<Apartment>> getAllApartments() {
        return ResponseEntity.ok(apartmentRepository.findAll());
    }

    // 3. GET single apartment by ID
    @GetMapping("/apartments/{id}")
    public ResponseEntity<Apartment> getApartmentById(@PathVariable Long id) {
        Apartment apt = apartmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Apartment not found with ID: " + id));
        return ResponseEntity.ok(apt);
    }

    // 4. UPDATE apartment details
    @PutMapping("/apartments/{id}")
    public ResponseEntity<Apartment> updateApartment(@PathVariable Long id,
                                                      @Valid @RequestBody Apartment updated) {
        Apartment apt = apartmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Apartment not found with ID: " + id));
        apt.setName(updated.getName());
        apt.setAddress(updated.getAddress());
        return ResponseEntity.ok(apartmentRepository.save(apt));
    }

    // 5. DELETE apartment
    @DeleteMapping("/apartments/{id}")
    public ResponseEntity<?> deleteApartment(@PathVariable Long id) {
        apartmentRepository.deleteById(id);
        return ResponseEntity.ok("Apartment deleted successfully.");
    }

    // 6. Register a household under an apartment
    @PostMapping("/apartments/{apartmentId}/households")
    public ResponseEntity<?> registerHousehold(
            @PathVariable Long apartmentId,
            @Valid @RequestBody Household household) {

        // Check for duplicate houseNumber
        if (householdRepository.existsByHouseNumber(household.getHouseNumber())) {
            return ResponseEntity.badRequest().body("House Number already exists: " + household.getHouseNumber());
        }

        Apartment apt = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new RuntimeException("Apartment not found"));

        household.setApartment(apt);
        return ResponseEntity.ok(householdRepository.save(household));
    }

    // 7. List all registered households
    @GetMapping("/households")
    public ResponseEntity<List<Household>> getAllHouseholds() {
        return ResponseEntity.ok(householdRepository.findAll());
    }

    // 8. Get households for a specific block
    @GetMapping("/households/block/{block}")
    public ResponseEntity<List<Household>> getHouseholdsByBlock(@PathVariable String block) {
        return ResponseEntity.ok(householdRepository.findByBlock(block));
    }

    // 9. Get a single household by tracking ID
    @GetMapping("/households/{houseNumber}")
    public ResponseEntity<Household> getHouseholdById(@PathVariable String houseNumber) {
        Household household = householdRepository.findByHouseNumber(houseNumber)
                .orElseThrow(() -> new RuntimeException("Household not found: " + houseNumber));
        return ResponseEntity.ok(household);
    }

    // 10. Update household details
    @PutMapping("/households/{houseNumber}")
    public ResponseEntity<Household> updateHousehold(@PathVariable String houseNumber,
                                                      @RequestBody Household updated) {
        Household household = householdRepository.findByHouseNumber(houseNumber)
                .orElseThrow(() -> new RuntimeException("Household not found: " + houseNumber));

        household.setBlock(updated.getBlock());
        household.setFlatSizeSqft(updated.getFlatSizeSqft());
        household.setOccupancy(updated.getOccupancy());
        return ResponseEntity.ok(householdRepository.save(household));
    }

    // 11. DELETE a household
    @DeleteMapping("/households/{id}")
    public ResponseEntity<?> deleteHousehold(@PathVariable Long id) {
        householdRepository.deleteById(id);
        return ResponseEntity.ok("Household deleted successfully.");
    }
}