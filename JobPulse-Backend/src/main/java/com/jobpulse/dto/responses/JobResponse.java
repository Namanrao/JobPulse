package com.jobpulse.dto.responses;

import com.jobpulse.model.Job;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobResponse {

    private Long id;
    private String title;
    private String description;
    private String company;
    private String location;
    private Double salary;
    private Job.JobType jobType;
    private Job.ExperienceLevel experienceLevel;
    private String requirements;
    private String responsibilities;
    private String postedBy; // Recruiter name
    private Long postedById; // Recruiter ID
    private LocalDateTime deadline;
    private LocalDateTime createdAt;
    private boolean isActive;

    // Application count (will be populated separately)
    private Long applicationCount;

    // Constructor to convert Job entity to JobResponse
    public JobResponse(Job job) {
        this.id = job.getId();
        this.title = job.getTitle();
        this.description = job.getDescription();
        this.company = job.getCompany();
        this.location = job.getLocation();
        this.salary = job.getSalary();
        this.jobType = job.getJobType();
        this.experienceLevel = job.getExperienceLevel();
        this.requirements = job.getRequirements();
        this.responsibilities = job.getResponsibilities();
        this.postedBy = job.getPostedBy().getFullName();
        this.postedById = job.getPostedBy().getId();
        this.deadline = job.getDeadline();
        this.createdAt = job.getCreatedAt();
        this.isActive = job.isActive();
    }
}