package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.Building;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BuildingRepository extends JpaRepository<Building, Long> {
    List<Building> findByColony_Id(Long colonyId);
    List<Building> findByColony_ColonyNameIgnoreCase(String colonyName);
    boolean existsByBuildingNameIgnoreCaseAndColony_Id(String buildingName, Long colonyId);
}
