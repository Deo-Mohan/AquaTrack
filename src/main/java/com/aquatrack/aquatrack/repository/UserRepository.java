package com.aquatrack.aquatrack.repository;

import com.aquatrack.aquatrack.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByUsernameIgnoreCase(String username);
    Optional<User> findByEmailIgnoreCase(String email);
    Boolean existsByUsername(String username);
    Boolean existsByUsernameIgnoreCase(String username);
    Boolean existsByEmail(String email);
    Boolean existsByEmailIgnoreCase(String email);
    List<User> findByRole(String role);
    List<User> findByApartmentBlock(String apartmentBlock);
    List<User> findByRoleAndApartmentBlock(String role, String apartmentBlock);
    Optional<User> findByHouseNumber(String houseNumber);
    Long countByRole(String role);
    Long countByApartmentBlock(String apartmentBlock);

    @Query("SELECT COUNT(u) FROM User u WHERE (u.status IS NULL OR u.status = '' OR u.status = 'APPROVED')")
    long countApprovedUsers();

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND (u.status IS NULL OR u.status = '' OR u.status = 'APPROVED')")
    long countApprovedByRole(@Param("role") String role);

    @Query("SELECT COUNT(u) FROM User u WHERE (u.role = 'ROLE_RESIDENT' OR u.role = 'ROLE_HOUSEHOLD_USER') AND (u.status IS NULL OR u.status = '' OR u.status = 'APPROVED')")
    long countApprovedHouseholdUsers();

    @Query("SELECT COUNT(u) FROM User u WHERE (u.role = 'ROLE_RESIDENT' OR u.role = 'ROLE_HOUSEHOLD_USER') AND u.apartmentBlock = :block AND (u.status IS NULL OR u.status = '' OR u.status = 'APPROVED')")
    long countApprovedHouseholdUsersByBlock(@Param("block") String block);
}