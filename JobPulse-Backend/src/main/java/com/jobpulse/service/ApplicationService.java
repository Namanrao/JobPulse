package com.jobpulse.service;

import com.jobpulse.model.Job;
import com.jobpulse.model.JobApplication;
import com.jobpulse.model.User;
import com.jobpulse.repository.JobApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final JobApplicationRepository jobApplicationRepository;

    @Lazy
    private final JobService jobService;

    @Lazy
    private final UserService userService;

    public JobApplication applyForJob(Long jobId, User applicant, String coverLetter, String resumeUrl) {
        // Check if job exists and is active
        Job job = jobService.getJobById(jobId);
        if (!job.isActive()) {
            throw new RuntimeException("Cannot apply for an inactive job");
        }

        // Check if deadline has passed
        if (job.getDeadline() != null && job.getDeadline().isBefore(java.time.LocalDateTime.now())) {
            throw new RuntimeException("Application deadline has passed");
        }

        // Check if user has already applied for this job
        Optional<JobApplication> existingApplication =
                jobApplicationRepository.findByJobIdAndApplicantId(jobId, applicant.getId());
        if (existingApplication.isPresent()) {
            throw new RuntimeException("You have already applied for this job");
        }

        // Create new application
        JobApplication application = new JobApplication();
        application.setJob(job);
        application.setApplicant(applicant);
        application.setCoverLetter(coverLetter);
        application.setResumeUrl(resumeUrl != null ? resumeUrl : applicant.getResumeUrl());
        application.setStatus(JobApplication.ApplicationStatus.PENDING);

        return jobApplicationRepository.save(application);
    }

    public List<JobApplication> getApplicationsByJob(Long jobId, User recruiter) {
        Job job = jobService.getJobById(jobId);

        // Check if the job belongs to the recruiter
        if (!job.getPostedBy().getId().equals(recruiter.getId())) {
            throw new RuntimeException("You are not authorized to view applications for this job");
        }

        return jobApplicationRepository.findByJobId(jobId);
    }

    public List<JobApplication> getApplicationsByApplicant(User applicant) {
        return jobApplicationRepository.findByApplicantId(applicant.getId());
    }

    public JobApplication getApplicationById(Long applicationId) {
        return jobApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found with id: " + applicationId));
    }

    public JobApplication updateApplicationStatus(Long applicationId, JobApplication.ApplicationStatus status,
                                                  String notes, User recruiter) {
        JobApplication application = getApplicationById(applicationId);

        // Check if the recruiter posted the job
        if (!application.getJob().getPostedBy().getId().equals(recruiter.getId())) {
            throw new RuntimeException("You are not authorized to update this application");
        }

        application.setStatus(status);
        application.setNotes(notes);
        application.setReviewedDate(java.time.LocalDateTime.now());

        return jobApplicationRepository.save(application);
    }

    public void withdrawApplication(Long applicationId, User applicant) {
        JobApplication application = getApplicationById(applicationId);

        // Check if the application belongs to the applicant
        if (!application.getApplicant().getId().equals(applicant.getId())) {
            throw new RuntimeException("You are not authorized to withdraw this application");
        }

        // Can only withdraw if status is PENDING
        if (application.getStatus() != JobApplication.ApplicationStatus.PENDING) {
            throw new RuntimeException("Cannot withdraw application after it has been reviewed");
        }

        jobApplicationRepository.delete(application);
    }

    public Long countApplicationsForJob(Long jobId) {
        return jobApplicationRepository.countByJobId(jobId);
    }

    public Long countApplicationsByStatus(Long jobId, JobApplication.ApplicationStatus status) {
        return jobApplicationRepository.countByJobIdAndStatus(jobId, status);
    }
}