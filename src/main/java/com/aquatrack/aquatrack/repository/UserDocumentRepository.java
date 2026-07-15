package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.UserDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserDocumentRepository extends JpaRepository<UserDocument, Long> {
    List<UserDocument> findByUsername(String username);
    Optional<UserDocument> findByUsernameAndDocumentType(String username, String documentType);
    void deleteByUsername(String username);
}
