package com.jobpulse.controller;

import com.jobpulse.dto.responses.ApiResponse;
import com.jobpulse.model.Notification;
import com.jobpulse.model.User;
import com.jobpulse.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return (User) authentication.getPrincipal();
    }

    @GetMapping("/my-notifications")
    public ResponseEntity<ApiResponse> getMyNotifications() {
        try {
            User currentUser = getCurrentUser();
            List<Notification> notifications = notificationService.getUserNotifications(currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(
                    "Notifications retrieved successfully",
                    notifications
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/unread")
    public ResponseEntity<ApiResponse> getUnreadNotifications() {
        try {
            User currentUser = getCurrentUser();
            List<Notification> notifications = notificationService.getUnreadNotifications(currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(
                    "Unread notifications retrieved successfully",
                    notifications
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse> getUnreadCount() {
        try {
            User currentUser = getCurrentUser();
            Long count = notificationService.getUnreadNotificationCount(currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(
                    "Unread count retrieved successfully",
                    count
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/mark-as-read/{id}")
    public ResponseEntity<ApiResponse> markAsRead(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            Notification notification = notificationService.markAsRead(id, currentUser);
            return ResponseEntity.ok(ApiResponse.success(
                    "Notification marked as read",
                    notification
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/mark-all-as-read")
    public ResponseEntity<ApiResponse> markAllAsRead() {
        try {
            User currentUser = getCurrentUser();
            notificationService.markAllAsRead(currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(
                    "All notifications marked as read"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<ApiResponse> deleteNotification(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            notificationService.deleteNotification(id, currentUser);
            return ResponseEntity.ok(ApiResponse.success(
                    "Notification deleted successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // WebSocket message handlers - UPDATED

    // Test endpoint for WebSocket
    @MessageMapping("/notify")
    @SendToUser("/queue/notifications")
    public Map<String, Object> sendNotification(@RequestBody Map<String, Object> message) {
        System.out.println("✅ Received WebSocket notification request: " + message);

        Map<String, Object> response = new HashMap<>();
        response.put("type", "TEST_NOTIFICATION");
        response.put("message", message.get("message") != null ? message.get("message") : "Test notification");
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("status", "SUCCESS");

        return response;
    }

    @MessageMapping("/notify-new-job")
    @SendTo("/topic/new-jobs")
    public Map<String, Object> notifyNewJob(@RequestBody Map<String, Object> jobData) {
        System.out.println("✅ New job notification via WebSocket: " + jobData);

        Map<String, Object> response = new HashMap<>();
        response.put("type", "NEW_JOB");
        response.put("message", "🎯 New Job Posted: " + jobData.get("title"));
        response.put("jobId", jobData.get("jobId"));
        response.put("company", jobData.get("company"));
        response.put("jobTitle", jobData.get("title"));
        response.put("timestamp", LocalDateTime.now().toString());

        return response;
    }

    @MessageMapping("/private-notification")
    @SendToUser("/queue/notifications")
    public Map<String, Object> sendPrivateNotification(@RequestBody Map<String, Object> message) {
        System.out.println("✅ Private notification: " + message);

        Map<String, Object> response = new HashMap<>();
        response.put("type", "PRIVATE_NOTIFICATION");
        response.put("message", message.get("message"));
        response.put("userId", message.get("userId"));
        response.put("timestamp", LocalDateTime.now().toString());

        return response;
    }

    // HTTP endpoint to trigger notifications (for testing)
    @PostMapping("/test-notification")
    public ResponseEntity<ApiResponse> sendTestNotification(@RequestBody Map<String, Object> request) {
        try {
            User currentUser = getCurrentUser();
            Long userId = request.get("userId") != null ? Long.parseLong(request.get("userId").toString()) : currentUser.getId();
            String message = request.get("message") != null ? request.get("message").toString() : "Test notification";

            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "TEST");
            notification.put("message", message);
            notification.put("userId", userId);
            notification.put("timestamp", LocalDateTime.now().toString());

            // Send to specific user
            messagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    "/queue/notifications",
                    notification
            );

            System.out.println("✅ Test notification sent to user: " + userId);

            return ResponseEntity.ok(ApiResponse.success(
                    "Test notification sent successfully",
                    notification
            ));
        } catch (Exception e) {
            System.err.println("❌ Failed to send test notification: " + e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to send test notification: " + e.getMessage()));
        }
    }

    // Helper method to send notification when job application is submitted
    public void sendJobApplicationNotification(Long recruiterId, Long jobId, String jobTitle, String applicantName) {
        try {
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "NEW_APPLICATION");
            notification.put("message", "📥 " + applicantName + " applied for " + jobTitle);
            notification.put("jobId", jobId);
            notification.put("applicantName", applicantName);
            notification.put("timestamp", LocalDateTime.now().toString());

            // Send to recruiter's personal queue
            messagingTemplate.convertAndSendToUser(
                    recruiterId.toString(),
                    "/queue/notifications",
                    notification
            );

            // Also broadcast to general recruiter topic
            notification.put("recruiterId", recruiterId);
            messagingTemplate.convertAndSend("/topic/recruiters", notification);

            System.out.println("✅ Sent application notification to recruiter: " + recruiterId);
        } catch (Exception e) {
            System.err.println("❌ Failed to send application notification: " + e.getMessage());
        }
    }

    // Helper method to broadcast new job to all connected users
    public void broadcastNewJob(String jobTitle, String company, Long jobId) {
        try {
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "NEW_JOB");
            notification.put("message", "🎯 New Job Posted: " + jobTitle + " at " + company);
            notification.put("jobId", jobId);
            notification.put("company", company);
            notification.put("jobTitle", jobTitle);
            notification.put("timestamp", LocalDateTime.now().toString());

            // 🔥 BROADCAST TO ALL JOB SEEKERS
            messagingTemplate.convertAndSend("/topic/new-jobs", notification);

            // Also send to general notifications channel
            messagingTemplate.convertAndSend("/topic/notifications", notification);

            System.out.println("📢 Broadcasted new job to all users: " + jobTitle + " (ID: " + jobId + ")");

        } catch (Exception e) {
            System.err.println("❌ Error broadcasting new job: " + e.getMessage());
        }
    }

    // 🔥 NEW: Method to send notification to specific user
    public void sendNotificationToUser(Long userId, String message, String type) {
        try {
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", type != null ? type : "GENERAL");
            notification.put("message", message);
            notification.put("timestamp", LocalDateTime.now().toString());
            notification.put("userId", userId);

            messagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    "/queue/notifications",
                    notification
            );

            System.out.println("✅ Notification sent to user " + userId + ": " + message);
        } catch (Exception e) {
            System.err.println("❌ Failed to send notification to user " + userId + ": " + e.getMessage());
        }
    }
}