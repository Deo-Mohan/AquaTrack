package com.aquatrack.aquatrack.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    @Column(unique = true, nullable = false)
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters long")
    @Column(nullable = false)
    private String password;

    @NotBlank(message = "Role is required")
    private String role; // Will store "ROLE_ADMIN" or "ROLE_RESIDENT"

    private String houseNumber;

    private String colonyName;

    private String apartmentBlock;

    private String gender;

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @Column(nullable = false)
    private String verificationStatus = "NOT_SUBMITTED"; // NOT_SUBMITTED, PENDING, VERIFIED, REJECTED

    private String verificationRejectReason;

    private Double waterRatePerLiter;

    private String fullName;

    private String mobileNumber;

    private String whatsAppNumber;

    public User() {}

    public User(String username, String email, String password, String role, String houseNumber, String colonyName, String apartmentBlock, String gender) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.role = role;
        this.houseNumber = houseNumber;
        this.colonyName = colonyName;
        this.apartmentBlock = apartmentBlock;
        this.gender = gender;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getHouseNumber() { return houseNumber; }
    public void setHouseNumber(String houseNumber) { this.houseNumber = houseNumber; }
    public String getColonyName() { return colonyName; }
    public void setColonyName(String colonyName) { this.colonyName = colonyName; }
    public String getApartmentBlock() { return apartmentBlock; }
    public void setApartmentBlock(String apartmentBlock) { this.apartmentBlock = apartmentBlock; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
    public String getVerificationRejectReason() { return verificationRejectReason; }
    public void setVerificationRejectReason(String verificationRejectReason) { this.verificationRejectReason = verificationRejectReason; }
    public Double getWaterRatePerLiter() { return waterRatePerLiter; }
    public void setWaterRatePerLiter(Double waterRatePerLiter) { this.waterRatePerLiter = waterRatePerLiter; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }
    public String getWhatsAppNumber() { return whatsAppNumber; }
    public void setWhatsAppNumber(String whatsAppNumber) { this.whatsAppNumber = whatsAppNumber; }
}