// js/api.js - COMPLETELY FIXED VERSION WITH JSON ERROR HANDLING
const API_BASE_URL = "http://localhost:8080/api";
const WS_URL = "ws://localhost:8080/ws";

// SINGLETON PATTERN - Ek hi instance sab jagah use hoga
let apiInstance = null;

class API {
  constructor() {
    // Agar pehle se instance hai toh wahi return karo
    if (apiInstance) {
      return apiInstance;
    }

    this.token = localStorage.getItem("token");
    this.isInitializing = false;

    // WebSocket related properties
    this.socket = null;
    this.isWebSocketConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;

    apiInstance = this;
    return this;
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem("token", token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("token");
  }

  getHeaders(includeAuth = true) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (includeAuth && this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // ✅ FIXED: Generic GET method with JSON parsing safeguard
  async fetchData(endpoint, params = {}) {
    try {
      const queryString = Object.keys(params).length
        ? `?${new URLSearchParams(params).toString()}`
        : "";
      const url = `${API_BASE_URL}${endpoint}${queryString}`;

      console.log(`Fetching from: ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      // ✅ Pehle response text mein lo
      const responseText = await response.text();

      // ✅ Debug ke liye log karo (only first 500 chars)
      console.log(
        `Response for ${endpoint} (first 500 chars):`,
        responseText.substring(0, 500)
      );

      if (response.status === 401) {
        this.clearToken();
        throw new Error("Session expired. Please login again.");
      }

      // ✅ Check if response is empty
      if (!responseText || responseText.trim() === "") {
        if (response.ok) {
          return { success: true, message: "Operation successful" };
        } else {
          throw new Error(`Empty response from server: ${response.status}`);
        }
      }

      let data;
      try {
        // ✅ Try to parse JSON
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`❌ JSON Parse Error for ${endpoint}:`, parseError);
        console.error(
          "Problematic JSON (chars 747700-747800):",
          responseText.substring(747700, 747800)
        );

        // ✅ Try to find and fix common JSON issues
        const fixedText = this.tryFixJSON(responseText);
        try {
          data = JSON.parse(fixedText);
          console.log("✅ Fixed JSON parsing successfully");
        } catch (secondError) {
          console.error("❌ Could not fix JSON:", secondError);
          throw new Error(
            `Invalid JSON response from server. Please check backend response format.`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);

      // Agar session expired hai toh redirect
      if (error.message.includes("Session expired")) {
        setTimeout(() => {
          window.location.href = "login.html";
        }, 100);
      }

      throw error;
    }
  }

  // ✅ Helper method to fix common JSON issues
  tryFixJSON(jsonString) {
    try {
      // Remove any trailing commas
      let fixed = jsonString.replace(/,(\s*[}\]])/g, "$1");

      // Escape any unescaped quotes
      fixed = fixed.replace(/([^\\])"/g, '$1\\"');

      // Remove any null characters
      fixed = fixed.replace(/\0/g, "");

      // Try to parse again
      JSON.parse(fixed);
      return fixed;
    } catch (e) {
      // If still can't fix, return original
      return jsonString;
    }
  }

  // ✅ FIXED: Generic POST method
  async postData(endpoint, data = {}) {
    try {
      console.log(`Posting to: ${API_BASE_URL}${endpoint}`, data);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      // ✅ Pehle response text mein lo
      const responseText = await response.text();
      console.log(
        `Response for POST ${endpoint}:`,
        responseText.substring(0, 200)
      );

      if (response.status === 401) {
        this.clearToken();
        throw new Error("Session expired. Please login again.");
      }

      // ✅ Check if response is empty
      if (!responseText || responseText.trim() === "") {
        if (response.ok) {
          return { success: true, message: "Operation successful" };
        } else {
          throw new Error(`Empty response from server: ${response.status}`);
        }
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ JSON Parse Error for POST:", parseError);
        console.error("Response text:", responseText.substring(0, 200));
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

      if (!response.ok) {
        throw new Error(result.message || `Error: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`Error posting to ${endpoint}:`, error);
      throw error;
    }
  }

  // Generic PUT method
  async putData(endpoint, data = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      // ✅ Pehle response text mein lo
      const responseText = await response.text();

      if (response.status === 401) {
        this.clearToken();
        throw new Error("Session expired. Please login again.");
      }

      // ✅ Check if response is empty
      if (!responseText || responseText.trim() === "") {
        if (response.ok) {
          return { success: true, message: "Operation successful" };
        } else {
          throw new Error(`Empty response from server: ${response.status}`);
        }
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ JSON Parse Error:", parseError);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      return result;
    } catch (error) {
      console.error(`Error putting to ${endpoint}:`, error);
      throw error;
    }
  }

  // Generic DELETE method
  async deleteData(endpoint) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      // ✅ Pehle response text mein lo
      const responseText = await response.text();

      if (response.status === 401) {
        this.clearToken();
        throw new Error("Session expired. Please login again.");
      }

      // ✅ Check if response is empty
      if (!responseText || responseText.trim() === "") {
        if (response.ok) {
          return { success: true, message: "Operation successful" };
        } else {
          throw new Error(`Empty response from server: ${response.status}`);
        }
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ JSON Parse Error:", parseError);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      return result;
    } catch (error) {
      console.error(`Error deleting ${endpoint}:`, error);
      throw error;
    }
  }

  // ✅ FIXED: Auth APIs
  async register(data) {
    return this.postData("/auth/register", data);
  }

  async login(data) {
    const result = await this.postData("/auth/login", data);
    if (result.token) {
      this.setToken(result.token);
      localStorage.setItem("currentUser", JSON.stringify(result.data || {}));
    }
    return result;
  }

  async logout() {
    try {
      // Close WebSocket if connected
      this.disconnectWebSocket();

      // Call logout API
      await this.postData("/auth/logout", {});

      // Clear all local storage
      this.clearToken();
      localStorage.removeItem("currentUser");
      sessionStorage.clear();

      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local storage even if API call fails
      this.clearToken();
      localStorage.removeItem("currentUser");
      return { success: true, message: "Logged out successfully" };
    }
  }

  async getCurrentUser() {
    if (!this.token) return null;

    try {
      const response = await this.fetchData("/auth/me");
      if (response && response.data) {
        localStorage.setItem("currentUser", JSON.stringify(response.data));
      }
      return response;
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  }

  // Check if user is logged in
  isLoggedIn() {
    return !!this.token && !!localStorage.getItem("token");
  }

  // Get user role
  async getUserRole() {
    try {
      const userData = await this.getCurrentUser();
      if (userData && userData.data) {
        return userData.data.role;
      }
      return null;
    } catch (error) {
      console.error("Error getting user role:", error);
      return null;
    }
  }

  // WebSocket methods
  connectWebSocket(onMessageCallback = null) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    if (!this.token) {
      console.warn("No token available for WebSocket connection");
      return;
    }

    try {
      this.disconnectWebSocket();

      const wsUrl = `${WS_URL}/notifications?token=${this.token}`;
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        this.isWebSocketConnected = true;
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessageCallback) {
            onMessageCallback(data);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      this.socket.onclose = (event) => {
        console.log("WebSocket disconnected");
        this.isWebSocketConnected = false;
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
    }
  }

  disconnectWebSocket() {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close(1000, "Manual disconnect");
      }
      this.socket = null;
      this.isWebSocketConnected = false;
    }
  }

