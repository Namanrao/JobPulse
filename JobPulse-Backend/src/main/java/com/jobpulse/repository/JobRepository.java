package com.jobpulse.repository;

import com.jobpulse.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    // Find jobs by recruiter (postedBy)
    List<Job> findByPostedById(Long recruiterId);

    // Find active jobs
    List<Job> findByIsActiveTrue();

    // Search jobs by title containing keyword
    List<Job> findByTitleContainingIgnoreCaseAndIsActiveTrue(String keyword);

    // Search jobs by company name
    List<Job> findByCompanyContainingIgnoreCaseAndIsActiveTrue(String company);

    // Find jobs by location
    List<Job> findByLocationContainingIgnoreCaseAndIsActiveTrue(String location);

    // Find jobs by job type
    List<Job> findByJobTypeAndIsActiveTrue(Job.JobType jobType);

    // Find jobs by experience level
    List<Job> findByExperienceLevelAndIsActiveTrue(Job.ExperienceLevel experienceLevel);

    // Find jobs with salary greater than or equal to
    List<Job> findBySalaryGreaterThanEqualAndIsActiveTrue(Double minSalary);

    // Find jobs with salary less than or equal to
    List<Job> findBySalaryLessThanEqualAndIsActiveTrue(Double maxSalary);

    List<Job> findByJobTypeAndExperienceLevelAndIsActiveTrue(Job.JobType jobType, Job.ExperienceLevel experienceLevel);

    List<Job> findBySalaryBetweenAndIsActiveTrue(Double minSalary, Double maxSalary);
    // Complex search with multiple parameters
    @Query("SELECT j FROM Job j WHERE " +
            "(:title IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', :title, '%'))) AND " +
            "(:location IS NULL OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%'))) AND " +
            "(:company IS NULL OR LOWER(j.company) LIKE LOWER(CONCAT('%', :company, '%'))) AND " +
            "(:jobType IS NULL OR j.jobType = :jobType) AND " +
            "(:minSalary IS NULL OR j.salary >= :minSalary) AND " +
            "(:maxSalary IS NULL OR j.salary <= :maxSalary) AND " +
            "j.isActive = true")
    List<Job> searchJobs(@Param("title") String title,
                         @Param("location") String location,
                         @Param("company") String company,
                         @Param("jobType") Job.JobType jobType,
                         @Param("minSalary") Double minSalary,
                         @Param("maxSalary") Double maxSalary);
}