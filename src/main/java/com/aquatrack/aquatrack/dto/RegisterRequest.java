package com.aquatrack.aquatrack.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class RegisterRequest {
    @NotBlank private String username;
    @NotBlank @Email private String email;
    @NotBlank private String password;
    @NotBlank private String role; // "ADMIN" or "RESIDENT"
    private String houseNumber;
    private String colonyName;
    private String apartmentBlock;
    private String gender;
    private String fullName;
    private String mobileNumber;
    private String whatsAppNumber;

    // Getters and Setters
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
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }
    public String getWhatsAppNumber() { return whatsAppNumber; }
    public void setWhatsAppNumber(String whatsAppNumber) { this.whatsAppNumber = whatsAppNumber; }
}