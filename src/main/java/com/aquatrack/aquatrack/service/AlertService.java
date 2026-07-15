package com.aquatrack.aquatrack.service;

import com.aquatrack.aquatrack.model.Notification;
import com.aquatrack.aquatrack.model.WaterUsageLog;
import com.aquatrack.aquatrack.repository.NotificationRepository;
import com.aquatrack.aquatrack.repository.WaterUsageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Alert Service - Anomaly Detection & Threshold Alerts
 *
 * Detects:
 * 1. Usage exceeding configurable thresholds (e.g., > 500 L/day)
 * 2. Statistical anomalies: usage > 2σ above household average (potential leaks)
 */
@Service
public class AlertService {

    @Autowired
    private WaterUsageRepository waterUsageRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    // Default daily threshold in liters
    private static final double DEFAULT_DAILY_THRESHOLD = 500.0;

    /**
     * Check a newly logged reading for anomalies and threshold violations.
     * Creates notifications if issues are detected.
     *
     * @param log      The water usage log to analyze
     * @param username The username of the household resident (for notification)
     */
    public void analyzeUsage(WaterUsageLog log, String username) {
        // 1. Check against fixed threshold
        if (log.getReadingLiters() > DEFAULT_DAILY_THRESHOLD) {
            log.setStatus("Overuse");
            
            Notification alert = new Notification(
                    username != null ? username : "admin",
                    "OVERUSE_ALERT",
                    "High Water Usage Detected",
                    "Household " + log.getHouseNumber() + " recorded " +
                            String.format("%.0f", log.getReadingLiters()) + " L on " +
                            log.getReadingDate() + ", exceeding the daily threshold of " +
                            String.format("%.0f", DEFAULT_DAILY_THRESHOLD) + " L."
            );
            alert.setReferenceId(log.getId());
            alert.setReferenceType("USAGE_LOG");
            notificationRepository.save(alert);
        }

        // 2. Check for statistical anomaly (2σ rule for leak detection)
        Double avgUsage = waterUsageRepository.avgConsumptionByHousehold(log.getHouseNumber());
        Double stdDev = waterUsageRepository.stddevConsumptionByHousehold(log.getHouseNumber());

        if (avgUsage > 0 && stdDev > 0) {
            double upperBound = avgUsage + (2 * stdDev);

            if (log.getReadingLiters() > upperBound) {
                log.setStatus("Potential Leak");

                Notification leakAlert = new Notification(
                        username != null ? username : "admin",
                        "LEAK_DETECTED",
                        "Potential Leak Detected",
                        "Household " + log.getHouseNumber() + " recorded " +
                                String.format("%.0f", log.getReadingLiters()) + " L, which is significantly above " +
                                "the average of " + String.format("%.0f", avgUsage) + " L (2σ threshold: " +
                                String.format("%.0f", upperBound) + " L). Please inspect for leaks."
                );
                leakAlert.setReferenceId(log.getId());
                leakAlert.setReferenceType("USAGE_LOG");
                notificationRepository.save(leakAlert);
            }
        }

        // 3. Normal usage if no alerts triggered
        if (log.getStatus() == null || log.getStatus().equals("Normal")) {
            log.setStatus("Normal");
        }
    }
}
