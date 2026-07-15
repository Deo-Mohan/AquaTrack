package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.BulkWaterPurchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BulkWaterPurchaseRepository extends JpaRepository<BulkWaterPurchase, Long> {
    List<BulkWaterPurchase> findByApartmentId(Long apartmentId);
    List<BulkWaterPurchase> findByApartmentIdAndPurchaseDateBetween(Long apartmentId, LocalDate start, LocalDate end);
    List<BulkWaterPurchase> findByBillingCycleId(Long billingCycleId);
}
