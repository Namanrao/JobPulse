// js/auth.js - UPDATED FIXED VERSION

// Check if auth is already declared to prevent redeclaration errors
if (typeof window.auth !== "undefined") {
  console.log("Auth already initialized, skipping...");
} else {
  // Create auth object
  const auth = {
    // Check if user is logged in
    isLoggedIn() {
      const token = localStorage.getItem("token");
      const currentUser = localStorage.getItem("currentUser");
      return !!(token && currentUser);
    },

    // Load authentication state
    loadAuthState() {
      console.log("Loading auth state...");

      // Get the auth buttons container
      const authButtons = document.getElementById("authButtons");
      if (!authButtons) {
        console.log("No auth buttons container found on this page");
        // Check if we're on recruiter dashboard
        if (window.location.pathname.includes("recruiter-dashboard")) {
          console.log(
            "On recruiter dashboard, auth buttons not required in navbar"
          );
        }
        return;
      }

      if (this.isLoggedIn()) {
        console.log("User is logged in, showing user info");
        this.showLoggedInState();
      } else {
        console.log("User is logged out, showing login buttons");
        this.showLoggedOutState();
      }
    },

    // Show UI when user is logged in
    showLoggedInState() {
      const authButtons = document.getElementById("authButtons");
      if (!authButtons) {
        console.warn("Auth buttons container not found for logged in state");
        return;
      }

      try {
        // Get user data from localStorage
        const userDataStr = localStorage.getItem("currentUser");
        if (!userDataStr) {
          console.warn("No user data found in localStorage");
          this.showLoggedOutState();
          return;
        }

        const userData = JSON.parse(userDataStr);
        const userName = userData.fullName || "User";
        const userRole = userData.role || "USER";

        authButtons.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-user" style="color: var(--primary);"></i>
                            <span style="color: var(--primary); font-weight: 500;">${userName}</span>
                        </div>
                        <span style="background: ${this.getRoleColor(
                          userRole
                        )}; color: white; 
                            padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem;">
                            ${userRole}
                        </span>
                        <button onclick="window.auth.performLogout()" class="btn btn-danger" style="padding: 0.5rem 1rem;">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                `;

        // Update navigation based on role
        this.updateNavLinks(userRole);

        console.log("Logged in state displayed successfully for", userName);
      } catch (error) {
        console.error("Error showing logged in state:", error);
        this.showLoggedOutState();
      }
    },

    // Show UI when user is logged out
    showLoggedOutState() {
      const authButtons = document.getElementById("authButtons");
      if (!authButtons) {
        console.warn("Auth buttons container not found for logged out state");
        return;
      }

      authButtons.innerHTML = `
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <a href="login.html" class="btn btn-outline">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </a>
                    <a href="register.html" class="btn btn-primary">
                        <i class="fas fa-user-plus"></i> Register
                    </a>
                </div>
            `;

      // Reset navigation links
      this.resetNavLinks();
      console.log("Logged out state displayed");
    },

    // Update navigation links based on user role
    updateNavLinks(role) {
      console.log("Updating nav links for role:", role);

      const jobsLink = document.getElementById("jobsLink");
      const employersLink = document.getElementById("employersLink");

      if (role === "RECRUITER") {
        if (employersLink) {
          employersLink.innerHTML =
            '<i class="fas fa-dashboard"></i> Dashboard';
          employersLink.href = "recruiter-dashboard.html";
          employersLink.style.display = "flex";
        }
        if (jobsLink) {
          jobsLink.innerHTML = '<i class="fas fa-briefcase"></i> All Jobs';
          jobsLink.href = "jobs.html";
        }
      } else if (role === "JOB_SEEKER") {
        if (jobsLink) {
          jobsLink.innerHTML = '<i class="fas fa-search"></i> Find Jobs';
          jobsLink.href = "jobs.html";
        }
        if (employersLink) {
          employersLink.style.display = "none";
        }
      }
    },

    // Reset navigation links to default
    resetNavLinks() {
      const jobsLink = document.getElementById("jobsLink");
      const employersLink = document.getElementById("employersLink");

      if (jobsLink) {
        jobsLink.innerHTML = '<i class="fas fa-briefcase"></i> Jobs';
        jobsLink.href = "jobs.html";
      }

      if (employersLink) {
        employersLink.innerHTML =
          '<i class="fas fa-building"></i> For Employers';
        employersLink.href = "recruiter-dashboard.html";
        employersLink.style.display = "flex";
      }
    },

    // Get color for role badge
    getRoleColor(role) {
      const colors = {
        JOB_SEEKER: "#10b981",
        RECRUITER: "#3b82f6",
        ADMIN: "#ef4444",
      };
      return colors[role] || "#64748b";
    },

    // Perform logout
    async performLogout() {
      console.log("Performing logout...");

      try {
        // Try to call API logout if available
        if (window.api && typeof window.api.logout === "function") {
          await window.api.logout().catch((err) => {
            console.warn(
              "API logout failed, continuing with local logout:",
              err
            );
          });
        }
      } catch (apiError) {
        console.warn("API logout error, continuing:", apiError);
      }

      // Clear all local storage
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      sessionStorage.clear();

      console.log("Local storage cleared, redirecting to login...");

      // Redirect to home page
      setTimeout(() => {
        window.location.href = "index.html";
      }, 100);
    },

    // Show alert message
    showAlert(message, type = "error", elementId = "alertContainer") {
      const container = document.getElementById(elementId);
      if (!container) return;

      // Remove existing alerts
      const existingAlerts = container.querySelectorAll(".alert");
      existingAlerts.forEach((alert) => alert.remove());

      const alertDiv = document.createElement("div");
      alertDiv.className = `alert alert-${type}`;
      alertDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${message}</span>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: none; border: none; color: inherit; cursor: pointer; font-size: 1.2rem;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

      container.appendChild(alertDiv);

      // Auto remove after 5 seconds
      setTimeout(() => {
        if (alertDiv.parentElement === container) {
          alertDiv.remove();
        }
      }, 5000);
    },
  };

  // Make auth globally available
  window.auth = auth;

  // Create global logout function
  window.logout = function () {
    return auth.performLogout();
  };

  console.log("Auth module initialized successfully");
}

// Auto-initialize auth when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing auth...");

  // Small delay to ensure all elements are loaded
  setTimeout(() => {
    if (window.auth && typeof window.auth.loadAuthState === "function") {
      window.auth.loadAuthState();
    } else {
      console.error("Auth module not properly initialized");
    }
  }, 100);
});

// Also initialize auth when window loads (for pages that load dynamically)
window.addEventListener("load", function () {
  console.log("Window loaded, checking auth state...");

  // Small delay to ensure everything is ready
  setTimeout(() => {
    if (window.auth && typeof window.auth.loadAuthState === "function") {
      window.auth.loadAuthState();
    }
  }, 200);
});
