package com.jobpulse.service;

import com.jobpulse.model.Notification;
import com.jobpulse.model.User;
import com.jobpulse.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public Notification createNotification(User user, String message,
                                           Notification.NotificationType type, Long relatedId) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setMessage(message);
        notification.setType(type);
        notification.setRelatedId(relatedId);
        notification.setRead(false);

        return notificationRepository.save(notification);
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    public Notification markAsRead(Long notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        // Check if notification belongs to user
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You are not authorized to update this notification");
        }

        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    public void markAllAsRead(Long userId) {
        List<Notification> unreadNotifications = getUnreadNotifications(userId);
        unreadNotifications.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(unreadNotifications);
    }

    public Long getUnreadNotificationCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public void deleteNotification(Long notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        // Check if notification belongs to user
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You are not authorized to delete this notification");
        }

        notificationRepository.delete(notification);
    }

    // Method to notify job seekers about new job (will be used with WebSocket)
    public void notifyNewJobToAllSeekers(String jobTitle, String companyName, Long jobId) {
        // In real implementation, we would get all job seekers
        // For now, this is a placeholder that will be integrated with WebSocket
        String message = "New job posted: " + jobTitle + " at " + companyName;
        // WebSocket will handle broadcasting this to connected users
    }
}