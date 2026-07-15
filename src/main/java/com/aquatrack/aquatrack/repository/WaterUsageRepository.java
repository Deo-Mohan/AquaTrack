package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.WaterUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WaterUsageRepository extends JpaRepository<WaterUsageLog, Long> {

    // Find logs for a specific household
    List<WaterUsageLog> findByHouseNumber(String houseNumber);

    // Find logs for a household within a date range (for billing cycles)
    List<WaterUsageLog> findByHouseNumberAndReadingDateBetween(String houseNumber, LocalDate start, LocalDate end);

    // Find logs for an entire apartment block
    List<WaterUsageLog> findByApartmentBlock(String apartmentBlock);

    // Find logs for an apartment block within a date range
    List<WaterUsageLog> findByApartmentBlockAndReadingDateBetween(String apartmentBlock, LocalDate start, LocalDate end);

    // Sum total consumption for a household in a date range
    @Query("SELECT COALESCE(SUM(w.readingLiters), 0) FROM WaterUsageLog w WHERE w.houseNumber = :houseNumber AND w.readingDate BETWEEN :start AND :end")
    Double sumConsumptionByHouseholdAndDateRange(@Param("houseNumber") String houseNumber,
                                                  @Param("start") LocalDate start,
                                                  @Param("end") LocalDate end);

    // Sum total consumption for all households in an apartment block within a date range
    @Query("SELECT COALESCE(SUM(w.readingLiters), 0) FROM WaterUsageLog w WHERE w.apartmentBlock = :block AND w.readingDate BETWEEN :start AND :end")
    Double sumConsumptionByBlockAndDateRange(@Param("block") String block,
                                             @Param("start") LocalDate start,
                                             @Param("end") LocalDate end);

    // Average consumption for a household (for anomaly detection baseline)
    @Query("SELECT COALESCE(AVG(w.readingLiters), 0) FROM WaterUsageLog w WHERE w.houseNumber = :houseNumber")
    Double avgConsumptionByHousehold(@Param("houseNumber") String houseNumber);

    // Standard deviation for anomaly detection (2σ rule)
    @Query("SELECT COALESCE(STDDEV(w.readingLiters), 0) FROM WaterUsageLog w WHERE w.houseNumber = :houseNumber")
    Double stddevConsumptionByHousehold(@Param("houseNumber") String houseNumber);

    // Check for duplicate readings (same household, same date)
    boolean existsByHouseNumberAndReadingDate(String houseNumber, LocalDate readingDate);

    // Get latest reading for a household
    WaterUsageLog findTopByHouseNumberOrderByReadingDateDesc(String houseNumber);
}