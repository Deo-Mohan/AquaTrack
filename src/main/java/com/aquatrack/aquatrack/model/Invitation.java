package com.aquatrack.aquatrack.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "invitations")
public class Invitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private LocalDateTime expiryDate;

    private String colonyName;

    private String apartmentBlock;

    private String houseNumber;

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, COMPLETED, EXPIRED

    private String invitedBy; // Username of Community Admin

    private String meterId;

    public Invitation() {}

    public Invitation(String email, String fullName, String token, LocalDateTime expiryDate, String colonyName, String apartmentBlock, String houseNumber, String invitedBy) {
        this.email = email;
        this.fullName = fullName;
        this.token = token;
        this.expiryDate = expiryDate;
        this.colonyName = colonyName;
        this.apartmentBlock = apartmentBlock;
        this.houseNumber = houseNumber;
        this.invitedBy = invitedBy;
        this.status = "PENDING";
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiryDate) || "EXPIRED".equalsIgnoreCase(status);
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public LocalDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; }
    public String getColonyName() { return colonyName; }
    public void setColonyName(String colonyName) { this.colonyName = colonyName; }
    public String getApartmentBlock() { return apartmentBlock; }
    public void setApartmentBlock(String apartmentBlock) { this.apartmentBlock = apartmentBlock; }
    public String getHouseNumber() { return houseNumber; }
    public void setHouseNumber(String houseNumber) { this.houseNumber = houseNumber; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getInvitedBy() { return invitedBy; }
    public void setInvitedBy(String invitedBy) { this.invitedBy = invitedBy; }
    public String getMeterId() { return meterId; }
    public void setMeterId(String meterId) { this.meterId = meterId; }
}
