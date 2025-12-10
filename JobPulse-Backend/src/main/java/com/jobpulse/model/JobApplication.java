package com.jobpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "job_applications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne
    @JoinColumn(name = "applicant_id", nullable = false)
    private User applicant;

    @Enumerated(EnumType.STRING)
    private ApplicationStatus status = ApplicationStatus.PENDING;

    private String coverLetter;

    private String resumeUrl; // Optional: applicant can upload a different resume

    private LocalDateTime appliedDate;

    private LocalDateTime reviewedDate;

    @Column(columnDefinition = "TEXT")
    private String notes; // Recruiter's notes about the application

    @PrePersist
    protected void onCreate() {
        appliedDate = LocalDateTime.now();
    }

    // Application status enum
    public enum ApplicationStatus {
        PENDING,
        REVIEWED,
        SHORTLISTED,
        REJECTED,
        ACCEPTED
    }
}