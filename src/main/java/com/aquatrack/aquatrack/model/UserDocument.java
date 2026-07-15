package com.aquatrack.aquatrack.model;

import jakarta.persistence.*;

@Entity
@Table(name = "user_documents")
public class UserDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String documentType; // Aadhar, PAN, Utility Bill, Rental Agreement, Passport, etc.

    @Column(nullable = false)
    private String fileName;

    private String fileType;

    @Lob
    @Column(columnDefinition = "LONGBLOB")
    private byte[] fileContent;

    public UserDocument() {}

    public UserDocument(String username, String documentType, String fileName, String fileType, byte[] fileContent) {
        this.username = username;
        this.documentType = documentType;
        this.fileName = fileName;
        this.fileType = fileType;
        this.fileContent = fileContent;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }
    public byte[] getFileContent() { return fileContent; }
    public void setFileContent(byte[] fileContent) { this.fileContent = fileContent; }
}
