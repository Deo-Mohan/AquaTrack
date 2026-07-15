package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, Long> {
    Optional<Invitation> findByToken(String token);
    Optional<Invitation> findByEmail(String email);
    List<Invitation> findByInvitedBy(String invitedBy);
    boolean existsByEmail(String email);
}
