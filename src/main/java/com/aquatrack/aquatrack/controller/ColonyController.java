package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.Building;
import com.aquatrack.aquatrack.model.Colony;
import com.aquatrack.aquatrack.model.User;
import com.aquatrack.aquatrack.repository.BuildingRepository;
import com.aquatrack.aquatrack.repository.ColonyRepository;
import com.aquatrack.aquatrack.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
public class ColonyController {

    @Autowired
    private ColonyRepository colonyRepository;

    @Autowired
    private BuildingRepository buildingRepository;

    @Autowired
    private UserRepository userRepository;

    // ─────────────────────────────────────────────────────────────────
    // PUBLIC ENDPOINTS (No auth required — for registration dropdowns)
    // ─────────────────────────────────────────────────────────────────

    /** GET all colonies (for registration form colony select) */
    @GetMapping("/api/public/colonies")
    public ResponseEntity<List<Colony>> getAllColoniesPublic() {
        return ResponseEntity.ok(colonyRepository.findAll());
    }

    /** GET buildings for a specific colony (for registration form building select) */
    @GetMapping("/api/public/colonies/{colonyId}/buildings")
    public ResponseEntity<List<Building>> getBuildingsByColonyPublic(@PathVariable Long colonyId) {
        Colony colony = colonyRepository.findById(colonyId)
                .orElseThrow(() -> new RuntimeException("Colony not found with ID: " + colonyId));
        
        List<Building> allBuildings = buildingRepository.findByColony_Id(colonyId);
        List<User> communityAdmins = userRepository.findByRole("ROLE_COMMUNITY_ADMIN");
        
        List<Building> unassignedBuildings = allBuildings.stream()
                .filter(b -> communityAdmins.stream()
                        .noneMatch(admin -> 
                                colony.getColonyName().equalsIgnoreCase(admin.getColonyName()) && 
                                b.getBuildingName().equalsIgnoreCase(admin.getApartmentBlock())
                        )
                )
                .collect(Collectors.toList());
                
        return ResponseEntity.ok(unassignedBuildings);
    }

    // ─────────────────────────────────────────────────────────────────
    // ADMIN ENDPOINTS (Super Admin only colony/building management)
    // ─────────────────────────────────────────────────────────────────

    /** GET all colonies with their buildings (Admin management view) */
    @GetMapping("/api/admin/colonies")
    public ResponseEntity<List<Colony>> getAllColonies() {
        return ResponseEntity.ok(colonyRepository.findAll());
    }

    /** POST create a new colony */
    @PostMapping("/api/admin/colonies")
    public ResponseEntity<?> createColony(@RequestBody Map<String, String> body) {
        String colonyName = body.get("colonyName");
        String address = body.get("address");
        String buildingsString = body.get("buildings");

        if (colonyName == null || colonyName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Colony name is required.");
        }

        if (colonyRepository.existsByColonyNameIgnoreCase(colonyName.trim())) {
            return ResponseEntity.badRequest().body("A colony with this name already exists.");
        }

        Colony colony = new Colony(colonyName.trim(), address != null ? address.trim() : "");
        Colony savedColony = colonyRepository.save(colony);

        if (buildingsString != null && !buildingsString.trim().isEmpty()) {
            String[] bNames = buildingsString.split(",");
            for (String name : bNames) {
                if (!name.trim().isEmpty()) {
                    Building building = new Building(name.trim(), savedColony);
                    buildingRepository.save(building);
                }
            }
        }

        return ResponseEntity.ok(colonyRepository.findById(savedColony.getId()).orElse(savedColony));
    }

    /** PUT update a colony */
    @PutMapping("/api/admin/colonies/{id}")
    public ResponseEntity<?> updateColony(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Colony colony = colonyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colony not found with ID: " + id));

        String colonyName = body.get("colonyName");
        String address = body.get("address");

        if (colonyName != null && !colonyName.trim().isEmpty()) {
            // Check name uniqueness (excluding self)
            colonyRepository.findByColonyNameIgnoreCase(colonyName.trim()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new RuntimeException("A colony with this name already exists.");
                }
            });
            colony.setColonyName(colonyName.trim());
        }
        if (address != null) {
            colony.setAddress(address.trim());
        }

        return ResponseEntity.ok(colonyRepository.save(colony));
    }

    /** DELETE a colony (also deletes all its buildings via cascade) */
    @DeleteMapping("/api/admin/colonies/{id}")
    public ResponseEntity<?> deleteColony(@PathVariable Long id) {
        if (!colonyRepository.existsById(id)) {
            return ResponseEntity.badRequest().body("Colony not found.");
        }
        colonyRepository.deleteById(id);
        return ResponseEntity.ok("Colony and all its buildings deleted successfully.");
    }

    // ─────────────── Building Management ───────────────

    /** POST add a building to a colony */
    @PostMapping("/api/admin/colonies/{colonyId}/buildings")
    public ResponseEntity<?> addBuilding(@PathVariable Long colonyId, @RequestBody Map<String, String> body) {
        Colony colony = colonyRepository.findById(colonyId)
                .orElseThrow(() -> new RuntimeException("Colony not found with ID: " + colonyId));

        String buildingName = body.get("buildingName");
        if (buildingName == null || buildingName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Building name is required.");
        }

        if (buildingRepository.existsByBuildingNameIgnoreCaseAndColony_Id(buildingName.trim(), colonyId)) {
            return ResponseEntity.badRequest().body("A building with this name already exists in this colony.");
        }

        Building building = new Building(buildingName.trim(), colony);
        return ResponseEntity.ok(buildingRepository.save(building));
    }

    /** PUT update a building name */
    @PutMapping("/api/admin/buildings/{id}")
    public ResponseEntity<?> updateBuilding(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Building building = buildingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Building not found with ID: " + id));

        String buildingName = body.get("buildingName");
        if (buildingName != null && !buildingName.trim().isEmpty()) {
            building.setBuildingName(buildingName.trim());
        }

        return ResponseEntity.ok(buildingRepository.save(building));
    }

    /** DELETE a building */
    @DeleteMapping("/api/admin/buildings/{id}")
    public ResponseEntity<?> deleteBuilding(@PathVariable Long id) {
        if (!buildingRepository.existsById(id)) {
            return ResponseEntity.badRequest().body("Building not found.");
        }
        buildingRepository.deleteById(id);
        return ResponseEntity.ok("Building deleted successfully.");
    }
}
