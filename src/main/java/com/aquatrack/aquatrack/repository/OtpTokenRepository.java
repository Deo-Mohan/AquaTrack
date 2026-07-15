package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {
    Optional<OtpToken> findTopByEmailAndOtpCodeOrderByCreatedAtDesc(String email, String otpCode);
    Optional<OtpToken> findTopByEmailOrderByCreatedAtDesc(String email);
    List<OtpToken> findByEmail(String email);
}
