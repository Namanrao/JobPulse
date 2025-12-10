package com.jobpulse.controller;

import com.jobpulse.dto.requests.JobPostRequest;
import com.jobpulse.dto.responses.ApiResponse;
import com.jobpulse.dto.responses.JobResponse;
import com.jobpulse.model.Job;
import com.jobpulse.model.User;
import com.jobpulse.service.JobService;
import com.jobpulse.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final UserService userService;

    // ✅ FIXED — Correct way to extract user from JWT
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        return userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PostMapping("/create")
    public ResponseEntity<ApiResponse> createJob(@Valid @RequestBody JobPostRequest jobRequest) {
        try {
            User currentUser = getCurrentUser();

            if (currentUser.getRole() != User.UserRole.RECRUITER) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Only recruiters can post jobs"));
            }

            Job job = jobService.createJob(jobRequest, currentUser);

            return ResponseEntity.ok(ApiResponse.success(
                    "Job posted successfully",
                    new JobResponse(job)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse> getJobById(@PathVariable Long id) {
        try {
            JobResponse job = jobService.getJobResponseById(id);
            return ResponseEntity.ok(ApiResponse.success("Job retrieved successfully", job));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse> getAllActiveJobs() {
        return ResponseEntity.ok(
                ApiResponse.success("Active jobs retrieved successfully", jobService.getAllActiveJobs())
        );
    }

    @GetMapping("/my-jobs")
    public ResponseEntity<ApiResponse> getMyJobs() {
        try {
            User currentUser = getCurrentUser();

            if (currentUser.getRole() != User.UserRole.RECRUITER) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Only recruiters can view their posted jobs"));
            }

            return ResponseEntity.ok(
                    ApiResponse.success("Your posted jobs retrieved successfully",
                            jobService.getJobsByRecruiter(currentUser.getId()))
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<ApiResponse> deleteJob(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            jobService.deleteJob(id, currentUser);

            return ResponseEntity.ok(ApiResponse.success("Job deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<ApiResponse> updateJob(
            @PathVariable Long id,
            @Valid @RequestBody JobPostRequest jobRequest) {
        try {
            User currentUser = getCurrentUser();
            Job updatedJob = jobService.updateJob(id, jobRequest, currentUser);

            return ResponseEntity.ok(ApiResponse.success(
                    "Job updated successfully",
                    new JobResponse(updatedJob)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/toggle-status/{id}")
    public ResponseEntity<ApiResponse> toggleJobStatus(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            Job job = jobService.toggleJobStatus(id, currentUser);

            return ResponseEntity.ok(ApiResponse.success(
                    "Job status updated",
                    new JobResponse(job)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
