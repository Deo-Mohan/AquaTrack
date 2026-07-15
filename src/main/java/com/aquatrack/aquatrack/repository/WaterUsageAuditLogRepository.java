package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.WaterUsageAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WaterUsageAuditLogRepository extends JpaRepository<WaterUsageAuditLog, Long> {
    List<WaterUsageAuditLog> findByActionTimeAfterOrderByActionTimeDesc(LocalDateTime dateTime);
}
