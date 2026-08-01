package com.aquatrack.aquatrack.service;

import com.aquatrack.aquatrack.repository.SupportTicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class SupportCleanupService {

    @Autowired
    private SupportTicketRepository supportTicketRepository;

    // Runs every day at midnight (00:00:00) to automatically clean up support tickets older than 15 days
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void cleanupOldSupportTickets() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(15);
        try {
            supportTicketRepository.deleteByCreatedAtBefore(cutoff);
            System.out.println("[AquaTrack Purge] Automatically deleted support tickets created before: " + cutoff);
        } catch (Exception e) {
            System.err.println("[AquaTrack Purge Error] Failed to delete old support tickets: " + e.getMessage());
        }
    }
}
