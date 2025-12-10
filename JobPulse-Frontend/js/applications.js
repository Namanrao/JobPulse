// js/applications.js
class ApplicationsManager {
  constructor() {
    this.myApplications = [];
  }

  // Apply for a job
  async applyForJob(jobId, coverLetter = "", resumeUrl = "") {
    try {
      const params = {};
      if (coverLetter) params.coverLetter = coverLetter;
      if (resumeUrl) params.resumeUrl = resumeUrl;

      const response = await api.applyForJob(jobId, params);
      return response;
    } catch (error) {
      console.error("Error applying for job:", error);
      throw error;
    }
  }

  // Get my applications
  async getMyApplications() {
    try {
      const response = await api.getMyApplications();
      this.myApplications = response.data || [];
      return this.myApplications;
    } catch (error) {
      console.error("Error fetching applications:", error);
      return [];
    }
  }

  // Get job applications (for recruiters)
  async getJobApplications(jobId) {
    try {
      const response = await api.getJobApplications(jobId);
      return response.data || [];
    } catch (error) {
      console.error("Error fetching job applications:", error);
      return [];
    }
  }

  // Update application status
  async updateApplicationStatus(applicationId, status, notes = "") {
    try {
      const response = await api.updateApplicationStatus(applicationId, status);
      return response;
    } catch (error) {
      console.error("Error updating application:", error);
      throw error;
    }
  }

  // Withdraw application
  async withdrawApplication(applicationId) {
    try {
      const response = await api.withdrawApplication(applicationId);
      return response;
    } catch (error) {
      console.error("Error withdrawing application:", error);
      throw error;
    }
  }

  // Get application stats
  async getApplicationStats(jobId) {
    try {
      const response = await api.fetchData(`/applications/stats/${jobId}`);
      return response.data || {};
    } catch (error) {
      console.error("Error fetching stats:", error);
      return {};
    }
  }

  // Get application by ID
  async getApplicationById(applicationId) {
    try {
      const response = await api.fetchData(`/applications/${applicationId}`);
      return response.data || null;
    } catch (error) {
      console.error("Error fetching application:", error);
      return null;
    }
  }

  // Check if user has applied for job
  async hasAppliedForJob(jobId) {
    await this.getMyApplications();
    return this.myApplications.some((app) => app.job?.id == jobId);
  }
}

// Global applications manager instance
const applicationsManager = new ApplicationsManager();
