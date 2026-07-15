package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.Colony;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ColonyRepository extends JpaRepository<Colony, Long> {
    Optional<Colony> findByColonyNameIgnoreCase(String colonyName);
    boolean existsByColonyNameIgnoreCase(String colonyName);
}