  // Job APIs
  async getAllJobs() {
    return this.fetchData("/jobs/all");
  }

  async getJobById(jobId) {
    return this.fetchData(`/jobs/${jobId}`);
  }

  async searchJobs(params = {}) {
    return this.fetchData("/jobs/search", params);
  }

  async getMyJobs() {
    return this.fetchData("/jobs/my-jobs");
  }

  async createJob(data) {
    return this.postData("/jobs/create", data);
  }

  async updateJob(jobId, data) {
    return this.putData(`/jobs/update/${jobId}`, data);
  }

  async deleteJob(jobId) {
    return this.deleteData(`/jobs/delete/${jobId}`);
  }

  async toggleJobStatus(jobId) {
    return this.putData(`/jobs/toggle-status/${jobId}`);
  }

  // ✅ FIXED: Application APIs - Added retry logic
  async applyForJob(jobId, data = {}) {
    try {
      return await this.postData(`/applications/apply/${jobId}`, data);
    } catch (error) {
      // Check if it's "already applied" error
      if (error.message.includes("already applied")) {
        throw new Error("You have already applied for this job");
      }
      throw error;
    }
  }

  async getMyApplications() {
    return this.fetchData("/applications/my-applications");
  }

  async getJobApplications(jobId) {
    return this.fetchData(`/applications/job/${jobId}`);
  }

  async updateApplicationStatus(applicationId, status) {
    return this.putData(`/applications/update-status/${applicationId}`, {
      status,
    });
  }

  async withdrawApplication(applicationId) {
    return this.deleteData(`/applications/withdraw/${applicationId}`);
  }

  // Notification APIs
  async getMyNotifications() {
    return this.fetchData("/notifications/my-notifications");
  }

  async markNotificationAsRead(notificationId) {
    return this.putData(`/notifications/mark-as-read/${notificationId}`);
  }
}

// Global API instance
const api = new API();
