package com.jobpulse.repository;

import com.jobpulse.model.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    // Find applications by job
    List<JobApplication> findByJobId(Long jobId);

    // Find applications by applicant
    List<JobApplication> findByApplicantId(Long applicantId);

    // Find application by job and applicant
    Optional<JobApplication> findByJobIdAndApplicantId(Long jobId, Long applicantId);

    // Count applications for a job
    Long countByJobId(Long jobId);

    // Count applications by status for a job
    Long countByJobIdAndStatus(Long jobId, JobApplication.ApplicationStatus status);

    // Find applications by status
    List<JobApplication> findByStatus(JobApplication.ApplicationStatus status);
    void deleteByJobId(Long jobId);

}