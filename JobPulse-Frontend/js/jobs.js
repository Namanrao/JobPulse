// js/jobs.js
class JobsManager {
  constructor() {
    this.currentJobs = [];
    this.currentFilters = {};
  }

  // Fetch all active jobs
  async fetchJobs() {
    try {
      const response = await api.getAllJobs();
      this.currentJobs = response.data || [];
      return this.currentJobs;
    } catch (error) {
      console.error("Error fetching jobs:", error);
      this.showError("Failed to load jobs. Please try again.");
      return [];
    }
  }

  // Search jobs with filters
  async searchJobs(searchTerm = "", filters = {}) {
    try {
      const params = {};

      if (searchTerm) {
        params.title = searchTerm;
      }

      // Add other filters
      if (filters.location) params.location = filters.location;
      if (filters.company) params.company = filters.company;
      if (filters.jobType) params.jobType = filters.jobType;
      if (filters.minSalary) params.minSalary = filters.minSalary;
      if (filters.maxSalary) params.maxSalary = filters.maxSalary;

      const response = await api.searchJobs(params);
      this.currentJobs = response.data || [];
      return this.currentJobs;
    } catch (error) {
      console.error("Error searching jobs:", error);
      this.showError("Search failed. Please try again.");
      return [];
    }
  }

  // Filter jobs by criteria
  async filterJobs(filters = {}) {
    try {
      const params = {};

      if (filters.jobType) params.jobType = filters.jobType;
      if (filters.experienceLevel)
        params.experienceLevel = filters.experienceLevel;
      if (filters.minSalary) params.minSalary = filters.minSalary;
      if (filters.maxSalary) params.maxSalary = filters.maxSalary;

      const response = await api.filterJobs(params);
      this.currentJobs = response.data || [];
      return this.currentJobs;
    } catch (error) {
      console.error("Error filtering jobs:", error);
      this.showError("Filtering failed. Please try again.");
      return [];
    }
  }

  // Get job by ID
  async getJobById(jobId) {
    try {
      const response = await api.getJobById(jobId);
      return response.data || null;
    } catch (error) {
      console.error("Error fetching job:", error);
      this.showError("Failed to load job details.");
      return null;
    }
  }

  // Apply for a job
  async applyForJob(jobId, coverLetter = "", resumeUrl = "") {
    try {
      const data = {};
      if (coverLetter) data.coverLetter = coverLetter;
      if (resumeUrl) data.resumeUrl = resumeUrl;

      const response = await api.applyForJob(jobId, data);
      return response;
    } catch (error) {
      console.error("Error applying for job:", error);
      throw error;
    }
  }

  // Show error message
  showError(message) {
    const alertContainer = document.getElementById("alertContainer");
    if (alertContainer) {
      alertContainer.innerHTML = `
                <div class="alert alert-error">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>${message}</span>
                        <button onclick="this.parentElement.parentElement.remove()" 
                                style="background: none; border: none; color: inherit; cursor: pointer;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
    }
  }

  // Clear error
  clearError() {
    const alertContainer = document.getElementById("alertContainer");
    if (alertContainer) {
      alertContainer.innerHTML = "";
    }
  }
}

// Global jobs manager instance
const jobsManager = new JobsManager();
