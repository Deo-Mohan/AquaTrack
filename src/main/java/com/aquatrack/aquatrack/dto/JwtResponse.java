package com.aquatrack.aquatrack.dto;

public class JwtResponse {
    private String token;
    private String username;
    private String role;
    private String email;
    private String houseNumber;
    private String colonyName;
    private String apartmentBlock;
    private String gender;
    private String fullName;
    private String mobileNumber;
    private String whatsAppNumber;
    private String verificationStatus;
    private String verificationRejectReason;

    public JwtResponse(String token, String username, String role, String email, String houseNumber, String colonyName, String apartmentBlock, String gender, String fullName, String mobileNumber, String whatsAppNumber, String verificationStatus, String verificationRejectReason) {
        this.token = token;
        this.username = username;
        this.role = role;
        this.email = email;
        this.houseNumber = houseNumber;
        this.colonyName = colonyName;
        this.apartmentBlock = apartmentBlock;
        this.gender = gender;
        this.fullName = fullName;
        this.mobileNumber = mobileNumber;
        this.whatsAppNumber = whatsAppNumber;
        this.verificationStatus = verificationStatus;
        this.verificationRejectReason = verificationRejectReason;
    }

    // Getters and Setters
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
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
    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
    public String getVerificationRejectReason() { return verificationRejectReason; }
    public void setVerificationRejectReason(String verificationRejectReason) { this.verificationRejectReason = verificationRejectReason; }
}