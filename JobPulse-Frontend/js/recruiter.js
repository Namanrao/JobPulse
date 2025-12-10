// js/recruiter.js - FIXED VERSION
class RecruiterDashboard {
  constructor() {
    this.currentUser = null;
    this.jobsCache = null; // Cache jobs to avoid multiple API calls
    this.isInitialized = false; // Prevent multiple initializations
    this.init();
  }

  async init() {
    // Prevent multiple initializations
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    // Check authentication and role
    this.currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!this.currentUser) {
      window.location.href = "login.html";
      return;
    }

    if (this.currentUser.role !== "RECRUITER") {
      alert("Access denied. This page is for recruiters only.");
      window.location.href = "jobs.html";
      return;
    }

    // Update user name in navbar
    if (this.currentUser.fullName) {
      const userNameElement = document.getElementById("userName");
      if (userNameElement) {
        userNameElement.textContent = this.currentUser.fullName;
      }
    }

    // Load dashboard data with error handling
    try {
      await this.loadDashboard();
    } catch (error) {
      console.error("Error in dashboard initialization:", error);
      this.showError(
        "Failed to initialize dashboard. Please refresh the page."
      );
    }

    this.setupEventListeners();
    this.setupModals();

    // Setup WebSocket with delay to ensure page is stable
    setTimeout(() => {
      this.setupWebSocket();
    }, 1000);
  }

  async loadDashboard() {
    try {
      // Show loading states
      this.showLoading();

      // Fetch jobs once and cache them
      const jobs = await this.fetchMyJobs();
      this.jobsCache = jobs;

      // Calculate stats from cached jobs
      const stats = await this.calculateDashboardStats(jobs);

      this.displayJobs(jobs);
      this.updateStats(stats);
      await this.loadRecentApplications(jobs);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      this.showError("Failed to load dashboard data. Please try again.");
      throw error;
    }
  }

  async fetchMyJobs() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_BASE_URL}/jobs/my-jobs`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem("token");
        localStorage.removeItem("currentUser");
        window.location.href = "login.html";
        return [];
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error("Error fetching jobs:", error);
      if (error.message.includes("401")) {
        window.location.href = "login.html";
      }
      return [];
    }
  }

  async calculateDashboardStats(jobs) {
    try {
      if (!jobs || jobs.length === 0) {
        return {
          activeJobs: 0,
          totalApplications: 0,
          shortlistedCount: 0,
          pendingReview: 0,
        };
      }

      let totalApplications = 0;
      let pendingReview = 0;
      let shortlistedCount = 0;

      // Limit to first 3 jobs for performance
      const jobsToCheck = jobs.slice(0, 3);

      for (const job of jobsToCheck) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/applications/job/${job.id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const result = await response.json();
            const applications = result.data || [];
            totalApplications += applications.length;

            applications.forEach((app) => {
              if (app.status === "PENDING") pendingReview++;
              if (app.status === "SHORTLISTED") shortlistedCount++;
            });
          }
        } catch (error) {
          console.error(
            `Error fetching applications for job ${job.id}:`,
            error
          );
          // Continue with other jobs
        }
      }

      const activeJobs = jobs.filter((job) => job.active).length;

      return {
        activeJobs,
        totalApplications,
        shortlistedCount,
        pendingReview,
      };
    } catch (error) {
      console.error("Error calculating stats:", error);
      return {
        activeJobs: 0,
        totalApplications: 0,
        shortlistedCount: 0,
        pendingReview: 0,
      };
    }
  }

  async loadRecentApplications(jobs = null) {
    try {
      const jobsToUse = jobs || this.jobsCache;
      if (!jobsToUse || jobsToUse.length === 0) {
        this.displayRecentApplications([]);
        return;
      }

      let allApplications = [];

      // Get applications for first 3 active jobs
      const activeJobs = jobsToUse.filter((job) => job.active).slice(0, 3);

      for (const job of activeJobs) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/applications/job/${job.id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const result = await response.json();
            const applications = result.data || [];

            // Add job title to each application
            applications.forEach((app) => {
              app.jobTitle = job.title;
              allApplications.push(app);
            });
          }
        } catch (error) {
          console.error(`Error loading applications for job ${job.id}:`, error);
          // Continue with other jobs
        }
      }

      // Sort by latest and take top 5
      allApplications.sort(
        (a, b) => new Date(b.appliedAt) - new Date(a.appliedAt)
      );
      this.displayRecentApplications(allApplications.slice(0, 5));
    } catch (error) {
      console.error("Error loading recent applications:", error);
      this.displayRecentApplications([]);
    }
  }

  setupWebSocket() {
    console.log("Setting up WebSocket connection...");

    // Check if we should connect WebSocket
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (user.role !== "RECRUITER") {
      console.log("Not a recruiter, skipping WebSocket");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No token for WebSocket");
      return;
    }

    // Don't connect if already connected
    if (window.webSocketState && window.webSocketState.connected) {
      console.log("WebSocket already connected");
      return;
    }

    try {
      console.log("Creating SockJS connection...");
      // Create SockJS connection
      const socket = new SockJS("http://localhost:8080/ws");
      const stompClient = Stomp.over(socket);

      // Disable debug to prevent console spam
      stompClient.debug = null;

      // Connect headers with token
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      console.log("Connecting to STOMP server...");
      stompClient.connect(
        headers,
        // On successful connection
        (frame) => {
          console.log("✅ STOMP Connected successfully:", frame);
          window.webSocketState = {
            connected: true,
            stompClient: stompClient,
            subscriptions: [],
          };

          // Get user ID
          const userId = this.currentUser?.id || user.id;
          if (!userId) {
            console.warn("No user ID found for WebSocket subscription");
            return;
          }

          console.log(`Subscribing to notifications for user ${userId}...`);

          // Subscribe to user-specific notifications
          try {
            const userSubscription = stompClient.subscribe(
              `/user/queue/notifications`,
              (message) => {
                try {
                  const notification = JSON.parse(message.body);
                  console.log("📩 User notification received:", notification);

                  // Show notification
                  this.showSuccess(
                    `${notification.message || "New notification"}`
                  );

                  // Refresh dashboard if it's a new application
                  if (notification.type === "NEW_APPLICATION") {
                    console.log(
                      "New application detected, refreshing dashboard..."
                    );
                    setTimeout(() => {
                      this.refreshDashboard();
                    }, 1000);
                  }
                } catch (error) {
                  console.error("Error parsing notification:", error);
                }
              }
            );
            window.webSocketState.subscriptions.push(userSubscription);

            // Subscribe to general recruiter notifications
            const topicSubscription = stompClient.subscribe(
              "/topic/recruiters",
              (message) => {
                try {
                  const notification = JSON.parse(message.body);
                  console.log(
                    "📢 General recruiter notification:",
                    notification
                  );

                  // Check if this notification is for current user
                  const currentUserId = this.currentUser?.id || user.id;
                  if (
                    !notification.recruiterId ||
                    notification.recruiterId == currentUserId
                  ) {
                    this.showSuccess(
                      `${notification.message || "Notification"}`
                    );
                  }
                } catch (error) {
                  console.error("Error parsing notification:", error);
                }
              }
            );
            window.webSocketState.subscriptions.push(topicSubscription);

            console.log("✅ WebSocket subscriptions created successfully");
            this.showSuccess("Real-time notifications enabled!");

            // Enable test button
            const testBtn = document.getElementById("testNotificationBtn");
            if (testBtn) {
              testBtn.style.display = "inline-block";
            }
          } catch (subscribeError) {
            console.error("Error creating subscriptions:", subscribeError);
          }
        },
        // On error
        (error) => {
          console.error("❌ STOMP connection error:", error);
          if (window.webSocketState) {
            window.webSocketState.connected = false;
          }

          // Try to reconnect after delay
          setTimeout(() => {
            if (!window.webSocketState || !window.webSocketState.connected) {
              console.log("Attempting to reconnect WebSocket in 10 seconds...");
              setTimeout(() => {
                this.setupWebSocket();
              }, 10000);
            }
          }, 1000);
        }
      );

      // Store stomp client globally for cleanup
      window.stompClient = stompClient;

      // Cleanup on page unload
      window.addEventListener("beforeunload", () => {
        if (stompClient && stompClient.connected) {
          console.log("Disconnecting WebSocket on page unload...");
          stompClient.disconnect();
        }
      });
    } catch (error) {
      console.error("Failed to setup WebSocket:", error);
      if (window.webSocketState) {
        window.webSocketState.connected = false;
      }
    }
  }

  // Add test notification function
  testNotification() {
    console.log("Testing notification...");

    if (window.stompClient && window.stompClient.connected) {
      // Create test notification
      const testNotification = {
        type: "TEST",
        message: "WebSocket test notification from dashboard",
        timestamp: new Date().toISOString(),
        recruiterId: this.currentUser?.id,
      };

      try {
        // Try to send via WebSocket
        window.stompClient.send(
          "/app/notify",
          {},
          JSON.stringify(testNotification)
        );
        console.log("✅ Test notification sent via WebSocket");
        this.showSuccess("Test notification sent!");
      } catch (error) {
        console.error("❌ Error sending test notification:", error);
        this.showError("Failed to send test notification: " + error.message);
      }
    } else {
      console.warn("WebSocket not connected for test");
      this.showError(
        "WebSocket not connected. Please wait a moment and try again."
      );
    }
  }

  displayJobs(jobs) {
    const container = document.getElementById("jobsContainer");
    if (!container) return;

    if (!jobs || jobs.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-briefcase"></i>
                    <h3>No Jobs Posted Yet</h3>
                    <p>You haven't posted any jobs yet. Start by posting your first job!</p>
                    <button id="createFirstJobBtn" class="btn btn-primary">
                        <i class="fas fa-plus-circle"></i> Post Your First Job
                    </button>
                </div>
            `;

      // Add event listener to the button
      setTimeout(() => {
        const firstJobBtn = document.getElementById("createFirstJobBtn");
        if (firstJobBtn) {
          firstJobBtn.addEventListener("click", () => {
            const createJobBtn = document.getElementById("createJobBtn");
            if (createJobBtn) {
              createJobBtn.click();
            }
          });
        }
      }, 100);
      return;
    }

    let html = "";
    jobs.forEach((job) => {
      const statusClass = job.active ? "active" : "closed";
      const statusText = job.active ? "Active" : "Closed";

      html += `
                <div class="job-item" data-job-id="${job.id}">
                    <div class="job-info">
                        <div class="job-header">
                            <h3>${job.title}</h3>
                            <span class="job-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="job-meta">
                            <span><i class="fas fa-building"></i> ${
                              job.company
                            }</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${
                              job.location
                            }</span>
                            <span><i class="fas fa-money-bill-wave"></i> ₹${this.formatSalary(
                              job.salary
                            )}</span>
                            <span><i class="fas fa-users"></i> ${
                              job.applicationCount || 0
                            } applications</span>
                        </div>
                        <p class="job-desc">${job.description.substring(
                          0,
                          150
                        )}...</p>
                    </div>
                    <div class="job-actions">
                        <button class="btn-icon view-applications" title="View Applications">
                            <i class="fas fa-users"></i>
                            <span>Applications</span>
                        </button>
                        <button class="btn-icon edit-job" title="Edit Job">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon toggle-status" title="${
                          job.active ? "Deactivate" : "Activate"
                        }">
                            <i class="fas ${
                              job.active ? "fa-pause" : "fa-play"
                            }"></i>
                        </button>
                        <button class="btn-icon delete-job" title="Delete Job">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
    });

    container.innerHTML = html;

    // Add event listeners to job items
    this.addJobItemEventListeners();
  }

  displayRecentApplications(applications) {
    const container = document.getElementById("recentApplications");
    if (!container) return;

    if (!applications || applications.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h3>No Applications Yet</h3>
                    <p>Applications from job seekers will appear here.</p>
                </div>
            `;
      return;
    }

    let html = "";
    applications.forEach((app) => {
      const statusClass = this.getStatusClass(app.status);
      const statusText =
        app.status.charAt(0) + app.status.slice(1).toLowerCase();

      html += `
                <div class="application-card">
                    <div class="app-header">
                        <div class="app-user">
                            <div class="user-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="user-info">
                                <h4>${
                                  app.applicant?.fullName || "Applicant"
                                }</h4>
                                <p>${app.jobTitle || "Job"}</p>
                            </div>
                        </div>
                        <span class="app-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="app-content">
                        ${
                          app.coverLetter
                            ? `<p class="app-cover-letter">${app.coverLetter.substring(
                                0,
                                100
                              )}...</p>`
                            : ""
                        }
                        <div class="app-meta">
                            <span><i class="fas fa-calendar"></i> ${new Date(
                              app.appliedAt
                            ).toLocaleDateString()}</span>
                            ${
                              app.resumeUrl
                                ? `<a href="${app.resumeUrl}" target="_blank" class="resume-link"><i class="fas fa-file-pdf"></i> View Resume</a>`
                                : ""
                            }
                        </div>
                    </div>
                    <div class="app-actions">
                        <button class="btn-text view-application" data-app-id="${
                          app.id
                        }">
                            View Details
                        </button>
                    </div>
                </div>
            `;
    });

    container.innerHTML = html;

    // Add event listeners to view buttons
    document.querySelectorAll(".view-application").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const appId = e.target.dataset.appId;
        this.viewApplicationDetails(appId);
      });
    });
  }

  async viewApplicationDetails(appId) {
    try {
      const response = await fetch(`${API_BASE_URL}/applications/${appId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch application details");
      }

      const result = await response.json();
      const application = result.data;

      // Show application in modal
      this.showApplicationModal(application);
    } catch (error) {
      console.error("Error viewing application:", error);
      this.showError("Failed to load application details");
    }
  }

  showApplicationModal(application) {
    // Create modal HTML for application details
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Application Details</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="application-details">
                        <div class="applicant-info">
                            <div class="applicant-header">
                                <div class="applicant-avatar-large">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div>
                                    <h3>${
                                      application.applicant?.fullName ||
                                      "Applicant"
                                    }</h3>
                                    <p>${application.applicant?.email || ""}</p>
                                </div>
                            </div>
                            
                            <div class="info-section">
                                <h4><i class="fas fa-briefcase"></i> Applied For</h4>
                                <p>${application.job?.title || "Job"}</p>
                            </div>
                            
                            ${
                              application.coverLetter
                                ? `
                            <div class="info-section">
                                <h4><i class="fas fa-envelope"></i> Cover Letter</h4>
                                <p>${application.coverLetter}</p>
                            </div>
                            `
                                : ""
                            }
                            
                            ${
                              application.resumeUrl
                                ? `
                            <div class="info-section">
                                <h4><i class="fas fa-file"></i> Resume</h4>
                                <a href="${application.resumeUrl}" target="_blank" class="btn btn-secondary">
                                    <i class="fas fa-download"></i> Download Resume
                                </a>
                            </div>
                            `
                                : ""
                            }
                            
                            <div class="info-section">
                                <h4><i class="fas fa-info-circle"></i> Application Status</h4>
                                <div class="status-control">
                                    <span class="status-badge ${this.getStatusClass(
                                      application.status
                                    )}">
                                        ${
                                          application.status.charAt(0) +
                                          application.status
                                            .slice(1)
                                            .toLowerCase()
                                        }
                                    </span>
                                    <select id="updateStatus" class="status-select">
                                        <option value="PENDING" ${
                                          application.status === "PENDING"
                                            ? "selected"
                                            : ""
                                        }>Pending</option>
                                        <option value="REVIEWED" ${
                                          application.status === "REVIEWED"
                                            ? "selected"
                                            : ""
                                        }>Reviewed</option>
                                        <option value="SHORTLISTED" ${
                                          application.status === "SHORTLISTED"
                                            ? "selected"
                                            : ""
                                        }>Shortlisted</option>
                                        <option value="ACCEPTED" ${
                                          application.status === "ACCEPTED"
                                            ? "selected"
                                            : ""
                                        }>Accepted</option>
                                        <option value="REJECTED" ${
                                          application.status === "REJECTED"
                                            ? "selected"
                                            : ""
                                        }>Rejected</option>
                                    </select>
                                    <button id="updateStatusBtn" class="btn btn-primary" data-app-id="${
                                      application.id
                                    }">
                                        Update Status
                                    </button>
                                </div>
                                <div class="status-notes">
                                    <textarea id="statusNotes" placeholder="Add notes about this application...">${
                                      application.notes || ""
                                    }</textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Add event listeners
    const closeBtn = modal.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.remove();
      });
    }

    const updateBtn = modal.querySelector("#updateStatusBtn");
    if (updateBtn) {
      updateBtn.addEventListener("click", async (e) => {
        const appId = e.target.dataset.appId;
        const status = modal.querySelector("#updateStatus").value;
        const notes = modal.querySelector("#statusNotes").value;

        await this.updateApplicationStatus(appId, status, notes);
        modal.remove();
        this.refreshDashboard(); // Use refresh instead of load
      });
    }

    // Show modal
    setTimeout(() => modal.classList.add("show"), 10);
  }

  async updateApplicationStatus(appId, status, notes = "") {
    try {
      const response = await fetch(
        `${API_BASE_URL}/applications/update-status/${appId}?status=${status}&notes=${encodeURIComponent(
          notes
        )}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      this.showSuccess("Application status updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating status:", error);
      this.showError("Failed to update application status");
      return false;
    }
  }

  addJobItemEventListeners() {
    // View Applications button
    document.querySelectorAll(".view-applications").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const jobItem = e.target.closest(".job-item");
        const jobId = jobItem.dataset.jobId;
        this.viewJobApplications(jobId);
      });
    });

    // Edit Job button
    document.querySelectorAll(".edit-job").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const jobItem = e.target.closest(".job-item");
        const jobId = jobItem.dataset.jobId;
        this.editJob(jobId);
      });
    });

    // Toggle Status button
    document.querySelectorAll(".toggle-status").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const jobItem = e.target.closest(".job-item");
        const jobId = jobItem.dataset.jobId;
        await this.toggleJobStatus(jobId);
      });
    });

    // Delete Job button
    document.querySelectorAll(".delete-job").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const jobItem = e.target.closest(".job-item");
        const jobId = jobItem.dataset.jobId;
        this.deleteJob(jobId);
      });
    });
  }

  async viewJobApplications(jobId) {
    try {
      // Fetch job details first
      const jobResponse = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (!jobResponse.ok) {
        throw new Error("Failed to fetch job details");
      }

      const jobResult = await jobResponse.json();
      const job = jobResult.data;

      // Fetch applications for this job
      const appsResponse = await fetch(
        `${API_BASE_URL}/applications/job/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!appsResponse.ok) {
        throw new Error("Failed to fetch applications");
      }

      const appsResult = await appsResponse.json();
      const applications = appsResult.data || [];

      this.showApplicationsModal(job, applications);
    } catch (error) {
      console.error("Error viewing applications:", error);
      this.showError("Failed to load applications");
    }
  }

  showApplicationsModal(job, applications) {
    const modal = document.getElementById("applicationsModal");
    const modalTitle = document.getElementById("modalJobTitle");
    const appsList = document.getElementById("applicationsList");

    if (!modal || !modalTitle || !appsList) return;

    modalTitle.textContent = `Applications for ${job.title}`;

    if (!applications || applications.length === 0) {
      appsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h3>No Applications Yet</h3>
                    <p>No one has applied for this job yet.</p>
                </div>
            `;
    } else {
      let html = "";

      // Group applications by status
      const groupedByStatus = {};
      applications.forEach((app) => {
        if (!groupedByStatus[app.status]) {
          groupedByStatus[app.status] = [];
        }
        groupedByStatus[app.status].push(app);
      });

      // Display applications grouped by status
      Object.keys(groupedByStatus).forEach((status) => {
        const apps = groupedByStatus[status];
        const statusText = status.charAt(0) + status.slice(1).toLowerCase();

        html += `
                    <div class="status-group">
                        <h3 class="status-group-title ${this.getStatusClass(
                          status
                        )}">
                            ${statusText} (${apps.length})
                        </h3>
                        <div class="applications-grid">
                `;

        apps.forEach((app) => {
          html += `
                        <div class="application-item">
                            <div class="app-item-header">
                                <div class="app-item-user">
                                    <div class="user-avatar-small">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div>
                                        <h4>${
                                          app.applicant?.fullName || "Applicant"
                                        }</h4>
                                        <p>${app.applicant?.email || ""}</p>
                                    </div>
                                </div>
                                <span class="app-item-status ${this.getStatusClass(
                                  app.status
                                )}">
                                    ${
                                      app.status.charAt(0) +
                                      app.status.slice(1).toLowerCase()
                                    }
                                </span>
                            </div>
                            <div class="app-item-content">
                                ${
                                  app.coverLetter
                                    ? `<p class="app-item-cover">${app.coverLetter.substring(
                                        0,
                                        120
                                      )}...</p>`
                                    : ""
                                }
                                <div class="app-item-meta">
                                    <span><i class="fas fa-calendar"></i> ${new Date(
                                      app.appliedAt
                                    ).toLocaleDateString()}</span>
                                    ${
                                      app.resumeUrl
                                        ? `<a href="${app.resumeUrl}" target="_blank" class="text-link"><i class="fas fa-file-pdf"></i> Resume</a>`
                                        : ""
                                    }
                                </div>
                            </div>
                            <div class="app-item-actions">
                                <button class="btn-text view-app-details" data-app-id="${
                                  app.id
                                }">
                                    View Details
                                </button>
                                <button class="btn-text update-app-status" data-app-id="${
                                  app.id
                                }">
                                    Update Status
                                </button>
                            </div>
                        </div>
                    `;
        });

        html += `
                        </div>
                    </div>
                `;
      });

      appsList.innerHTML = html;

      // Add event listeners
      appsList.querySelectorAll(".view-app-details").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const appId = e.target.dataset.appId;
          this.viewApplicationDetails(appId);
        });
      });

      appsList.querySelectorAll(".update-app-status").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const appId = e.target.dataset.appId;
          // Find the application
          const application = applications.find((app) => app.id == appId);
          if (application) {
            this.showApplicationModal(application);
          }
        });
      });
    }

    modal.classList.add("show");
  }

  async editJob(jobId) {
    try {
      // Fetch job details
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch job details");
      }

      const result = await response.json();
      const job = result.data;

      // Pre-fill the create job form with job data
      this.showEditJobModal(job);
    } catch (error) {
      console.error("Error editing job:", error);
      this.showError("Failed to load job details");
    }
  }

  showEditJobModal(job) {
    const form = document.getElementById("createJobForm");
    const modal = document.getElementById("createJobModal");
    const modalTitle = modal ? modal.querySelector("h2") : null;

    if (!form || !modal || !modalTitle) return;

    // Change modal title
    modalTitle.innerHTML = `<i class="fas fa-edit"></i> Edit Job`;

    // Pre-fill form values
    document.getElementById("jobTitle").value = job.title;
    document.getElementById("jobDescription").value = job.description;
    document.getElementById("jobCompany").value = job.company;
    document.getElementById("jobLocation").value = job.location;
    document.getElementById("jobSalary").value = job.salary;
    document.getElementById("jobType").value = job.jobType;
    document.getElementById("experienceLevel").value = job.experienceLevel;
    document.getElementById("jobRequirements").value = job.requirements || "";
    document.getElementById("jobSkills").value = ""; // Add if you have skills field

    // Store job ID for update
    form.dataset.editJobId = job.id;

    // Update submit button text
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Job';
    }

    modal.classList.add("show");
  }

  async toggleJobStatus(jobId) {
    if (!confirm("Are you sure you want to change the job status?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/jobs/toggle-status/${jobId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update job status");
      }

      this.showSuccess("Job status updated successfully");
      this.refreshDashboard(); // Use refresh instead of load
    } catch (error) {
      console.error("Error toggling job status:", error);
      this.showError("Failed to update job status");
    }
  }

  async deleteJob(jobId) {
    if (
      !confirm(
        "Are you sure you want to delete this job? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/jobs/delete/${jobId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete job");
      }

      this.showSuccess("Job deleted successfully");
      this.refreshDashboard();
    } catch (error) {
      console.error("Error deleting job:", error);
      this.showError("Failed to delete job");
    }
  }

  refreshDashboard() {
    // Clear cache and reload
    this.jobsCache = null;
    this.loadDashboard();
  }

  updateStats(stats) {
    const activeJobsEl = document.getElementById("activeJobsCount");
    const totalAppsEl = document.getElementById("totalApplications");
    const shortlistedEl = document.getElementById("shortlistedCount");
    const pendingEl = document.getElementById("pendingReview");

    if (activeJobsEl) activeJobsEl.textContent = stats.activeJobs;
    if (totalAppsEl) totalAppsEl.textContent = stats.totalApplications;
    if (shortlistedEl) shortlistedEl.textContent = stats.shortlistedCount;
    if (pendingEl) pendingEl.textContent = stats.pendingReview;
  }

  setupEventListeners() {
    // Create Job button
    const createJobBtn = document.getElementById("createJobBtn");
    if (createJobBtn) {
      createJobBtn.addEventListener("click", () => {
        this.resetCreateJobForm();
        const modal = document.getElementById("createJobModal");
        if (modal) {
          modal.classList.add("show");
        }
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.refreshDashboard();
      });
    }

    // Job search
    const jobSearch = document.getElementById("jobSearch");
    if (jobSearch) {
      jobSearch.addEventListener("input", (e) => {
        this.filterJobs(e.target.value);
      });
    }

    // Job status filter
    const statusFilter = document.getElementById("jobStatusFilter");
    if (statusFilter) {
      statusFilter.addEventListener("change", (e) => {
        this.filterJobsByStatus(e.target.value);
      });
    }

    // View all applications
    const viewAllApps = document.getElementById("viewAllApplications");
    if (viewAllApps) {
      viewAllApps.addEventListener("click", (e) => {
        e.preventDefault();
        this.viewAllApplicationsPage();
      });
    }

    // Logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await this.logout();
      });
    }
  }

  setupModals() {
    // Close modals when clicking X or outside
    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", function () {
        const modal = this.closest(".modal");
        if (modal) {
          modal.classList.remove("show");
        }
      });
    });

    // Close modal when clicking outside
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.remove("show");
        }
      });
    });

    // Create job form submission
    const createJobForm = document.getElementById("createJobForm");
    if (createJobForm) {
      createJobForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleJobFormSubmit(createJobForm);
      });
    }
  }

  async handleJobFormSubmit(form) {
    const isEdit = form.dataset.editJobId;

    // Get form data
    const jobData = {
      title: document.getElementById("jobTitle").value,
      description: document.getElementById("jobDescription").value,
      company: document.getElementById("jobCompany").value,
      location: document.getElementById("jobLocation").value,
      salary: parseFloat(document.getElementById("jobSalary").value),
      jobType: document.getElementById("jobType").value,
      experienceLevel: document.getElementById("experienceLevel").value,
      requirements: document.getElementById("jobRequirements").value,
      responsibilities: "", // Add if you have this field
    };

    try {
      let response;
      let url;

      if (isEdit) {
        // Update existing job
        url = `${API_BASE_URL}/jobs/update/${form.dataset.editJobId}`;
        response = await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(jobData),
        });
      } else {
        // Create new job
        url = `${API_BASE_URL}/jobs/create`;
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(jobData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save job");
      }

      const result = await response.json();

      this.showSuccess(
        result.message ||
          (isEdit ? "Job updated successfully" : "Job created successfully")
      );

      // Close modal and refresh dashboard
      const modal = document.getElementById("createJobModal");
      if (modal) {
        modal.classList.remove("show");
      }
      this.resetCreateJobForm();
      this.refreshDashboard();
    } catch (error) {
      console.error("Error saving job:", error);
      this.showError(error.message || "Failed to save job");
    }
  }

  resetCreateJobForm() {
    const form = document.getElementById("createJobForm");
    if (!form) return;

    form.reset();
    form.removeAttribute("data-edit-job-id");

    const modalTitle = document.querySelector("#createJobModal h2");
    if (modalTitle) {
      modalTitle.innerHTML = `<i class="fas fa-briefcase"></i> Post New Job`;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Job';
    }
  }

  filterJobs(searchTerm) {
    const jobItems = document.querySelectorAll(".job-item");

    jobItems.forEach((item) => {
      const title = item.querySelector("h3").textContent.toLowerCase();
      const company = item
        .querySelector(".job-meta span:nth-child(1)")
        .textContent.toLowerCase();
      const location = item
        .querySelector(".job-meta span:nth-child(2)")
        .textContent.toLowerCase();

      const matches =
        title.includes(searchTerm.toLowerCase()) ||
        company.includes(searchTerm.toLowerCase()) ||
        location.includes(searchTerm.toLowerCase());

      item.style.display = matches ? "flex" : "none";
    });
  }

  filterJobsByStatus(status) {
    const jobItems = document.querySelectorAll(".job-item");

    jobItems.forEach((item) => {
      const statusElement = item.querySelector(".job-status");
      const jobStatus = statusElement.textContent.toLowerCase();

      if (status === "all" || jobStatus === status.toLowerCase()) {
        item.style.display = "flex";
      } else {
        item.style.display = "none";
      }
    });
  }

  viewAllApplicationsPage() {
    // For now, just show an alert. We'll create a dedicated page later.
    alert("All Applications page will be implemented in Phase 5");
    // You can create applications.html later
  }

  async logout() {
    try {
      // Close WebSocket if connected
      if (window.stompClient && window.stompClient.connected) {
        window.stompClient.disconnect();
        console.log("STOMP disconnected");
      }

      if (
        window.wsConnection &&
        window.wsConnection.readyState === WebSocket.OPEN
      ) {
        window.wsConnection.close(1000, "User logging out");
      }

      // Clear local storage
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");

      // Redirect to login
      window.location.href = "login.html";
    } catch (error) {
      console.error("Logout error:", error);
      // Still redirect to login
      window.location.href = "login.html";
    }
  }

  getStatusClass(status) {
    switch (status) {
      case "PENDING":
        return "status-pending";
      case "REVIEWED":
        return "status-reviewed";
      case "SHORTLISTED":
        return "status-shortlisted";
      case "ACCEPTED":
        return "status-accepted";
      case "REJECTED":
        return "status-rejected";
      default:
        return "status-pending";
    }
  }

  formatSalary(salary) {
    if (!salary) return "0";

    // Convert to lakhs if more than 100,000
    if (salary >= 100000) {
      return (salary / 100000).toFixed(1) + "L";
    }

    // Format with commas
    return salary.toLocaleString("en-IN");
  }

  showLoading() {
    // Show loading state in jobs container
    const container = document.getElementById("jobsContainer");
    if (container) {
      container.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading your job postings...</p>
                </div>
            `;
    }
  }

  showSuccess(message) {
    // Create toast notification
    const toast = document.createElement("div");
    toast.className = "toast toast-success";
    toast.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  showError(message) {
    // Create error toast
    const toast = document.createElement("div");
    toast.className = "toast toast-error";
    toast.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check if we're on recruiter dashboard
  if (window.location.pathname.includes("recruiter-dashboard.html")) {
    // Add a small delay to ensure everything is loaded
    setTimeout(() => {
      new RecruiterDashboard();
    }, 100);
  }
});
