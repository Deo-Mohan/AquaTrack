package com.aquatrack.aquatrack.service;

import com.aquatrack.aquatrack.model.Bill;
import com.aquatrack.aquatrack.model.Notification;
import com.aquatrack.aquatrack.model.User;
import com.aquatrack.aquatrack.repository.BillRepository;
import com.aquatrack.aquatrack.repository.NotificationRepository;
import com.aquatrack.aquatrack.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PaymentReminderService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private EmailService emailService;

    // Run every month on the 1st day of the month at 9:00 AM
    @Scheduled(cron = "0 0 9 1 * ?")
    public void runMonthlyUnpaidCheck() {
        checkAndNotifyUnpaidBills();
    }

    public Map<String, Integer> checkAndNotifyUnpaidBills() {
        Map<String, Integer> result = new HashMap<>();

        // Fetch all approved Community Admins
        List<User> communityAdmins = userRepository.findAll().stream()
                .filter(u -> "ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(u.getRole()))
                .filter(u -> "APPROVED".equalsIgnoreCase(u.getStatus()))
                .collect(Collectors.toList());

        for (User admin : communityAdmins) {
            String block = admin.getApartmentBlock();
            if (block == null || block.trim().isEmpty()) {
                continue;
            }

            // Find all unpaid bills in this block
            List<Bill> unpaidBills = billRepository.findByApartmentBlock(block).stream()
                    .filter(b -> "UNPAID".equalsIgnoreCase(b.getStatus()) || "OVERDUE".equalsIgnoreCase(b.getStatus()))
                    .collect(Collectors.toList());

            // Count unique households with unpaid bills
            Set<String> uniqueUnpaidHouseholds = unpaidBills.stream()
                    .map(b -> b.getHouseNumber())
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            int count = uniqueUnpaidHouseholds.size();
            result.put(admin.getUsername(), count);

            if (count > 0) {
                String notifTitle = "Pending Water Bills Alert";
                String notifMsg = String.format("%d households have pending water bills.", count);
                
                // Save alert to DB for Community Admin
                Notification notification = new Notification(
                        admin.getUsername(),
                        "BILL_REMINDER",
                        notifTitle,
                        notifMsg
                );
                notificationRepository.save(notification);
            }
        }
        return result;
    }

    public void sendReminderToResident(String houseNumber, String block) {
        // Find all residents of this house in this block
        List<User> residents = userRepository.findAll().stream()
                .filter(u -> "ROLE_RESIDENT".equalsIgnoreCase(u.getRole()) || "ROLE_HOUSEHOLD_USER".equalsIgnoreCase(u.getRole()))
                .filter(u -> houseNumber.equalsIgnoreCase(u.getHouseNumber()))
                .filter(u -> block.equalsIgnoreCase(u.getApartmentBlock()))
                .collect(Collectors.toList());

        for (User resident : residents) {
            // Send simulated/real email
            String email = resident.getEmail();
            if (email != null && !email.trim().isEmpty()) {
                emailService.sendPaymentReminderEmail(email, resident.getFullName() != null ? resident.getFullName() : resident.getUsername());
            }

            // Also create an in-app notification for the resident
            Notification notification = new Notification(
                    resident.getUsername(),
                    "BILL_REMINDER",
                    "Water Bill Pending",
                    "Dear Resident, your monthly water bill is pending. Please complete payment."
            );
            notificationRepository.save(notification);
        }
    }

    public void sendRemindersToAllUnpaidInBlock(String block) {
        List<Bill> unpaidBills = billRepository.findByApartmentBlock(block).stream()
                .filter(b -> "UNPAID".equalsIgnoreCase(b.getStatus()) || "OVERDUE".equalsIgnoreCase(b.getStatus()))
                .collect(Collectors.toList());

        Set<String> houseNumbers = unpaidBills.stream()
                .map(b -> b.getHouseNumber())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        for (String house : houseNumbers) {
            sendReminderToResident(house, block);
        }
    }
}
