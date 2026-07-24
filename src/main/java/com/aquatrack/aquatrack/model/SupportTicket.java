package com.aquatrack.aquatrack.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "support_tickets")
public class SupportTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String ticketNumber; // e.g. TICK-1002

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(nullable = false)
    private String category; // BILLING, METER_FAULT, LEAKAGE, TANKER_PURCHASE, TARIFF_PLAN, SYSTEM_BUG, OTHER

    @Column(nullable = false)
    private String priority = "MEDIUM"; // LOW, MEDIUM, HIGH, URGENT

    @Column(nullable = false)
    private String status = "OPEN"; // OPEN, IN_PROGRESS, ESCALATED_TO_SUPER_ADMIN, RESOLVED, CLOSED

    private String createdByRole; // ROLE_RESIDENT, ROLE_COMMUNITY_ADMIN
    private String createdByName;
    private String createdByEmail;
    private String houseNumber;
    private String colonyName; // Community Name

    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"password", "otp", "otpExpiry"})
    private User createdBy;

    private boolean escalatedToSuperAdmin = false;
    private String escalatedByName;
    
    @Column(columnDefinition = "TEXT")
    private String escalationReason;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
    private LocalDateTime resolvedAt;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<TicketReply> replies = new ArrayList<>();

    public SupportTicket() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTicketNumber() { return ticketNumber; }
    public void setTicketNumber(String ticketNumber) { this.ticketNumber = ticketNumber; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedByRole() { return createdByRole; }
    public void setCreatedByRole(String createdByRole) { this.createdByRole = createdByRole; }

    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }

    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }

    public String getHouseNumber() { return houseNumber; }
    public void setHouseNumber(String houseNumber) { this.houseNumber = houseNumber; }

    public String getColonyName() { return colonyName; }
    public void setColonyName(String colonyName) { this.colonyName = colonyName; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public boolean isEscalatedToSuperAdmin() { return escalatedToSuperAdmin; }
    public void setEscalatedToSuperAdmin(boolean escalatedToSuperAdmin) { this.escalatedToSuperAdmin = escalatedToSuperAdmin; }

    public String getEscalatedByName() { return escalatedByName; }
    public void setEscalatedByName(String escalatedByName) { this.escalatedByName = escalatedByName; }

    public String getEscalationReason() { return escalationReason; }
    public void setEscalationReason(String escalationReason) { this.escalationReason = escalationReason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public List<TicketReply> getReplies() { return replies; }
    public void setReplies(List<TicketReply> replies) { this.replies = replies; }
}
