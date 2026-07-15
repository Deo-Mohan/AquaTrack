package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.Apartment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, Long> {
    Apartment findByName(String name);
}