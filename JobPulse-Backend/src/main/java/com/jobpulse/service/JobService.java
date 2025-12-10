package com.jobpulse.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobpulse.dto.requests.JobPostRequest;
import com.jobpulse.dto.responses.JobResponse;
import com.jobpulse.model.Job;
import com.jobpulse.model.JobApplication;
import com.jobpulse.model.User;
import com.jobpulse.repository.JobApplicationRepository;
import com.jobpulse.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final UserService userService;

    @Lazy
    private final SimpMessagingTemplate messagingTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ---------------- CREATE JOB ----------------
    public Job createJob(JobPostRequest jobRequest, User recruiter) {
        Job job = new Job();
        job.setTitle(jobRequest.getTitle());
        job.setDescription(jobRequest.getDescription());
        job.setCompany(jobRequest.getCompany());
        job.setLocation(jobRequest.getLocation());
        job.setSalary(jobRequest.getSalary());
        job.setJobType(jobRequest.getJobType());
        job.setExperienceLevel(jobRequest.getExperienceLevel());
        job.setRequirements(jobRequest.getRequirements());
        job.setResponsibilities(jobRequest.getResponsibilities());
        job.setPostedBy(recruiter);
        job.setDeadline(jobRequest.getDeadline());
        job.setActive(true);

        Job savedJob = jobRepository.save(job);
        sendNewJobNotification(savedJob);
        return savedJob;
    }

    private void sendNewJobNotification(Job job) {
        try {
            if (messagingTemplate == null) return;

            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "NEW_JOB");
            notification.put("title", job.getTitle());
            notification.put("company", job.getCompany());
            notification.put("location", job.getLocation());
            notification.put("jobId", job.getId());
            notification.put("salary", job.getSalary());
            notification.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            notification.put("jobType", job.getJobType().toString());

            String message = objectMapper.writeValueAsString(notification);
            messagingTemplate.convertAndSend("/topic/new-jobs", message);
        } catch (Exception ignored) {}
    }

    // ---------------- GET JOB ----------------
    public Job getJobById(Long id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Job not found with id: " + id));
    }

    public JobResponse getJobResponseById(Long id) {
        Job job = getJobById(id);
        JobResponse response = new JobResponse(job);
        response.setApplicationCount(jobApplicationRepository.countByJobId(id));
        return response;
    }

    public List<JobResponse> getAllActiveJobs() {
        return jobRepository.findByIsActiveTrue().stream()
                .map(job -> {
                    JobResponse response = new JobResponse(job);
                    response.setApplicationCount(jobApplicationRepository.countByJobId(job.getId()));
                    return response;
                }).collect(Collectors.toList());
    }

    public List<JobResponse> getJobsByRecruiter(Long recruiterId) {
        return jobRepository.findByPostedById(recruiterId).stream()
                .map(job -> {
                    JobResponse response = new JobResponse(job);
                    response.setApplicationCount(jobApplicationRepository.countByJobId(job.getId()));
                    return response;
                }).collect(Collectors.toList());
    }

    public List<JobResponse> searchJobs(String title, String location, String company,
                                        Job.JobType jobType, Double minSalary, Double maxSalary) {
        return jobRepository.searchJobs(title, location, company, jobType, minSalary, maxSalary).stream()
                .map(job -> {
                    JobResponse response = new JobResponse(job);
                    response.setApplicationCount(jobApplicationRepository.countByJobId(job.getId()));
                    return response;
                }).collect(Collectors.toList());
    }

    // ---------------- UPDATE JOB ----------------
    public Job updateJob(Long jobId, JobPostRequest jobRequest, User recruiter) {
        Job existingJob = getJobById(jobId);

        if (!existingJob.getPostedBy().getId().equals(recruiter.getId())) {
            throw new RuntimeException("You are not authorized to update this job");
        }

        existingJob.setTitle(jobRequest.getTitle());
        existingJob.setDescription(jobRequest.getDescription());
        existingJob.setCompany(jobRequest.getCompany());
        existingJob.setLocation(jobRequest.getLocation());
        existingJob.setSalary(jobRequest.getSalary());
        existingJob.setJobType(jobRequest.getJobType());
        existingJob.setExperienceLevel(jobRequest.getExperienceLevel());
        existingJob.setRequirements(jobRequest.getRequirements());
        existingJob.setResponsibilities(jobRequest.getResponsibilities());
        existingJob.setDeadline(jobRequest.getDeadline());

        return jobRepository.save(existingJob);
    }

    // ---------------- DELETE JOB ----------------
    @Transactional
    public void deleteJob(Long jobId, User recruiter) {
        Job job = getJobById(jobId);

        if (!job.getPostedBy().getId().equals(recruiter.getId())) {
            throw new RuntimeException("You are not authorized to delete this job");
        }

        try {
            // First, fetch all applications for this job
            List<JobApplication> applications = jobApplicationRepository.findByJobId(jobId);

            // Delete all applications manually if cascade doesn't work
            if (applications != null && !applications.isEmpty()) {
                jobApplicationRepository.deleteAll(applications);
                // Flush to ensure delete operations are executed
                jobApplicationRepository.flush();
            }

            // Then delete the job
            jobRepository.delete(job);

        } catch (Exception e) {
            throw new RuntimeException("Error deleting job with id " + jobId + ": " + e.getMessage());
        }
    }

    // ---------------- TOGGLE JOB STATUS ----------------
    public Job toggleJobStatus(Long jobId, User recruiter) {
        Job job = getJobById(jobId);

        if (!job.getPostedBy().getId().equals(recruiter.getId())) {
            throw new RuntimeException("You are not authorized to update this job");
        }

        job.setActive(!job.isActive());
        if (job.isActive()) sendJobActivatedNotification(job);
        return jobRepository.save(job);
    }

    private void sendJobActivatedNotification(Job job) {
        try {
            if (messagingTemplate == null) return;

            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "JOB_ACTIVATED");
            notification.put("title", job.getTitle());
            notification.put("company", job.getCompany());
            notification.put("jobId", job.getId());
            notification.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

            String message = objectMapper.writeValueAsString(notification);
            messagingTemplate.convertAndSend("/topic/job-updates", message);
        } catch (Exception ignored) {}
    }

    // ---------------- FILTERS ----------------
    public List<JobResponse> getJobsByFilters(Job.JobType jobType, Job.ExperienceLevel experienceLevel,
                                              Double minSalary, Double maxSalary) {
        List<Job> jobs;

        if (jobType != null && experienceLevel != null) {
            jobs = jobRepository.findByJobTypeAndExperienceLevelAndIsActiveTrue(jobType, experienceLevel);
        } else if (jobType != null) {
            jobs = jobRepository.findByJobTypeAndIsActiveTrue(jobType);
        } else if (experienceLevel != null) {
            jobs = jobRepository.findByExperienceLevelAndIsActiveTrue(experienceLevel);
        } else if (minSalary != null && maxSalary != null) {
            jobs = jobRepository.findBySalaryBetweenAndIsActiveTrue(minSalary, maxSalary);
        } else if (minSalary != null) {
            jobs = jobRepository.findBySalaryGreaterThanEqualAndIsActiveTrue(minSalary);
        } else if (maxSalary != null) {
            jobs = jobRepository.findBySalaryLessThanEqualAndIsActiveTrue(maxSalary);
        } else {
            jobs = jobRepository.findByIsActiveTrue();
        }

        return jobs.stream().map(job -> {
            JobResponse response = new JobResponse(job);
            response.setApplicationCount(jobApplicationRepository.countByJobId(job.getId()));
            return response;
        }).collect(Collectors.toList());
    }

    // ---------------- RECENT JOBS ----------------
    public List<Job> getRecentJobs(int hours) {
        LocalDateTime cutoffTime = LocalDateTime.now().minusHours(hours);
        return jobRepository.findAll().stream()
                .filter(job -> job.getCreatedAt() != null && job.getCreatedAt().isAfter(cutoffTime))
                .filter(Job::isActive)
                .collect(Collectors.toList());
    }

    // ---------------- FETCH USER BY EMAIL ----------------
    public Optional<User> findUserByEmail(String email) {
        return userService.getUserByEmail(email) != null ?
                Optional.of(userService.getUserByEmail(email)) :
                Optional.empty();
    }
}