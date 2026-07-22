package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findByHouseNumber(String houseNumber);
    List<Bill> findByHouseNumberOrderByDueDateDesc(String houseNumber);
    List<Bill> findByStatus(String status);
    List<Bill> findByBillingCycleId(Long billingCycleId);
    List<Bill> findByApartmentBlock(String apartmentBlock);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM Bill b WHERE b.houseNumber = :houseNumber AND b.status IN ('UNPAID', 'OVERDUE')")
    Double sumUnpaidByHousehold(@Param("houseNumber") String houseNumber);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM Bill b WHERE b.apartmentBlock = :apartmentBlock AND b.status IN ('UNPAID', 'OVERDUE')")
    Double sumUnpaidByBlock(@Param("apartmentBlock") String apartmentBlock);
}
