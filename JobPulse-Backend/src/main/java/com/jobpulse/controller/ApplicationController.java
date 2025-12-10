package com.jobpulse.controller;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.jobpulse.dto.responses.ApiResponse;
import com.jobpulse.model.JobApplication;
import com.jobpulse.model.User;
import com.jobpulse.service.ApplicationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // ✅ Add this
public class ApplicationController {

    private final ApplicationService applicationService;

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return (User) authentication.getPrincipal();
    }

    // ✅ DTO class to avoid circular references
    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    static class ApplicationDTO {
        private Long id;
        private Long jobId;
        private String jobTitle;
        private String company;
        private Long applicantId;
        private String applicantName;
        private String applicantEmail;
        private JobApplication.ApplicationStatus status;
        private String coverLetter;
        private String resumeUrl;
        private String appliedDate;
        private String notes;

        public ApplicationDTO(JobApplication application) {
            this.id = application.getId();
            this.jobId = application.getJob().getId();
            this.jobTitle = application.getJob().getTitle();
            this.company = application.getJob().getCompany();
            this.applicantId = application.getApplicant().getId();
            this.applicantName = application.getApplicant().getFullName();
            this.applicantEmail = application.getApplicant().getEmail();
            this.status = application.getStatus();
            this.coverLetter = application.getCoverLetter();
            this.resumeUrl = application.getResumeUrl();
            this.appliedDate = application.getAppliedDate() != null ?
                    application.getAppliedDate().toString() : null;
            this.notes = application.getNotes();
        }
    }

    @PostMapping("/apply/{jobId}")
    public ResponseEntity<ApiResponse> applyForJob(
            @PathVariable Long jobId,
            @RequestParam(required = false) String coverLetter,
            @RequestParam(required = false) String resumeUrl) {
        try {
            User currentUser = getCurrentUser();

            // Check if user is a job seeker
            if (currentUser.getRole() != User.UserRole.JOB_SEEKER) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Only job seekers can apply for jobs"));
            }

            JobApplication application = applicationService.applyForJob(jobId, currentUser, coverLetter, resumeUrl);

            // ✅ Return DTO instead of full entity
            ApplicationDTO dto = new ApplicationDTO(application);

            return ResponseEntity.ok(ApiResponse.success(
                    "Application submitted successfully",
                    dto
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/job/{jobId}")
    public ResponseEntity<ApiResponse> getApplicationsForJob(@PathVariable Long jobId) {
        try {
            User currentUser = getCurrentUser();

            // Check if user is a recruiter
            if (currentUser.getRole() != User.UserRole.RECRUITER) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Only recruiters can view job applications"));
            }

            List<JobApplication> applications = applicationService.getApplicationsByJob(jobId, currentUser);

            // ✅ Convert to DTO to avoid circular references
            List<ApplicationDTO> applicationDTOs = applications.stream()
                    .map(ApplicationDTO::new)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(ApiResponse.success(
                    "Applications retrieved successfully",
                    applicationDTOs
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/my-applications")
    public ResponseEntity<ApiResponse> getMyApplications() {
        try {
            User currentUser = getCurrentUser();

            // Check if user is a job seeker
            if (currentUser.getRole() != User.UserRole.JOB_SEEKER) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Only job seekers can view their applications"));
            }

            List<JobApplication> applications = applicationService.getApplicationsByApplicant(currentUser);

            // ✅ Convert to DTO to avoid circular references
            List<ApplicationDTO> applicationDTOs = applications.stream()
                    .map(ApplicationDTO::new)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(ApiResponse.success(
                    "Your applications retrieved successfully",
                    applicationDTOs
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse> getApplicationById(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            JobApplication application = applicationService.getApplicationById(id);

            // Check if user has permission to view this application
            boolean canView = application.getApplicant().getId().equals(currentUser.getId()) ||
                    application.getJob().getPostedBy().getId().equals(currentUser.getId());

            if (!canView) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("You are not authorized to view this application"));
            }

            // ✅ Return DTO instead of full entity
            ApplicationDTO dto = new ApplicationDTO(application);

            return ResponseEntity.ok(ApiResponse.success(
                    "Application retrieved successfully",
                    dto
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/update-status/{id}")
    public ResponseEntity<ApiResponse> updateApplicationStatus(
            @PathVariable Long id,
            @RequestParam JobApplication.ApplicationStatus status,
            @RequestParam(required = false) String notes) {
        try {
            User currentUser = getCurrentUser();

            // Check if user is a recruiter
            if (currentUser.getRole() != User.UserRole.RECRUITER) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Only recruiters can update application status"));
            }

            JobApplication updatedApplication = applicationService.updateApplicationStatus(id, status, notes, currentUser);

            // ✅ Return DTO instead of full entity
            ApplicationDTO dto = new ApplicationDTO(updatedApplication);

            return ResponseEntity.ok(ApiResponse.success(
                    "Application status updated successfully",
                    dto
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/withdraw/{id}")
    public ResponseEntity<ApiResponse> withdrawApplication(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();

            // Check if user is a job seeker
            if (currentUser.getRole() != User.UserRole.JOB_SEEKER) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Only job seekers can withdraw applications"));
            }

            applicationService.withdrawApplication(id, currentUser);
            return ResponseEntity.ok(ApiResponse.success(
                    "Application withdrawn successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/stats/{jobId}")
    public ResponseEntity<ApiResponse> getApplicationStats(@PathVariable Long jobId) {
        try {
            User currentUser = getCurrentUser();

            // Check if user is a recruiter
            if (currentUser.getRole() != User.UserRole.RECRUITER) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Only recruiters can view application statistics"));
            }

            // Verify recruiter owns the job
            List<JobApplication> applications = applicationService.getApplicationsByJob(jobId, currentUser);

            // Count applications by status
            Map<String, Long> stats = new HashMap<>();
            for (JobApplication.ApplicationStatus status : JobApplication.ApplicationStatus.values()) {
                Long count = applicationService.countApplicationsByStatus(jobId, status);
                stats.put(status.name(), count);
            }

            stats.put("TOTAL", applicationService.countApplicationsForJob(jobId));

            return ResponseEntity.ok(ApiResponse.success(
                    "Application statistics retrieved successfully",
                    stats
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}