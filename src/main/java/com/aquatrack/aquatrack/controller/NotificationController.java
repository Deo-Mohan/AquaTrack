package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.Notification;
import com.aquatrack.aquatrack.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    // GET all notifications for a user
    @GetMapping("/{username}")
    public ResponseEntity<List<Notification>> getNotifications(@PathVariable String username) {
        return ResponseEntity.ok(notificationRepository.findByUsernameOrderByCreatedAtDesc(username));
    }

    // GET only unread notifications for a user
    @GetMapping("/{username}/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(@PathVariable String username) {
        return ResponseEntity.ok(
                notificationRepository.findByUsernameAndIsReadOrderByCreatedAtDesc(username, false));
    }

    // GET unread count for a user (for the bell badge)
    @GetMapping("/{username}/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable String username) {
        Long count = notificationRepository.countByUsernameAndIsRead(username, false);
        Map<String, Long> result = new HashMap<>();
        result.put("unreadCount", count);
        return ResponseEntity.ok(result);
    }

    // MARK a single notification as read
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found with ID: " + id));
        notification.setIsRead(true);
        notificationRepository.save(notification);
        return ResponseEntity.ok("Notification marked as read.");
    }

    // MARK all notifications as read for a user
    @PutMapping("/{username}/read-all")
    public ResponseEntity<?> markAllAsRead(@PathVariable String username) {
        List<Notification> unread = notificationRepository
                .findByUsernameAndIsReadOrderByCreatedAtDesc(username, false);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok("All notifications marked as read.");
    }

    // DELETE a notification
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
        notificationRepository.deleteById(id);
        return ResponseEntity.ok("Notification deleted.");
    }

    // DELETE all notifications for a user
    @DeleteMapping("/delete-all/{username}")
    public ResponseEntity<?> deleteAllNotifications(@PathVariable String username) {
        List<Notification> userNotifications = notificationRepository.findByUsernameOrderByCreatedAtDesc(username);
        notificationRepository.deleteAll(userNotifications);
        return ResponseEntity.ok("All notifications deleted.");
    }

    // POST to send/create a notification
    @PostMapping("/send")
    public ResponseEntity<Notification> sendNotification(@RequestBody Notification notification) {
        if (notification.getCreatedAt() == null) {
            notification.setCreatedAt(java.time.LocalDateTime.now());
        }
        if (notification.getIsRead() == null) {
            notification.setIsRead(false);
        }
        Notification saved = notificationRepository.save(notification);
        return ResponseEntity.ok(saved);
    }
}

