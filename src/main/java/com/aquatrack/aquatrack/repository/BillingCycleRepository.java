package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.BillingCycle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillingCycleRepository extends JpaRepository<BillingCycle, Long> {
    List<BillingCycle> findByApartmentId(Long apartmentId);
    List<BillingCycle> findByApartmentIdAndStatus(Long apartmentId, String status);
    Optional<BillingCycle> findTopByApartmentIdAndStatusOrderByStartDateDesc(Long apartmentId, String status);
}
