package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {

    List<SupportTicket> findByCreatedByIdOrderByCreatedAtDesc(Long userId);

    List<SupportTicket> findByColonyNameOrderByCreatedAtDesc(String colonyName);

    List<SupportTicket> findByColonyNameAndCreatedByRoleOrderByCreatedAtDesc(String colonyName, String createdByRole);

    @Query("SELECT st FROM SupportTicket st WHERE st.escalatedToSuperAdmin = true OR st.createdByRole = 'ROLE_COMMUNITY_ADMIN' OR st.createdByRole = 'ROLE_ADMIN' ORDER BY st.createdAt DESC")
    List<SupportTicket> findForSuperAdmin();

    List<SupportTicket> findAllByOrderByCreatedAtDesc();

    Optional<SupportTicket> findByTicketNumber(String ticketNumber);

    void deleteByCreatedAtBefore(java.time.LocalDateTime cutoffDate);
}
