package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.Household;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HouseholdRepository extends JpaRepository<Household, Long> {
    Optional<Household> findByHouseNumber(String houseNumber);
    List<Household> findByBlock(String block);
    Long countByBlock(String block);
    boolean existsByHouseNumber(String houseNumber);
}