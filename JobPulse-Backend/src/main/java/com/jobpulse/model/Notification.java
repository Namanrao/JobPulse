package com.jobpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String message;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private boolean isRead = false;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    private Long relatedId; // ID of related job/application

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Notification type enum
    public enum NotificationType {
        NEW_JOB,
        APPLICATION_SUBMITTED,
        APPLICATION_STATUS_CHANGED,
        PROFILE_VIEWED,
        SYSTEM_ALERT
    }
}