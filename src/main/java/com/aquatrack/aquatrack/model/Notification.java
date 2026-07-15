package com.aquatrack.aquatrack.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Target username (who receives the notification)
    @NotBlank(message = "Target username is required")
    @Column(name = "username")
    private String username;

    // OVERUSE_ALERT, LEAK_DETECTED, BILL_GENERATED, BILLING_CYCLE, SYSTEM, PAYMENT_REMINDER
    @NotBlank(message = "Notification type is required")
    @Column(name = "type")
    private String type;

    @NotBlank(message = "Title is required")
    @Column(name = "title")
    private String title;

    @Column(name = "message", length = 1000)
    private String message;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Optional reference to related entity (e.g., billId, usageLogId)
    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "reference_type")
    private String referenceType; // "BILL", "USAGE_LOG", "BILLING_CYCLE"

    public Notification() {
        this.createdAt = LocalDateTime.now();
    }

    public Notification(String username, String type, String title, String message) {
        this.username = username;
        this.type = type;
        this.title = title;
        this.message = message;
        this.isRead = false;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Long getReferenceId() { return referenceId; }
    public void setReferenceId(Long referenceId) { this.referenceId = referenceId; }
    public String getReferenceType() { return referenceType; }
    public void setReferenceType(String referenceType) { this.referenceType = referenceType; }
}
