package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    List<RefreshToken> findByUsername(String username);
    void deleteByToken(String token);
    void deleteByUsername(String username);
}
