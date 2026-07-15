package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.TariffPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TariffPlanRepository extends JpaRepository<TariffPlan, Long> {
    List<TariffPlan> findByApartmentId(Long apartmentId);
    Optional<TariffPlan> findByApartmentIdAndIsActive(Long apartmentId, Boolean isActive);
    List<TariffPlan> findByIsActive(Boolean isActive);
}
