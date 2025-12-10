package com.jobpulse.dto.requests;

import com.jobpulse.model.Job;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobPostRequest {

    @NotBlank(message = "Job title is required")
    private String title;

    @NotBlank(message = "Job description is required")
    private String description;

    @NotBlank(message = "Company name is required")
    private String company;

    @NotBlank(message = "Location is required")
    private String location;

    @NotNull(message = "Salary is required")
    private Double salary;

    @NotNull(message = "Job type is required")
    private Job.JobType jobType;

    private Job.ExperienceLevel experienceLevel;

    private String requirements;

    private String responsibilities;

    private LocalDateTime deadline;
}