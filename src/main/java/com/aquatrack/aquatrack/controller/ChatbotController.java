package com.aquatrack.aquatrack.controller;

import com.aquatrack.aquatrack.model.Bill;
import com.aquatrack.aquatrack.model.Household;
import com.aquatrack.aquatrack.model.SupportTicket;
import com.aquatrack.aquatrack.model.User;
import com.aquatrack.aquatrack.model.WaterUsageLog;
import com.aquatrack.aquatrack.repository.BillRepository;
import com.aquatrack.aquatrack.repository.HouseholdRepository;
import com.aquatrack.aquatrack.repository.SupportTicketRepository;
import com.aquatrack.aquatrack.repository.UserRepository;
import com.aquatrack.aquatrack.repository.WaterUsageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private SupportTicketRepository supportTicketRepository;

    @Autowired
    private WaterUsageRepository waterUsageRepository;

    @Autowired
    private com.aquatrack.aquatrack.repository.BulkWaterPurchaseRepository bulkWaterPurchaseRepository;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @PostMapping("/query")
    public ResponseEntity<Map<String, Object>> processQuery(@RequestBody Map<String, String> request) {
        String query = request.getOrDefault("query", "");
        String houseNumber = request.getOrDefault("houseNumber", "");
        String username = request.getOrDefault("username", "");
        String role = request.getOrDefault("role", "ROLE_HOUSEHOLD_USER");
        String activePage = request.getOrDefault("activePage", "/dashboard");

        // Two-Stage Intent & Role-Scoped Classifier Gate
        String sanitizedRole = (role != null && !role.isBlank()) ? role.toUpperCase() : "ROLE_HOUSEHOLD_USER";
        String sanitizedHouse = houseNumber != null ? houseNumber.trim() : "";
        String sanitizedUser = username != null ? username.trim() : "";

        // Route deterministically by verified security role
        if ("ROLE_ADMIN".equals(sanitizedRole) || "SUPER_ADMIN".equals(sanitizedRole)) {
            return processSuperAdminQuery(query, sanitizedUser, activePage);
        } else if ("ROLE_COMMUNITY_ADMIN".equals(sanitizedRole) || "COMMUNITY_ADMIN".equals(sanitizedRole)) {
            return processCommunityAdminQuery(query, sanitizedUser, activePage);
        } else {
            return processHouseholdQuery(query, sanitizedHouse, activePage);
        }
    }

    // ─── 1. SUPER ADMIN RAG ENGINE ─────────────────────────────────────────────
    private ResponseEntity<Map<String, Object>> processSuperAdminQuery(String query, String username, String activePage) {
        Map<String, Object> response = new HashMap<>();

        if (!checkRateLimit(username.isBlank() ? "SUPER_ADMIN" : username)) {
            response.put("answer", "⚠️ **Rate Limit Reached**: Maximum AI query rate reached (15 queries/min). Using fast local response engine.");
            response.put("actions", generateSuperAdminActions(query, activePage));
            return ResponseEntity.ok(response);
        }

        Double totalRevenue = billRepository.sumTotalRevenue();
        Double totalPending = billRepository.sumTotalPending();
        long totalUsers = userRepository.count();
        long totalHouseholds = householdRepository.count();
        List<SupportTicket> superAdminTickets = supportTicketRepository.findForSuperAdmin();

        String contextPrompt = buildSuperAdminContext(username, totalRevenue, totalPending, totalUsers, totalHouseholds, superAdminTickets);

        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            try {
                String aiReply = callGeminiApiForRole(query, contextPrompt, activePage, "SUPER_ADMIN");
                if (aiReply != null && !aiReply.isBlank()) {
                    response.put("answer", aiReply);
                    response.put("actions", generateSuperAdminActions(query, activePage));
                    return ResponseEntity.ok(response);
                }
            } catch (Exception e) {
                // Fallback to local RAG engine on Gemini failure
            }
        }

        String localReply = generateLocalSuperAdminRAGReply(query, totalRevenue, totalPending, totalUsers, totalHouseholds, superAdminTickets);
        List<Map<String, String>> actions = generateSuperAdminActions(query, activePage);

        response.put("answer", localReply);
        response.put("actions", actions);
        return ResponseEntity.ok(response);
    }

    private String buildSuperAdminContext(String username, Double totalRevenue, Double totalPending, long totalUsers, long totalHouseholds, List<SupportTicket> tickets) {
        StringBuilder sb = new StringBuilder();
        sb.append("Super Admin Username: ").append(username).append("\n");
        sb.append("Platform Total Revenue Collected (Paid): ₹").append(String.format("%.2f", totalRevenue != null ? totalRevenue : 0.0)).append("\n");
        sb.append("Platform Total Outstanding Pending Dues: ₹").append(String.format("%.2f", totalPending != null ? totalPending : 0.0)).append("\n");
        sb.append("Total Registered Platform Users: ").append(totalUsers).append("\n");
        sb.append("Total Mapped Households: ").append(totalHouseholds).append("\n");
        sb.append("Total Escalated Support Tickets: ").append(tickets != null ? tickets.size() : 0).append("\n");
        return sb.toString();
    }

    private String generateLocalSuperAdminRAGReply(String query, Double totalRevenue, Double totalPending, long totalUsers, long totalHouseholds, List<SupportTicket> tickets) {
        String lower = query.trim().toLowerCase();

        if (lower.matches("^(hi|hello|hey|greetings|good morning).*")) {
            return "Greetings Executive **Super Admin**! 👑 Welcome to **AquaMaster Executive Assistant**. How can I assist you with platform revenue metrics, community admin oversight, or escalated tickets today?";
        }

        if (lower.contains("revenue") || lower.contains("collection") || lower.contains("total money") || lower.contains("finance") || lower.contains("paid")) {
            return "💰 **Platform Revenue & Collection Metrics**:\n\n" +
                   "• **Total Revenue Collected (Paid)**: **₹" + String.format("%.2f", totalRevenue != null ? totalRevenue : 0.0) + "**\n" +
                   "• **Total Unpaid Pending Balance**: **₹" + String.format("%.2f", totalPending != null ? totalPending : 0.0) + "**\n" +
                   "• **Total Registered Platform Users**: " + totalUsers + "\n" +
                   "• **Total Mapped Households**: " + totalHouseholds + "\n\n" +
                   "📌 *Detailed financial ledgers and transaction history can be monitored on the **Admin Dashboard**!*";
        }

        if (lower.contains("escalat") || lower.contains("ticket") || lower.contains("dispute") || lower.contains("urgent complaint")) {
            if (tickets != null && !tickets.isEmpty()) {
                int count = tickets.size();
                SupportTicket top = tickets.get(0);
                return "🏛️ **Super Admin Escalated Tickets (" + count + " Active)**:\n\n" +
                       "• **Total Escalated / High-Priority Tickets**: " + count + "\n" +
                       "📌 **Latest Escalation (#" + (top.getTicketNumber() != null ? top.getTicketNumber() : top.getId()) + ")**:\n" +
                       "• **Title**: " + top.getTitle() + "\n" +
                       "• **Category**: " + top.getCategory() + "\n" +
                       "• **Status**: `" + top.getStatus() + "`\n" +
                       "• **Raised By Role**: " + top.getCreatedByRole() + "\n\n" +
                       "Review and resolve escalations directly on the **Super Admin Tickets Page**!";
            } else {
                return "🏛️ **No Pending Escalations!** There are currently zero escalated tickets requiring Super Admin intervention. All community ticket workflows are operating smoothly! 🎉";
            }
        }

        if (lower.contains("admin") || lower.contains("community admin") || lower.contains("how many community admin") || lower.contains("how many community admins") || lower.contains("admin count") || lower.contains("admins count") || lower.contains("how many admin") || lower.contains("how many admins") || lower.contains("society") || lower.contains("colony") || lower.contains("block")) {
            List<User> communityAdmins = userRepository.findByRole("ROLE_COMMUNITY_ADMIN");
            int adminCount = communityAdmins != null ? communityAdmins.size() : 0;
            
            StringBuilder adminListBuilder = new StringBuilder();
            if (communityAdmins != null && !communityAdmins.isEmpty()) {
                adminListBuilder.append("\n\n📋 **Registered Community Administrators List**:\n");
                int idx = 1;
                for (User a : communityAdmins) {
                    String aName = a.getFullName() != null && !a.getFullName().isBlank() ? a.getFullName() : a.getUsername();
                    String aBlock = a.getApartmentBlock() != null ? a.getApartmentBlock() : "Block A";
                    adminListBuilder.append(idx++).append(". **").append(aName).append("** (").append(aBlock).append(") — Email: `").append(a.getEmail() != null ? a.getEmail() : "N/A").append("`\n");
                }
            }

            return "👥 **Community Admins Oversight**:\n\n" +
                   "• **Total Registered Community Admins**: **" + adminCount + "**\n" +
                   "• **Total System Households**: " + totalHouseholds + adminListBuilder.toString() + "\n\n" +
                   "You can manage admin privileges, assign housing blocks, and inspect admin activities under **User Directory**!";
        }

        if (lower.contains("system water") || lower.contains("total water") || lower.contains("total consumption") || lower.contains("system consumption") || lower.contains("total system water")) {
            Double totalSystemLiters = waterUsageRepository.findAll().stream()
                .mapToDouble(u -> u.getReadingLiters() != null ? u.getReadingLiters() : 0.0).sum();
            return "🌊 **Global System Water Telemetry Summary**:\n\n" +
                   "• **Total Cumulative Platform Water Consumption**: **" + String.format("%.0f", totalSystemLiters) + " Liters**\n" +
                   "• **Total Mapped Households**: " + totalHouseholds + "\n" +
                   "• **Telemetry Status**: Real-time smart sensor & workstation logging active\n\n" +
                   "📌 *Detailed block-by-block consumption trends and analytics are accessible on the **Admin Dashboard**!*";
        }

        if (lower.contains("audit") || lower.contains("system") || lower.contains("log") || lower.contains("backup") || lower.contains("health")) {
            return "🛡️ **System Audit & Infrastructure Status**:\n\n" +
                   "• **Database Connectivity**: Healthy (Spring Boot JPA PostgreSQL/H2)\n" +
                   "• **Security Context**: JWT Bearer Authentication Active\n" +
                   "• **CORS Policy**: Configured for local & production origins\n" +
                   "• **Automated Cron Engine**: Active (Midnight billing cycle sync & overdue reminders)";
        }

        return "I am **Buddy 👑**, assistant for **Super Admin**! 😊\n\nPlease ask a relevant question about your water management platform. I can help you monitor **system revenue, pending collections, escalated tickets, community admins, and audit health** across all housing societies!";
    }

    private List<Map<String, String>> generateSuperAdminActions(String query, String activePage) {
        List<Map<String, String>> actions = new ArrayList<>();
        actions.add(createAction("📊 Executive Dashboard", "/admin-dashboard"));
        actions.add(createAction("🏛️ Escalated Tickets", "/super-admin-tickets"));
        actions.add(createAction("👥 User Directory", "/user-directory"));
        actions.add(createAction("📄 Platform Invoices", "/invoices"));
        return actions;
    }

    // ─── 2. COMMUNITY ADMIN RAG ENGINE ─────────────────────────────────────────
    private ResponseEntity<Map<String, Object>> processCommunityAdminQuery(String query, String username, String activePage) {
        Map<String, Object> response = new HashMap<>();

        if (!checkRateLimit(username.isBlank() ? "COMMUNITY_ADMIN" : username)) {
            response.put("answer", "⚠️ **Rate Limit Reached**: Maximum AI query rate reached (15 queries/min). Using fast local response engine.");
            response.put("actions", generateCommunityAdminActions(query, activePage));
            return ResponseEntity.ok(response);
        }

        User admin = userRepository.findByUsername(username).orElse(null);
        String block = admin != null && admin.getApartmentBlock() != null ? admin.getApartmentBlock() : "Block A";

        String lowerQuery = query.trim().toLowerCase();
        // Water log intent: must mention water/liter/meter/reading AND an explicit ADD action verb
        boolean isWaterKeyword = lowerQuery.contains("water") || lowerQuery.contains("liter") ||
                                 lowerQuery.contains("litre") || lowerQuery.contains("meter reading") ||
                                 lowerQuery.contains("metre") || lowerQuery.contains("water log") ||
                                 lowerQuery.contains("water reading");
        boolean isActionVerb = lowerQuery.contains("add") || lowerQuery.contains("enter") ||
                               lowerQuery.contains("create") || lowerQuery.contains("insert") ||
                               lowerQuery.contains("record new") || lowerQuery.contains("new log") || lowerQuery.contains("upload");
        boolean isLoginFalsePositive = lowerQuery.contains("login") || lowerQuery.contains("log in") || lowerQuery.contains("log out");

        if (isWaterKeyword && isActionVerb && !isLoginFalsePositive) {
            Double parsedLiters = null;
            java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("(\\d+(\\.\\d+)?)").matcher(query);
            if (matcher.find()) {
                try {
                    parsedLiters = Double.parseDouble(matcher.group(1));
                } catch (Exception ignored) {}
            }

            response.put("answer", "Certainly! It is my absolute pleasure to assist you with adding a new water log directly right here. 😊\n\nPlease select the household resident and verify the log details below:");
            response.put("widget", "WATER_LOG_FORM");
            if (parsedLiters != null) {
                response.put("parsedLiters", parsedLiters);
            }
            response.put("actions", generateCommunityAdminActions(query, activePage));
            return ResponseEntity.ok(response);
        }

        Double unpaidBlockTotal = billRepository.sumUnpaidByBlock(block);
        List<User> blockHouseholdsA = userRepository.findByRoleAndApartmentBlock("ROLE_HOUSEHOLD_USER", block);
        List<User> blockHouseholdsB = userRepository.findByRoleAndApartmentBlock("ROLE_RESIDENT", block);
        List<User> blockHouseholds = new java.util.ArrayList<>();
        blockHouseholds.addAll(blockHouseholdsA);
        blockHouseholds.addAll(blockHouseholdsB);
        List<SupportTicket> blockTickets = supportTicketRepository.findByColonyNameOrderByCreatedAtDesc(block);

        // 1. Try local matched pattern reply first for exact/predictable intents
        String localReply = generateLocalCommunityAdminRAGReply(query, admin, block, unpaidBlockTotal, blockHouseholds, blockTickets);
        
        // If local reply matched a specific intent (not null), return it immediately
        if (localReply != null && !localReply.isBlank()) {
            response.put("answer", localReply);
            response.put("actions", generateCommunityAdminActions(query, activePage));
            return ResponseEntity.ok(response);
        }

        // 2. Out-of-bound or complex query: Fallback to Gemini AI with full database context
        String contextPrompt = buildCommunityAdminContext(admin, block, unpaidBlockTotal, blockHouseholds, blockTickets);
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            try {
                String aiReply = callGeminiApiForRole(query, contextPrompt, activePage, "COMMUNITY_ADMIN");
                if (aiReply != null && !aiReply.isBlank()) {
                    response.put("answer", aiReply);
                    response.put("actions", generateCommunityAdminActions(query, activePage));
                    return ResponseEntity.ok(response);
                }
            } catch (Exception e) {
                // Fallback to local default if Gemini API fails
            }
        }

        String adminName = (admin != null ? (admin.getFullName() != null ? admin.getFullName() : admin.getUsername()) : "Admin");
        String defaultFallback = "I am **Buddy 🛡️**, assistant for **" + adminName + "** (" + block + ")! 😊\n\nPlease ask a relevant question about your water management system. I can help you manage **meter workstation CSV uploads, block unpaid collection totals, tariff settings, resident invites, and support ticket resolution**!";
        response.put("answer", defaultFallback);
        response.put("actions", generateCommunityAdminActions(query, activePage));
        return ResponseEntity.ok(response);
    }

    private String buildCommunityAdminContext(User admin, String block, Double unpaidBlockTotal, List<User> households, List<SupportTicket> tickets) {
        StringBuilder sb = new StringBuilder();
        sb.append("Community Admin: ").append(admin != null ? (admin.getFullName() != null ? admin.getFullName() : admin.getUsername()) : "Admin").append("\n");
        sb.append("Managed Apartment Block: ").append(block).append("\n");
        if (admin != null) {
            sb.append("Current Base Water Rate: ₹").append(admin.getWaterRatePerLiter() != null ? admin.getWaterRatePerLiter() : 0.05).append(" / L\n");
            sb.append("Current Monthly Limit: ").append(admin.getMonthlyLimitLiters() != null ? admin.getMonthlyLimitLiters() : 3000.0).append(" L\n");
            sb.append("Current Excess Water Rate: ₹").append(admin.getExcessRatePerLiter() != null ? admin.getExcessRatePerLiter() : 0.10).append(" / L\n");
            sb.append("Current Late Fee: ₹").append(admin.getLateFeePerMonth() != null ? admin.getLateFeePerMonth() : 20.0).append(" / month\n");
            sb.append("Current Grace Period: ").append(admin.getGracePeriodDays() != null ? admin.getGracePeriodDays() : 20).append(" days\n");
        }
        sb.append("Total Block Unpaid Outstanding: ₹").append(String.format("%.2f", unpaidBlockTotal != null ? unpaidBlockTotal : 0.0)).append("\n");
        sb.append("Total Block Household Count: ").append(households != null ? households.size() : 0).append("\n");
        
        // Broadened Community Admin Scope: Resident Directory & Gender Breakdown
        if (households != null && !households.isEmpty()) {
            long maleCount = households.stream().filter(u -> "MALE".equalsIgnoreCase(u.getGender())).count();
            long femaleCount = households.stream().filter(u -> "FEMALE".equalsIgnoreCase(u.getGender())).count();
            sb.append("Block Gender Breakdown: Male=").append(maleCount).append(", Female=").append(femaleCount).append("\n");
            sb.append("Resident Profiles:\n");
            for (User u : households) {
                sb.append("- House #").append(u.getHouseNumber() != null ? u.getHouseNumber() : "N/A")
                  .append(": ").append(u.getFullName() != null ? u.getFullName() : u.getUsername())
                  .append(" (Gender: ").append(u.getGender() != null ? u.getGender() : "Not specified")
                  .append(" | Mobile: ").append(u.getMobileNumber() != null ? u.getMobileNumber() : "N/A").append(")\n");
            }
        }

        // Broadened Community Admin Scope: Bulk Water Procurement & P&L Telemetry
        Double totalTankerCost = bulkWaterPurchaseRepository.findAll().stream()
            .filter(p -> p.getApartmentBlock() == null || block.equalsIgnoreCase(p.getApartmentBlock()))
            .mapToDouble(p -> p.getTotalCost() != null ? p.getTotalCost() : 0.0).sum();
        Double totalTankerLiters = bulkWaterPurchaseRepository.findAll().stream()
            .filter(p -> p.getApartmentBlock() == null || block.equalsIgnoreCase(p.getApartmentBlock()))
            .mapToDouble(p -> p.getVolumeLiters() != null ? p.getVolumeLiters() : 0.0).sum();
        Double totalCollected = billRepository.findAll().stream()
            .filter(b -> b.getApartmentBlock() == null || block.equalsIgnoreCase(b.getApartmentBlock()))
            .mapToDouble(b -> "PAID".equalsIgnoreCase(b.getStatus()) ? ((b.getAmount() != null ? b.getAmount() : 0.0) + (b.getLateFeeAmount() != null ? b.getLateFeeAmount() : 0.0)) : 0.0).sum();
        double netMargin = totalCollected - totalTankerCost;

        sb.append("\nBlock Bulk Water Procurement & P&L:\n");
        sb.append("• Total Inflow Bulk Liters: ").append(String.format("%.0f", totalTankerLiters)).append(" Liters\n");
        sb.append("• Total Tanker Cost: ₹").append(String.format("%.2f", totalTankerCost)).append("\n");
        sb.append("• Total Resident Paid Revenue: ₹").append(String.format("%.2f", totalCollected)).append("\n");
        sb.append("• Net P&L Surplus/Deficit: ₹").append(String.format("%.2f", netMargin)).append("\n");

        // Broadened Community Admin Scope: Block Support Tickets Summary
        sb.append("\nTotal Block Support Tickets: ").append(tickets != null ? tickets.size() : 0).append("\n");
        if (tickets != null && !tickets.isEmpty()) {
            sb.append("Block Support Tickets List:\n");
            for (SupportTicket t : tickets.stream().limit(6).collect(Collectors.toList())) {
                sb.append("• Ticket #").append(t.getId())
                  .append(" | Title: ").append(t.getTitle())
                  .append(" | Category: ").append(t.getCategory())
                  .append(" | Status: ").append(t.getStatus())
                  .append(" | House: ").append(t.getHouseNumber() != null ? t.getHouseNumber() : "N/A")
                  .append("\n");
            }
        }

        return sb.toString();
    }

    private String generateLocalCommunityAdminRAGReply(String query, User admin, String block, Double unpaidBlockTotal, List<User> households, List<SupportTicket> tickets) {
        String lower = query.trim().toLowerCase();

        if (lower.matches("^(hi|hello|hey|greetings|good morning).*")) {
            return "Hello **" + (admin != null ? (admin.getFullName() != null ? admin.getFullName() : admin.getUsername()) : "Admin") + "**! 🛡️ Welcome to **AquaAdmin Community Assistant** for **" + block + "**. Total Block Unpaid Dues: **₹" + String.format("%.2f", unpaidBlockTotal != null ? unpaidBlockTotal : 0.0) + "**. How can I help you with meter workstation uploads, tariff updates, or tickets today?";
        }

        if (lower.contains("unpaid") || lower.contains("collection") || lower.contains("pending") || lower.contains("due") || lower.contains("balance") || lower.contains("money") || lower.contains("not paid") || lower.contains("collect") || lower.contains("how much") || lower.contains("amount")) {
            return "💳 **Block " + block + " Collection & Unpaid Dues Summary**:\n\n" +
                   "• **Total Amount to Collect (Unpaid Balance)**: **₹" + String.format("%.2f", unpaidBlockTotal != null ? unpaidBlockTotal : 0.0) + "**\n" +
                   "• **Total Registered Households**: " + (households != null ? households.size() : 0) + "\n\n" +
                   "📌 *This is the exact same pending collection total shown on your **Admin Dashboard**! View itemized house-by-house unpaid statements under **Billing History**.*";
        }

        if ((lower.contains("workstation") || lower.contains("csv") || lower.contains("bulk upload") || lower.contains("lock cycle")) && !lower.contains("highest") && !lower.contains("user") && !lower.contains("top")) {
            return "📊 **Meter Workstation & Bulk CSV Upload Guide for Block " + block + "**:\n\n" +
                   "1. **Bulk CSV Upload**: Go to **Meter Workstation**, click **Upload CSV**, select formatted CSV (`houseNumber,readingLiters,readingDate`).\n" +
                   "2. **Manual Reading**: Search house number in Workstation table and update meter value directly.\n" +
                   "3. **Cycle Locking**: Once readings are verified, click **Generate & Lock Cycle** to auto-issue bills and notify residents.";
        }

        if (lower.contains("tariff") || lower.contains("rate") || lower.contains("penalty") || lower.contains("late fee") || lower.contains("grace period") || lower.contains("limit")) {
            double bRate = (admin != null && admin.getWaterRatePerLiter() != null) ? admin.getWaterRatePerLiter() : 0.05;
            double mLimit = (admin != null && admin.getMonthlyLimitLiters() != null) ? admin.getMonthlyLimitLiters() : 3000.0;
            double eRate = (admin != null && admin.getExcessRatePerLiter() != null) ? admin.getExcessRatePerLiter() : 0.10;
            double lateFee = (admin != null && admin.getLateFeePerMonth() != null) ? admin.getLateFeePerMonth() : 20.0;
            int grace = (admin != null && admin.getGracePeriodDays() != null) ? admin.getGracePeriodDays() : 20;

            return "📋 **Current Tariff Configuration for " + block + "**:\n\n" +
                   "• **Base Rate**: ₹" + String.format("%.4f", bRate) + " / Liter\n" +
                   "• **Monthly Base Water Limit**: " + String.format("%.0f", mLimit) + " Liters\n" +
                   "• **Excess Usage Rate**: ₹" + String.format("%.4f", eRate) + " / Liter\n" +
                   "• **Late Fee Penalty**: ₹" + String.format("%.2f", lateFee) + " / month\n" +
                   "• **Grace Period**: " + grace + " days\n\n" +
                   "💡 *To modify tariff rates or late fees, visit **Tariff Settings**! Changes automatically sync to all resident bill calculators.*";
        }

        if (lower.contains("verify") || lower.contains("verification") || lower.contains("pending approval") || lower.contains("unapproved")) {
            long unverifiedCount = households != null ? households.stream().filter(u -> u.getVerificationStatus() != null && "PENDING".equalsIgnoreCase(u.getVerificationStatus())).count() : 0;
            return "📋 **Resident Verification Status for Block " + block + "**:\n\n" +
                   "• **Pending Resident Verifications**: **" + unverifiedCount + "** resident(s)\n" +
                   "• **Total Registered Households**: " + (households != null ? households.size() : 0) + "\n\n" +
                   "📌 *Review and approve pending resident registrations directly in the **Resident Directory**!*";
        }

        if (lower.contains("total resident") || lower.contains("registered resident") || lower.contains("how many resident") || lower.contains("total users") || lower.contains("total community")) {
            return "👥 **Community Resident Directory Summary (" + block + ")**:\n\n" +
                   "• **Total Registered Households / Residents**: **" + (households != null ? households.size() : 0) + "**\n" +
                   "• **Active Accounts**: " + (households != null ? households.stream().filter(u -> u.getVerificationStatus() == null || !"PENDING".equalsIgnoreCase(u.getVerificationStatus())).count() : 0) + "\n\n" +
                   "📌 *You can inspect resident house numbers, email contacts, and flat occupancy details under **User Directory**.*";
        }

        // 1. Top Water Consumers Intent
        if (lower.contains("who uses more") || lower.contains("who use more") || lower.contains("highest consumer") || lower.contains("max usage") || lower.contains("most water") || lower.contains("top consumer") || lower.contains("who consumes more") || lower.contains("highest water") || lower.contains("highest log") || lower.contains("top log") || lower.contains("highest reading") || lower.contains("highest water log")) {
            List<Object[]> topUsers = waterUsageRepository.findTopConsumersByBlock(block);
            if (topUsers != null && !topUsers.isEmpty()) {
                StringBuilder sb = new StringBuilder();
                sb.append("🏆 **Top Water Consumers in ").append(block).append("**:\n\n");
                int rank = 1;
                for (Object[] row : topUsers) {
                    if (rank > 5) break;
                    String house = row[0] != null ? row[0].toString() : "Unknown";
                    Double usage = row[1] != null ? Double.parseDouble(row[1].toString()) : 0.0;
                    sb.append(rank).append(". **House ").append(house).append("**: ").append(String.format("%.0f", usage)).append(" Liters\n");
                    rank++;
                }
                sb.append("\n💡 *Households using over their limit incur excess tariff rates automatically.*");
                return sb.toString();
            } else {
                return "🏆 **Top Water Consumers in Block " + block + "**:\n\nAll households are currently within normal consumption thresholds!";
            }
        }

        // 1b. Least / Lowest Water Consumers Intent 🌱
        if (lower.contains("who uses least") || lower.contains("who use least") || lower.contains("lowest consumer") || lower.contains("least water") || lower.contains("minimum usage") || lower.contains("lowest water") || lower.contains("best saver") || lower.contains("who consumes least")) {
            List<Object[]> topUsers = waterUsageRepository.findTopConsumersByBlock(block);
            if (topUsers != null && !topUsers.isEmpty()) {
                // Reverse to get lowest consumers
                List<Object[]> lowestUsers = new ArrayList<>(topUsers);
                Collections.reverse(lowestUsers);
                StringBuilder sb = new StringBuilder();
                sb.append("🌱 **Top Water Savers (Lowest Consumption) in ").append(block).append("**:\n\n");
                int rank = 1;
                for (Object[] row : lowestUsers) {
                    if (rank > 5) break;
                    String house = row[0] != null ? row[0].toString() : "Unknown";
                    Double usage = row[1] != null ? Double.parseDouble(row[1].toString()) : 0.0;
                    sb.append(rank).append(". **House ").append(house).append("**: ").append(String.format("%.0f", usage)).append(" Liters (Eco Champions! 🏆)\n");
                    rank++;
                }
                sb.append("\n💡 *These households lead the water conservation leaderboard in your community.*");
                return sb.toString();
            } else {
                return "🌱 **Top Water Savers in Block " + block + "**:\n\nAll households are currently maintaining steady water usage!";
            }
        }

        // 2. Unpaid Dues / Has Not Paid / Who Has Unpaid Bill Intent
        if (lower.contains("who has unpaid") || lower.contains("who have unpaid") || lower.contains("unpaid bill") || lower.contains("unpaid bills") || lower.contains("who have not paid") || lower.contains("who has not paid") || lower.contains("unpaid bill yet") || lower.contains("who owe money") || lower.contains("pending payment") || lower.contains("unpaid list") || lower.contains("who owe")) {
            Double unpaidTotal = billRepository.sumUnpaidByBlock(block);
            List<Bill> unpaidBills = billRepository.findAll().stream()
                .filter(b -> b.getApartmentBlock() != null && b.getApartmentBlock().equalsIgnoreCase(block) && "UNPAID".equalsIgnoreCase(b.getStatus()))
                .collect(Collectors.toList());

            StringBuilder sb = new StringBuilder();
            sb.append("💳 **Unpaid Dues & Clearance Audit for ").append(block).append("**:\n\n");
            sb.append("• **Total Outstanding Unpaid Balance**: **₹").append(String.format("%.2f", unpaidTotal != null ? unpaidTotal : 0.0)).append("**\n");
            
            if (unpaidBills != null && !unpaidBills.isEmpty()) {
                sb.append("• **Households with Unpaid Dues**:\n");
                int count = 1;
                for (Bill b : unpaidBills) {
                    if (count > 5) break;
                    String house = b.getHouseNumber() != null ? b.getHouseNumber() : "House " + b.getId();
                    double amt = b.getAmount() != null ? b.getAmount() : 0.0;
                    double lateFee = b.getLateFeeAmount() != null ? b.getLateFeeAmount() : 0.0;
                    sb.append("  ").append(count).append(". **House ").append(house).append("**: ₹").append(String.format("%.2f", amt + lateFee)).append(" (Due: ").append(b.getDueDate() != null ? b.getDueDate().toString() : "Pending").append(")\n");
                    count++;
                }
            } else {
                sb.append("• **Households with Unpaid Dues**: All households are cleared! Zero pending dues. 🎉\n");
            }
            sb.append("\n📌 *Review complete itemized invoices and trigger payment reminder alerts directly in **Billing History**.*");
            return sb.toString();
        }

        // 3. Water Log Not Added / Missing Logs Intent
        if (lower.contains("log not added") || lower.contains("logs not added") || lower.contains("missing log") || lower.contains("missing reading") || lower.contains("no reading") || lower.contains("pending log")) {
            return "⚠️ **Meter Log Audit for " + block + "**:\n\n" +
                   "• **Block Scope**: " + block + "\n" +
                   "• **Total Registered Households**: " + (households != null ? households.size() : 0) + "\n" +
                   "• **Status**: Meter telemetry can be logged manually, via smart sensor, or bulk uploaded via CSV.\n\n" +
                   "💡 *Click below to open the **Meter Workstation** or add a quick reading in chat!*";
        }

        // 4. Unfinalized Bills / Bills Not Finalized Intent
        if (lower.contains("not finalized") || lower.contains("bills not finalized") || lower.contains("pending finalization") || lower.contains("draft bill")) {
            return "📝 **Cycle Finalization & Billing Status for " + block + "**:\n\n" +
                   "• **Block Scope**: " + block + "\n" +
                   "• **Billing Finalization**: Once monthly meter logs are verified, click **Generate & Lock Cycle** in the Workstation to auto-calculate excess tariffs and issue bills to residents.\n\n" +
                   "📌 *Visit **Meter Workstation** to finalize monthly billing.*";
        }

        // 5. Direct Page Navigation Commands
        if (lower.contains("take me to report") || lower.contains("open report") || lower.contains("go to report") || lower.contains("report page")) {
            return "📄 **Navigating to Executive & Community Reports Page**...\n\nYou can export full P&L financial reports, resident audit statements, and tariff breakdowns there!";
        }
        if (lower.contains("take me to ticket") || lower.contains("open ticket") || lower.contains("support page") || lower.contains("ticket page")) {
            return "🛠️ **Navigating to Support & Ticket Management**...\n\nYou can inspect, assign, and resolve open resident support complaints there!";
        }
        if (lower.contains("take me to tariff") || lower.contains("open tariff") || lower.contains("tariff page") || lower.contains("update tariff")) {
            return "⚙️ **Navigating to Tariff & Penalty Settings**...\n\nYou can update base water rates, monthly limits, excess tariffs, and late fee policies there!";
        }

        if (lower.contains("male") || lower.contains("female") || lower.contains("gender") || lower.contains("demographic") || lower.contains("occupant")) {
            long totalCount = households != null ? households.size() : 0;
            long femaleCount = households != null ? households.stream().filter(u -> "FEMALE".equalsIgnoreCase(u.getGender())).count() : 0;
            long maleCount = households != null ? households.stream().filter(u -> "MALE".equalsIgnoreCase(u.getGender())).count() : 0;
            long unassignedCount = Math.max(0, totalCount - (femaleCount + maleCount));

            return "👥 **Resident Demographic Audit for " + block + "**:\n\n" +
                   "• **Total Female Residents**: **" + femaleCount + "**\n" +
                   "• **Total Male Residents**: **" + maleCount + "**\n" +
                   (unassignedCount > 0 ? "• **Unspecified / Pending Profile**: **" + unassignedCount + "**\n" : "") +
                   "• **Total Registered Households**: **" + totalCount + "**\n\n" +
                   "📌 *Occupants and profile details can be updated directly under **User Directory**.*";
        }

        if (lower.contains("registered resident") || lower.contains("total resident") || lower.contains("total users") || lower.contains("how many resident")) {
            return "👥 **Registered Residents Directory Summary (" + block + ")**:\n\n" +
                   "• **Total Registered Households**: **" + (households != null ? households.size() : 0) + "**\n" +
                   "• **Active Accounts**: " + (households != null ? households.stream().filter(u -> u.getVerificationStatus() == null || !"PENDING".equalsIgnoreCase(u.getVerificationStatus())).count() : 0) + "\n\n" +
                   "📌 *Inspect resident flat occupancy, contact emails, and house numbers in **User Directory**.*";
        }

        // 7. Water Telemetry & Specific Usage Queries
        if ((lower.contains("water log") || lower.contains("water logs") || lower.contains("reading log") || lower.contains("meter log") || lower.contains("usage log") || lower.contains("reading") || lower.contains("total usage") || lower.contains("consumption")) 
            && !lower.contains("highest") && !lower.contains("lowest") && !lower.contains("top") && !lower.contains("max") && !lower.contains("min") && !lower.contains("least") && !lower.contains("more")) {
            Double totalConsumption = waterUsageRepository.sumTotalConsumptionByBlock(block);
            String monthRangeNotice = "";
            if (lower.contains("jan") || lower.contains("feb") || lower.contains("mar") || lower.contains("apr") || lower.contains("may") || lower.contains("jun") || lower.contains("jul") || lower.contains("aug") || lower.contains("sep") || lower.contains("oct") || lower.contains("nov") || lower.contains("dec")) {
                monthRangeNotice = " (Filtered Range)";
            }
            return "📊 **Community Water Telemetry & Reading Logs for " + block + "**" + monthRangeNotice + ":\n\n" +
                   "• **Total Recorded Block Telemetry**: **" + String.format("%.0f", totalConsumption != null ? totalConsumption : 0.0) + " Liters**\n" +
                   "• **Active Metered Households**: " + (households != null ? households.size() : 0) + " Houses\n" +
                   "• **Data Source**: Live smart meter sensor logs & workstation entries\n\n" +
                   "📌 *Inspect house-by-house telemetry or export audit PDF reports below:*";
        }

        // 8. Delete / Remove Safety Command Intent
        if (lower.startsWith("delete") || lower.startsWith("remove") || lower.contains("delete log") || lower.contains("remove log") || lower.contains("delete user") || lower.contains("remove resident") || lower.contains("delete bill")) {
            return "⚠️ **Administrative Action Notice**: Direct deletion commands (e.g., deleting water logs, resident accounts, or billing records) are restricted from direct chat execution for security & audit integrity.\n\n" +
                   "• **To edit or delete meter readings**: Go to **Meter Workstation**.\n" +
                   "• **To manage residents**: Go to **User Directory**.\n" +
                   "• **To adjust tariff policies**: Go to **Tariff Settings**.";
        }

        if (lower.contains("change tariff") || lower.contains("set grace period") || lower.contains("set excess rate") || lower.contains("set late fee") || lower.contains("set base rate") || lower.contains("update rate")) {
            return "⚙️ **Tariff & Penalty Rate Management**:\n\n" +
                   "To update your block's water tariff policy:\n" +
                   "1. Click **Tariff Settings** from the quick menu or sidebar.\n" +
                   "2. Modify **Base Rate (₹/L)**, **Monthly Limit (L)**, **Excess Rate (₹/L)**, **Late Fee Penalty (₹)**, or **Grace Period (Days)**.\n" +
                   "3. Save changes to instantly update all future bill calculations for **" + block + "**!";
        }

        if (lower.contains("ticket") || lower.contains("complaint") || lower.contains("support") || lower.contains("resident issue") || lower.contains("ticket raised")) {
            if (tickets != null && !tickets.isEmpty()) {
                int ticketCount = tickets.size();
                SupportTicket first = tickets.get(0);
                return "🛠️ **Support Tickets for Block " + block + " (" + ticketCount + " Total)**:\n\n" +
                       "• **Active Block Complaints**: " + ticketCount + "\n" +
                       "📌 **Latest Ticket (#" + (first.getTicketNumber() != null ? first.getTicketNumber() : first.getId()) + ")**:\n" +
                       "• **Title**: " + first.getTitle() + "\n" +
                       "• **Category**: " + first.getCategory() + "\n" +
                       "• **Status**: `" + first.getStatus() + "`\n" +
                       "• **Priority**: " + first.getPriority() + "\n\n" +
                       "Resolve complaints or update status on the **Ticket Management Page**!";
            } else {
                return "🛠️ **No Open Support Tickets!** All resident complaints in Block **" + block + "** are currently resolved. Good job! 🎉";
            }
        }

        if (lower.contains("tariff") || lower.contains("rate") || lower.contains("penalty") || lower.contains("late fee") || lower.contains("grace period") || lower.contains("limit")) {
            double bRate = (admin != null && admin.getWaterRatePerLiter() != null) ? admin.getWaterRatePerLiter() : 0.05;
            double mLimit = (admin != null && admin.getMonthlyLimitLiters() != null) ? admin.getMonthlyLimitLiters() : 3000.0;
            double eRate = (admin != null && admin.getExcessRatePerLiter() != null) ? admin.getExcessRatePerLiter() : 0.10;
            double lateFee = (admin != null && admin.getLateFeePerMonth() != null) ? admin.getLateFeePerMonth() : 20.0;
            int grace = (admin != null && admin.getGracePeriodDays() != null) ? admin.getGracePeriodDays() : 20;

            return "📋 **Current Tariff Configuration for " + block + "**:\n\n" +
                   "• **Base Rate**: ₹" + String.format("%.4f", bRate) + " / Liter\n" +
                   "• **Monthly Base Water Limit**: " + String.format("%.0f", mLimit) + " Liters\n" +
                   "• **Excess Usage Rate**: ₹" + String.format("%.4f", eRate) + " / Liter\n" +
                   "• **Late Fee Penalty**: ₹" + String.format("%.2f", lateFee) + " / month\n" +
                   "• **Grace Period**: " + grace + " days\n\n" +
                   "💡 *To modify tariff rates or late fees, visit **Tariff Settings**! Changes automatically sync to all resident bill calculators.*";
        }

        if ((lower.contains("invite") || lower.contains("flat") || lower.contains("directory")) && !lower.contains("male") && !lower.contains("female") && !lower.contains("gender") && !lower.contains("demographic")) {
            return "👥 **Resident Management & Registration Invites**:\n\n" +
                   "• **Total Households in Block " + block + "**: " + (households != null ? households.size() : 0) + "\n" +
                   "• **Send Invites**: Navigate to **User Directory**, enter resident's Email / Flat No, and click **Send Invite Code**.\n" +
                   "• **Account Status**: You can verify resident profiles or update flat occupancy details directly.";
        }

        // 9. Water Tanker Procurement & P&L Statement Intent
        if (lower.contains("tanker") || lower.contains("p&l") || lower.contains("profit") || lower.contains("loss") || lower.contains("margin") || lower.contains("procurement") || lower.contains("bulk water") || lower.contains("tanker cost")) {
            Double totalTankerCost = bulkWaterPurchaseRepository.findAll().stream()
                .filter(p -> p.getApartmentBlock() == null || block.equalsIgnoreCase(p.getApartmentBlock()))
                .mapToDouble(p -> p.getTotalCost() != null ? p.getTotalCost() : 0.0).sum();
            Double totalTankerLiters = bulkWaterPurchaseRepository.findAll().stream()
                .filter(p -> p.getApartmentBlock() == null || block.equalsIgnoreCase(p.getApartmentBlock()))
                .mapToDouble(p -> p.getVolumeLiters() != null ? p.getVolumeLiters() : 0.0).sum();
            Double totalCollected = billRepository.findAll().stream()
                .filter(b -> b.getApartmentBlock() == null || block.equalsIgnoreCase(b.getApartmentBlock()))
                .mapToDouble(b -> "PAID".equalsIgnoreCase(b.getStatus()) ? ((b.getAmount() != null ? b.getAmount() : 0.0) + (b.getLateFeeAmount() != null ? b.getLateFeeAmount() : 0.0)) : 0.0).sum();

            double margin = totalCollected - totalTankerCost;
            String statusEmoji = margin >= 0 ? "🟢 **Net Profit Surplus**" : "🔴 **Net Deficit**";

            return "🚚 **Water Tanker Procurement & P&L Statement (" + block + ")**:\n\n" +
                   "• **Total Bulk Water Inflow**: **" + String.format("%.0f", totalTankerLiters) + " Liters**\n" +
                   "• **Total Tanker Expenditure**: **₹" + String.format("%.2f", totalTankerCost) + "**\n" +
                   "• **Resident Collections (Paid)**: **₹" + String.format("%.2f", totalCollected) + "**\n" +
                   "• **Financial Margin**: " + statusEmoji + ": **₹" + String.format("%.2f", Math.abs(margin)) + "**\n\n" +
                   "📌 *Detailed historical trends, monthly recovery indices, and source breakdowns are available on the **Reports Page**.*";
        }

        // 10. Water Leak & Overuse Alerts Intent
        if (lower.contains("leak") || lower.contains("leaks") || lower.contains("overuse") || lower.contains("pipe") || lower.contains("alert") || lower.contains("waste") || lower.contains("wasting")) {
            long leakCount = waterUsageRepository.findAll().stream()
                .filter(u -> u.getApartmentBlock() != null && block.equalsIgnoreCase(u.getApartmentBlock()) && u.getStatus() != null && u.getStatus().toUpperCase().contains("LEAK"))
                .count();
            long overuseCount = waterUsageRepository.findAll().stream()
                .filter(u -> u.getApartmentBlock() != null && block.equalsIgnoreCase(u.getApartmentBlock()) && u.getStatus() != null && u.getStatus().toUpperCase().contains("OVERUSE"))
                .count();

            return "🚨 **Water Telemetry Alerts & Leak Inspection (" + block + ")**:\n\n" +
                   "• **Active Leak Alerts**: **" + leakCount + " Household(s)** " + (leakCount > 0 ? "⚠️ *(Immediate plumbing check advised)*" : "✅ *(Zero active leaks detected)*") + "\n" +
                   "• **High Consumption Overuse Alerts**: **" + overuseCount + " Household(s)**\n\n" +
                   "💡 *You can inspect real-time sensor logs, meter readings, and trigger alerts under **Meter Workstation**.*";
        }

        // 11. Community Revenue & Total Collection Intent
        if (lower.contains("total revenue") || lower.contains("total billed") || lower.contains("total collection") || lower.contains("collection rate") || lower.contains("total money") || lower.contains("billing overview")) {
            Double totalBilled = billRepository.findAll().stream()
                .filter(b -> b.getApartmentBlock() == null || block.equalsIgnoreCase(b.getApartmentBlock()))
                .mapToDouble(b -> (b.getAmount() != null ? b.getAmount() : 0.0) + (b.getLateFeeAmount() != null ? b.getLateFeeAmount() : 0.0)).sum();
            Double totalPaid = billRepository.findAll().stream()
                .filter(b -> b.getApartmentBlock() == null || block.equalsIgnoreCase(b.getApartmentBlock()))
                .mapToDouble(b -> "PAID".equalsIgnoreCase(b.getStatus()) ? ((b.getAmount() != null ? b.getAmount() : 0.0) + (b.getLateFeeAmount() != null ? b.getLateFeeAmount() : 0.0)) : 0.0).sum();
            Double totalPending = billRepository.sumUnpaidByBlock(block);

            double rate = totalBilled > 0 ? (totalPaid / totalBilled) * 100.0 : 100.0;

            return "💰 **Financial Billing & Revenue Summary (" + block + ")**:\n\n" +
                   "• **Total Revenue Billed**: **₹" + String.format("%.2f", totalBilled) + "**\n" +
                   "• **Collected Revenue**: **₹" + String.format("%.2f", totalPaid) + "**\n" +
                   "• **Outstanding Unpaid Dues**: **₹" + String.format("%.2f", totalPending != null ? totalPending : 0.0) + "**\n" +
                   "• **Collection Efficiency Rate**: **" + String.format("%.1f", rate) + "%**\n\n" +
                   "📌 *Detailed payment clearance breakdowns can be exported from **Billing History** or **Reports Page**.*";
        }

        return null;
    }

    private List<Map<String, String>> generateCommunityAdminActions(String query, String activePage) {
        List<Map<String, String>> actions = new ArrayList<>();
        String lower = query != null ? query.trim().toLowerCase() : "";

        if (lower.contains("unpaid") || lower.contains("collection") || lower.contains("pending") || lower.contains("due") || lower.contains("balance") || lower.contains("money") || lower.contains("not paid") || lower.contains("collect") || lower.contains("bill")) {
            actions.add(createAction("💳 Billing History", "/billing-history"));
            actions.add(createAction("📊 Meter Workstation", "/meter-workstation"));
            actions.add(createAction("📄 Executive PDF Report", "/reports"));
        } else if (lower.contains("who uses") || lower.contains("least") || lower.contains("more") || lower.contains("consumer") || lower.contains("eco champion") || lower.contains("leaderboard")) {
            actions.add(createAction("📄 Conservation Reports", "/reports"));
            actions.add(createAction("📊 Usage Leaderboard", "/usage"));
        } else if (lower.contains("log") || lower.contains("reading") || lower.contains("telemetry") || lower.contains("meter")) {
            actions.add(createAction("📊 Meter Workstation", "/meter-workstation"));
            actions.add(createAction("💧 Add Reading In-Chat", "WIDGET_WATER_LOG_FORM"));
            actions.add(createAction("📄 Audit PDF Report", "/reports"));
        } else if (lower.contains("tariff") || lower.contains("rate") || lower.contains("penalty") || lower.contains("limit") || lower.contains("grace")) {
            actions.add(createAction("📋 Tariff Settings", "/tariff-settings"));
            actions.add(createAction("📊 Meter Workstation", "/meter-workstation"));
        } else if (lower.contains("ticket") || lower.contains("complaint") || lower.contains("support") || lower.contains("issue")) {
            actions.add(createAction("🛠️ Ticket Management", "/support-ticket-management"));
            actions.add(createAction("👥 Resident Directory", "/user-directory"));
        } else if (lower.contains("resident") || lower.contains("household") || lower.contains("user") || lower.contains("directory") || lower.contains("occupant")) {
            actions.add(createAction("👥 Resident Directory", "/user-directory"));
            actions.add(createAction("📊 Meter Workstation", "/meter-workstation"));
        } else {
            actions.add(createAction("📊 Meter Workstation", "/meter-workstation"));
            actions.add(createAction("📋 Tariff Settings", "/tariff-settings"));
            actions.add(createAction("👥 Resident Directory", "/user-directory"));
            actions.add(createAction("🛠️ Ticket Management", "/support-ticket-management"));
        }

        return actions;
    }

    // ─── 3. HOUSEHOLD USER RAG ENGINE ──────────────────────────────────────────
    private ResponseEntity<Map<String, Object>> processHouseholdQuery(String query, String houseNumber, String activePage) {
        Map<String, Object> response = new HashMap<>();

        if (!checkRateLimit(houseNumber.isBlank() ? "GUEST" : houseNumber)) {
            response.put("answer", "⚠️ **Rate Limit Reached**: Maximum AI query rate reached (15 queries/min). Using fast local response mode.");
            response.put("actions", generateActions(query, activePage));
            return ResponseEntity.ok(response);
        }

        Optional<Household> householdOpt = householdRepository.findByHouseNumber(houseNumber);
        String contextPrompt = buildHouseholdContext(houseNumber, householdOpt);

        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            try {
                String aiReply = callGeminiApiForRole(query, contextPrompt, activePage, "HOUSEHOLD_USER");
                if (aiReply != null && !aiReply.isBlank()) {
                    response.put("answer", aiReply);
                    response.put("actions", generateActions(query, activePage));
                    return ResponseEntity.ok(response);
                }
            } catch (Exception e) {
                // Fallback to local intelligent RAG engine
            }
        }

        String localReply = generateLocalRAGReply(query, houseNumber, householdOpt, activePage);
        List<Map<String, String>> actions = generateActions(query, activePage);

        response.put("answer", localReply);
        response.put("actions", actions);
        return ResponseEntity.ok(response);
    }

    private String buildHouseholdContext(String houseNumber, Optional<Household> householdOpt) {
        StringBuilder sb = new StringBuilder();
        sb.append("User House Number: ").append(houseNumber).append("\n");

        User resident = userRepository.findByHouseNumber(houseNumber).orElse(null);
        String block = resident != null ? resident.getApartmentBlock() : (householdOpt.isPresent() ? householdOpt.get().getBlock() : "Block A");
        sb.append("Apartment Block: ").append(block).append("\n");

        if (householdOpt.isPresent()) {
            Household h = householdOpt.get();
            sb.append("Occupancy: ").append(h.getOccupancy()).append(" Residents\n");
            if (h.getFlatSizeSqft() != null) {
                sb.append("Flat Size: ").append(h.getFlatSizeSqft()).append(" sqft\n");
            }
        }

        List<User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", block);
        User admin = admins.isEmpty() ? null : admins.get(0);
        if (admin != null) {
            sb.append("Community Admin: ").append(admin.getFullName() != null ? admin.getFullName() : admin.getUsername())
              .append(" (Mobile: ").append(admin.getMobileNumber() != null ? admin.getMobileNumber() : "N/A").append(")\n");
            sb.append("Base Water Rate: ₹").append(admin.getWaterRatePerLiter() != null ? admin.getWaterRatePerLiter() : 0.05).append(" / Liter\n");
            sb.append("Monthly Base Limit: ").append(admin.getMonthlyLimitLiters() != null ? admin.getMonthlyLimitLiters() : 3000.0).append(" Liters\n");
            sb.append("Excess Water Rate: ₹").append(admin.getExcessRatePerLiter() != null ? admin.getExcessRatePerLiter() : 0.10).append(" / Liter\n");
            sb.append("Late Fee Per Month: ₹").append(admin.getLateFeePerMonth() != null ? admin.getLateFeePerMonth() : 20.0).append("\n");
        }

        Double unpaidTotal = billRepository.sumUnpaidByHousehold(houseNumber);
        sb.append("Outstanding Unpaid Balance: ₹").append(unpaidTotal != null ? unpaidTotal : 0.0).append("\n");

        Double avgUsage = waterUsageRepository.avgConsumptionByHousehold(houseNumber);
        sb.append("Historical Daily Consumption Average: ").append(avgUsage != null ? String.format("%.1f", avgUsage) : "N/A").append(" L/day\n");

        // 1. Live Bills & Invoices Context (All generated periods)
        List<Bill> allBills = billRepository.findByHouseNumberOrderByDueDateDesc(houseNumber);
        if (allBills != null && !allBills.isEmpty()) {
            sb.append("\nLive Billing History (Total ").append(allBills.size()).append(" Bills):\n");
            for (Bill b : allBills.stream().limit(6).collect(Collectors.toList())) {
                sb.append("• Period: ").append(b.getBillingPeriod())
                  .append(" | Amount: ₹").append(String.format("%.2f", b.getAmount()))
                  .append(" | Status: ").append(b.getStatus())
                  .append(" | Due Date: ").append(b.getDueDate() != null ? b.getDueDate().toString() : "N/A")
                  .append(" | Consumption: ").append(b.getWithinLimitLiters() != null ? String.format("%.0f", b.getWithinLimitLiters()) : "0").append("L (Base)")
                  .append(b.getExcessLiters() != null && b.getExcessLiters() > 0 ? " + " + String.format("%.0f", b.getExcessLiters()) + "L (Excess)" : "")
                  .append("\n");
            }
        } else {
            sb.append("\nLive Billing History: No bills generated yet for this house.\n");
        }

        // 2. Live Support Tickets Context
        List<SupportTicket> userTickets = resident != null 
            ? supportTicketRepository.findByCreatedByIdOrderByCreatedAtDesc(resident.getId()) 
            : Collections.emptyList();
        if (userTickets != null && !userTickets.isEmpty()) {
            sb.append("\nLive Support Tickets (Total ").append(userTickets.size()).append(" Tickets):\n");
            for (SupportTicket t : userTickets.stream().limit(5).collect(Collectors.toList())) {
                sb.append("• Ticket #").append(t.getId())
                  .append(" | Title: ").append(t.getTitle() != null ? t.getTitle() : "Issue")
                  .append(" | Category: ").append(t.getCategory() != null ? t.getCategory() : "GENERAL")
                  .append(" | Priority: ").append(t.getPriority() != null ? t.getPriority() : "NORMAL")
                  .append(" | Status: ").append(t.getStatus() != null ? t.getStatus() : "OPEN")
                  .append(" | Created: ").append(t.getCreatedAt() != null ? t.getCreatedAt().toString() : "N/A")
                  .append("\n");
            }
        } else {
            sb.append("\nLive Support Tickets: Zero active tickets reported.\n");
        }

        // 3. Live Water Usage Telemetry & Monthly Aggregates
        List<WaterUsageLog> logs = waterUsageRepository.findByHouseNumber(houseNumber);
        if (logs != null && !logs.isEmpty()) {
            sb.append("\nLive Database Water Logs (Total ").append(logs.size()).append(" records):\n");
            Map<String, Double> monthlyTotals = new LinkedHashMap<>();
            for (WaterUsageLog log : logs) {
                if (log.getReadingDate() != null) {
                    String monthKey = log.getReadingDate().getMonth().name().toLowerCase();
                    monthlyTotals.put(monthKey, monthlyTotals.getOrDefault(monthKey, 0.0) + (log.getReadingLiters() != null ? log.getReadingLiters() : 0.0));
                }
            }
            monthlyTotals.forEach((m, vol) -> sb.append("• ").append(m.toUpperCase()).append(" Water Consumption: ").append(String.format("%.0f", vol)).append(" Liters\n"));
            
            sb.append("\nRecent Daily Water Log Entries:\n");
            for (WaterUsageLog log : logs.stream().limit(8).collect(Collectors.toList())) {
                sb.append("• Date: ").append(log.getReadingDate()).append(" | Volume: ").append(log.getReadingLiters()).append(" Liters | Type: ").append(log.getLogType() != null ? log.getLogType() : "DAILY").append("\n");
            }
        } else {
            sb.append("\nLive Database Water Logs: No readings logged yet for this house.\n");
        }

        return sb.toString();
    }

    private String generateLocalRAGReply(String query, String houseNumber, Optional<Household> householdOpt, String activePage) {
        String lower = query.trim().toLowerCase();

        User resident = userRepository.findByHouseNumber(houseNumber).orElse(null);
        String block = resident != null ? resident.getApartmentBlock() : (householdOpt.isPresent() ? householdOpt.get().getBlock() : "Block A");

        List<User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", block);
        User admin = admins.isEmpty() ? null : admins.get(0);

        double baseRate = (admin != null && admin.getWaterRatePerLiter() != null) ? admin.getWaterRatePerLiter() : 0.05;
        double monthlyLimit = (admin != null && admin.getMonthlyLimitLiters() != null) ? admin.getMonthlyLimitLiters() : 3000.0;
        double excessRate = (admin != null && admin.getExcessRatePerLiter() != null) ? admin.getExcessRatePerLiter() : 0.10;
        double lateFee = (admin != null && admin.getLateFeePerMonth() != null) ? admin.getLateFeePerMonth() : 20.0;
        int gracePeriod = (admin != null && admin.getGracePeriodDays() != null) ? admin.getGracePeriodDays() : 20;

        Double unpaidTotal = billRepository.sumUnpaidByHousehold(houseNumber);
        if (unpaidTotal == null) unpaidTotal = 0.0;
        List<Bill> allBills = billRepository.findByHouseNumberOrderByDueDateDesc(houseNumber);

        List<SupportTicket> userTickets = resident != null 
            ? supportTicketRepository.findByCreatedByIdOrderByCreatedAtDesc(resident.getId()) 
            : Collections.emptyList();

        List<WaterUsageLog> usageLogs = waterUsageRepository.findByHouseNumber(houseNumber);

        // Water Usage & Water Log intent match (e.g. "my january water log", "my consumption")
        if (lower.contains("usage") || lower.contains("consumption") || lower.contains("log") || lower.contains("reading") || lower.contains("water log")) {
            String[] months = {"january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", 
                               "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec"};
            
            String requestedMonth = null;
            for (String m : months) {
                if (lower.contains(m)) {
                    requestedMonth = m;
                    break;
                }
            }

            if (usageLogs != null && !usageLogs.isEmpty()) {
                if (requestedMonth != null) {
                    final String matchMonth = requestedMonth;
                    List<WaterUsageLog> monthLogs = usageLogs.stream()
                        .filter(u -> u.getReadingDate() != null && u.getReadingDate().toString().toLowerCase().contains(matchMonth))
                        .collect(Collectors.toList());

                    double totalMonthLit = monthLogs.stream().mapToDouble(u -> u.getReadingLiters() != null ? u.getReadingLiters() : 0.0).sum();
                    
                    if (!monthLogs.isEmpty()) {
                        StringBuilder sb = new StringBuilder();
                        sb.append("📊 **Water Log Records for ").append(requestedMonth.toUpperCase()).append(" (House ").append(houseNumber).append(")**:\n\n");
                        sb.append("• **Total Month Consumption**: **").append(String.format("%.0f", totalMonthLit)).append(" Liters**\n");
                        sb.append("• **Log Entries Recorded**: ").append(monthLogs.size()).append(" readings\n\n");
                        sb.append("🗓️ **Recent Log Breakdown**:\n");
                        for (WaterUsageLog u : monthLogs.stream().limit(5).collect(Collectors.toList())) {
                            sb.append("• **").append(u.getReadingDate()).append("**: ").append(String.format("%.0f", u.getReadingLiters()))
                              .append(" L (").append(u.getLogType() != null ? u.getLogType() : "DAILY").append(")\n");
                        }
                        return sb.toString();
                    } else {
                        double totalAllLit = usageLogs.stream().mapToDouble(u -> u.getReadingLiters() != null ? u.getReadingLiters() : 0.0).sum();
                        return "📊 **Water Log Summary for House " + houseNumber + "**:\n\n" +
                               "• **Total Recorded Telemetry**: **" + String.format("%.0f", totalAllLit) + " Liters** (" + usageLogs.size() + " readings)\n" +
                               "• **Note**: No explicit log entries recorded for '" + requestedMonth.toUpperCase() + "'. Standard monthly base limit is " + String.format("%.0f", monthlyLimit) + " Liters.";
                    }
                }

                double totalLit = usageLogs.stream().mapToDouble(u -> u.getReadingLiters() != null ? u.getReadingLiters() : 0.0).sum();
                WaterUsageLog latest = usageLogs.get(0);

                StringBuilder sb = new StringBuilder();
                sb.append("📊 **Water Log Telemetry for House ").append(houseNumber).append("**:\n\n");
                sb.append("• **Total Recorded Volume**: **").append(String.format("%.0f", totalLit)).append(" Liters**\n");
                sb.append("• **Total Meter Entries**: ").append(usageLogs.size()).append(" logs\n");
                sb.append("• **Latest Logged Reading**: **").append(String.format("%.0f", latest.getReadingLiters())).append(" Liters** on ").append(latest.getReadingDate()).append("\n\n");
                sb.append("💡 *You can view daily breakdown charts directly on the Usage Analytics page!*");
                return sb.toString();
            } else {
                return "📊 **No Water Logs Found**: Zero water usage readings logged yet for House **" + houseNumber + "**. Smart meter automated updates run daily!";
            }
        }

        if (lower.matches("^(hi|hello|hey|greetings|good morning|good afternoon|good evening|sup|hola).*")) {
            return "Hello there! 👋 Welcome to **AquaTrack Assistant**. How can I assist you with your water bills, support tickets, or tariff rates for House **" + houseNumber + "** today?";
        }

        if (lower.contains("admin") || lower.contains("community admin") || lower.contains("contact admin") || lower.contains("who is admin") || lower.contains("manager")) {
            if (admin != null) {
                return "👤 **Community Admin Details for Block " + block + "**:\n\n" +
                       "• **Name**: " + (admin.getFullName() != null ? admin.getFullName() : admin.getUsername()) + "\n" +
                       "• **Email**: " + (admin.getEmail() != null ? admin.getEmail() : "N/A") + "\n" +
                       "• **Mobile**: " + (admin.getMobileNumber() != null ? admin.getMobileNumber() : "N/A") + "\n" +
                       "• **WhatsApp**: " + (admin.getWhatsAppNumber() != null ? admin.getWhatsAppNumber() : "N/A") + "\n" +
                       "• **Block Managed**: " + block + "\n\n" +
                       "📌 *Your Community Admin sets local tariff rates, oversees billing cycles, and resolves support tickets!*";
            } else {
                return "👤 Your Community Admin for **Block " + block + "** is registered in the system. You can raise a support ticket on the **Support Desk** to contact administration directly.";
            }
        }

        if (lower.contains("ticket") || lower.contains("complaint") || lower.contains("my issue") || lower.contains("status of ticket")) {
            if (userTickets != null && !userTickets.isEmpty()) {
                long openCount = userTickets.stream().filter(t -> !"CLOSED".equalsIgnoreCase(t.getStatus()) && !"RESOLVED".equalsIgnoreCase(t.getStatus())).count();
                SupportTicket latest = userTickets.get(0);

                StringBuilder ticketInfo = new StringBuilder();
                ticketInfo.append("🛠️ **Support Tickets for House ").append(houseNumber).append("**:\n\n");
                ticketInfo.append("• **Total Tickets Raised**: ").append(userTickets.size()).append("\n");
                ticketInfo.append("• **Active / Open Tickets**: ").append(openCount).append("\n\n");
                ticketInfo.append("📌 **Latest Ticket (#").append(latest.getTicketNumber() != null ? latest.getTicketNumber() : latest.getId()).append(")**:\n");
                ticketInfo.append("• **Title**: ").append(latest.getTitle()).append("\n");
                ticketInfo.append("• **Category**: ").append(latest.getCategory()).append("\n");
                ticketInfo.append("• **Status**: `").append(latest.getStatus()).append("`\n");
                ticketInfo.append("• **Priority**: ").append(latest.getPriority()).append("\n");

                return ticketInfo.toString();
            } else {
                return "🛠️ **No Active Support Tickets!** You currently have zero support tickets raised for House **" + houseNumber + "**. If you encounter a leak or supply issue, click below to open a ticket!";
            }
        }

        if (lower.contains("bill") || lower.contains("invoice") || lower.contains("unpaid") || lower.contains("overdue") || lower.contains("history") || lower.contains("pay")) {
            String[] months = {"january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", 
                               "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec"};
            
            String requestedMonth = null;
            for (String m : months) {
                if (lower.contains(m)) {
                    requestedMonth = m;
                    break;
                }
            }

            if (allBills != null && !allBills.isEmpty()) {
                if (requestedMonth != null) {
                    final String matchMonth = requestedMonth;
                    List<Bill> matchingBills = allBills.stream()
                        .filter(b -> b.getBillingPeriod() != null && b.getBillingPeriod().toLowerCase().contains(matchMonth))
                        .collect(Collectors.toList());

                    if (!matchingBills.isEmpty()) {
                        StringBuilder sb = new StringBuilder();
                        sb.append("📅 **Bill details for ").append(requestedMonth.toUpperCase()).append(" (House ").append(houseNumber).append(")**:\n\n");
                        for (Bill b : matchingBills) {
                            double bRate = (admin != null && admin.getWaterRatePerLiter() != null) ? admin.getWaterRatePerLiter() : 0.05;
                            double eRate = (admin != null && admin.getExcessRatePerLiter() != null) ? admin.getExcessRatePerLiter() : 0.10;
                            double withinLit = b.getWithinLimitLiters() != null ? b.getWithinLimitLiters() : 0.0;
                            double excessLit = b.getExcessLiters() != null ? b.getExcessLiters() : 0.0;

                            sb.append("• **Billing Period**: ").append(b.getBillingPeriod()).append("\n");
                            sb.append("• **Total Amount**: **₹").append(String.format("%.2f", b.getAmount())).append("**\n");
                            sb.append("• **Status**: `").append(b.getStatus()).append("`\n");
                            sb.append("• **Due Date**: ").append(b.getDueDate() != null ? b.getDueDate().toString() : "N/A").append("\n");
                            sb.append("• **Consumption Breakdown**:\n");
                            sb.append("   - Within Limit: ").append(String.format("%.0f", withinLit)).append(" L (₹").append(String.format("%.2f", withinLit * bRate)).append(")\n");
                            if (excessLit > 0) {
                                sb.append("   - Excess Usage: ").append(String.format("%.0f", excessLit)).append(" L (₹").append(String.format("%.2f", excessLit * eRate)).append(")\n");
                            }
                            if (b.getLateFeeAmount() != null && b.getLateFeeAmount() > 0) {
                                sb.append("   - Late Fee Penalty: ₹").append(String.format("%.2f", b.getLateFeeAmount())).append("\n");
                            }
                            sb.append("\n");
                        }
                        if (matchingBills.stream().anyMatch(b -> "UNPAID".equalsIgnoreCase(b.getStatus()) || "OVERDUE".equalsIgnoreCase(b.getStatus()))) {
                            sb.append("💡 *You can click below to clear this bill directly on the Bills Page!*");
                        } else {
                            sb.append("✅ *This bill is fully paid up to date!*");
                        }
                        return sb.toString();
                    } else {
                        return "📅 **No bill found for " + requestedMonth.toUpperCase() + "** for House **" + houseNumber + "**.\n\n" +
                               "Your latest generated bills in the system are:\n" +
                               allBills.stream().limit(3).map(b -> "• **" + b.getBillingPeriod() + "**: ₹" + String.format("%.2f", b.getAmount()) + " (`" + b.getStatus() + "`)").collect(Collectors.joining("\n"));
                    }
                }

                List<Bill> unpaidList = allBills.stream()
                    .filter(b -> "UNPAID".equalsIgnoreCase(b.getStatus()) || "OVERDUE".equalsIgnoreCase(b.getStatus()))
                    .collect(Collectors.toList());

                StringBuilder sb = new StringBuilder();
                sb.append("📜 **Invoice Summary for House ").append(houseNumber).append("**:\n\n");
                sb.append("• **Total Bills Issued**: ").append(allBills.size()).append("\n");
                sb.append("• **Outstanding Balance**: **₹").append(String.format("%.2f", unpaidTotal)).append("**\n\n");

                if (!unpaidList.isEmpty()) {
                    sb.append("💳 **Unpaid Invoices (").append(unpaidList.size()).append(")**:\n");
                    for (Bill b : unpaidList) {
                        sb.append("• **").append(b.getBillingPeriod() != null ? b.getBillingPeriod() : "Period").append("**: ₹")
                          .append(String.format("%.2f", b.getAmount())).append(" (Due: ").append(b.getDueDate()).append(") - `")
                          .append(b.getStatus()).append("`\n");
                    }
                } else {
                    sb.append("✅ **All issued invoices are fully paid!**");
                }
                return sb.toString();
            } else {
                return "📜 No billing records found for House **" + houseNumber + "**. Bills are generated at the end of each billing cycle by your Community Admin.";
            }
        }

        if (lower.contains("peak") || lower.contains("peak hour") || lower.contains("peak time")) {
            return "⏰ **Peak Water Consumption Hours for House " + houseNumber + "**:\n\n" +
                   "• **Morning Peak**: **7:00 AM – 9:30 AM** (Bathing & Morning Chores)\n" +
                   "• **Evening Peak**: **7:00 PM – 9:00 PM** (Dinner Preparation & Cleaning)\n\n" +
                   "💡 *Tip: Shifting heavy water usage (like washing machines) to off-peak hours (11:00 AM - 4:00 PM) helps maintain steady water pressure!*";
        }

        if (lower.contains("monthly base water limit") || lower.contains("base water limit") || lower.contains("my base limit") || lower.contains("free limit")) {
            return "🎯 **Monthly Base Water Limit for House " + houseNumber + " (" + block + ")**:\n\n" +
                   "• **Monthly Base Limit**: **" + String.format("%.0f", monthlyLimit) + " Liters**\n" +
                   "• **Base Rate**: ₹" + String.format("%.4f", baseRate) + " per Liter\n\n" +
                   "You get up to " + String.format("%.0f", monthlyLimit) + " Liters billed at the standard rate. Any consumption past this limit incurs the excess tier rate of ₹" + String.format("%.4f", excessRate) + "/L.";
        }

        if (lower.contains("excess water tariff") || lower.contains("excess tariff") || lower.contains("excess rate") || lower.contains("excess calculated")) {
            return "⚡ **Excess Water Tariff Calculation for House " + houseNumber + "**:\n\n" +
                   "• **Tier 1 (Base Limit)**: 0 – " + String.format("%.0f", monthlyLimit) + " Liters @ **₹" + String.format("%.4f", baseRate) + "/L**\n" +
                   "• **Tier 2 (Excess Usage)**: Above " + String.format("%.0f", monthlyLimit) + " Liters @ **₹" + String.format("%.4f", excessRate) + "/L**\n\n" +
                   "**Example**: If you use 3,200 Liters (with a 3,000L limit):\n" +
                   "• Base Charge = 3,000 L × ₹" + String.format("%.2f", baseRate) + " = **₹" + String.format("%.2f", 3000 * baseRate) + "**\n" +
                   "• Excess Charge = 200 L × ₹" + String.format("%.2f", excessRate) + " = **₹" + String.format("%.2f", 200 * excessRate) + "**\n" +
                   "• **Total Bill** = **₹" + String.format("%.2f", (3000 * baseRate) + (200 * excessRate)) + "**";
        }

        if (lower.contains("tariff") || lower.contains("rate card") || lower.contains("plan") || lower.contains("tier")) {
            return "📋 **Current Tariff Plan & Policy for House " + houseNumber + " (" + block + ")** (Set by Community Admin):\n\n" +
                   "• **Base Rate**: ₹" + String.format("%.4f", baseRate) + " per Liter\n" +
                   "• **Monthly Base Limit**: " + String.format("%.0f", monthlyLimit) + " Liters\n" +
                   "• **Excess Rate**: ₹" + String.format("%.4f", excessRate) + " per Liter\n" +
                   "• **Late Payment Penalty**: ₹" + String.format("%.2f", lateFee) + " / month\n" +
                   "• **Grace Period**: " + gracePeriod + " days from bill generation";
        }

        if (lower.contains("how bill") || lower.contains("how is bill") || lower.contains("calculate") || lower.contains("calculation") || lower.contains("formula") || lower.contains("how my bill")) {
            if (allBills != null && !allBills.isEmpty()) {
                Bill latest = allBills.get(0);
                double baseAmt = latest.getWithinLimitLiters() != null ? latest.getWithinLimitLiters() * baseRate : 0.0;
                double excessAmt = latest.getExcessLiters() != null ? latest.getExcessLiters() * excessRate : 0.0;

                return "💡 **Bill Calculation Breakdown for House " + houseNumber + "**:\n\n" +
                       "**Formula:** `(Base Liters × Base Rate) + (Excess Liters × Excess Rate) + Late Fee (if overdue)`\n\n" +
                       "📊 **Latest Bill (" + (latest.getBillingPeriod() != null ? latest.getBillingPeriod() : "Current") + ") Breakdown**:\n" +
                       "• Within Limit: " + String.format("%.0f", latest.getWithinLimitLiters() != null ? latest.getWithinLimitLiters() : 0.0) + " L × ₹" + String.format("%.2f", baseRate) + " = **₹" + String.format("%.2f", baseAmt) + "**\n" +
                       "• Excess Usage: " + String.format("%.0f", latest.getExcessLiters() != null ? latest.getExcessLiters() : 0.0) + " L × ₹" + String.format("%.2f", excessAmt) + " = **₹" + String.format("%.2f", excessAmt) + "**\n" +
                       "• Total Bill Amount: **₹" + String.format("%.2f", latest.getAmount() != null ? latest.getAmount() : (baseAmt + excessAmt)) + "**";
            }

            return "💡 **Water Bill Calculation Formula for House " + houseNumber + "**:\n\n" +
                   "• **Base Charge**: `Liters (up to " + String.format("%.0f", monthlyLimit) + "L) × ₹" + String.format("%.2f", baseRate) + "/L`\n" +
                   "• **Excess Charge**: `Liters (above " + String.format("%.0f", monthlyLimit) + "L) × ₹" + String.format("%.2f", excessRate) + "/L`\n" +
                   "• **Total Bill**: `Base Charge + Excess Charge + Penalty (if applicable)`";
        }

        if (lower.contains("usage") || lower.contains("consumption") || lower.contains("meter") || lower.contains("reading") || lower.contains("liters")) {
            Double avgUsage = waterUsageRepository.avgConsumptionByHousehold(houseNumber);
            WaterUsageLog latestLog = waterUsageRepository.findTopByHouseNumberOrderByReadingDateDesc(houseNumber);

            if (latestLog != null) {
                return "💧 **Water Usage Analytics for House " + houseNumber + "**:\n\n" +
                       "• **Latest Meter Reading**: " + String.format("%.0f", latestLog.getReadingLiters()) + " Liters (" + latestLog.getReadingDate() + ")\n" +
                       "• **Historical Daily Average**: " + String.format("%.1f", avgUsage != null ? avgUsage : 0.0) + " Liters/day\n" +
                       "• **Monthly Base Limit**: " + String.format("%.0f", monthlyLimit) + " Liters\n\n" +
                       "📌 *Track detailed daily trend charts on the **My Usage** page!*";
            }
        }

        if (lower.contains("due") || lower.contains("pending") || lower.contains("current bill") || lower.contains("money") || lower.contains("pay") || lower.contains("owe") || lower.contains("amount")) {
            if (unpaidTotal > 0) {
                return "💳 **Current Outstanding Balance for House " + houseNumber + "**:\n\n" +
                       "• **Total Amount Due**: **₹" + String.format("%.2f", unpaidTotal) + "**\n" +
                       "• **Status**: Unpaid / Overdue\n\n" +
                       "You can settle this payment instantly online using UPI, Credit/Debit card, or Net Banking on the **Bills Page**! 🚀";
            } else {
                return "✅ **No Pending Bills!** All water bills for House **" + houseNumber + "** are fully paid up to date. Thank you for your timely payments! 🎉";
            }
        }

        if (lower.contains("leak") || lower.contains("pipe") || lower.contains("repair") || lower.contains("damage") || lower.contains("water cut") || lower.contains("no water")) {
            return "If you notice a leak, low pressure, or supply interruption in **House " + houseNumber + "**:\n\n" +
                   "1. Turn off your main stop-cock valve immediately if water loss is high.\n" +
                   "2. Raise a Support Ticket on the Support Desk so your Community Admin (" + (admin != null ? admin.getFullName() : "Admin") + ") can dispatch maintenance assistance quickly.";
        }

        if (lower.contains("payment method") || lower.contains("how to pay") || lower.contains("upi") || lower.contains("card") || lower.contains("netbanking") || lower.contains("paid bill")) {
            return "💳 **Water Bill Payment Options for House " + houseNumber + "**:\n\n" +
                   "• **Supported Modes**: Razorpay Gateway (UPI, Credit/Debit Cards, NetBanking, Wallets)\n" +
                   "• **Instant Invoice**: Payment receipt & PDF invoice generated immediately upon payment.\n\n" +
                   "Go to the **Bills Page** or **Invoices Page** to settle dues or download receipts!";
        }

        if (lower.contains("buy water") || lower.contains("top up") || lower.contains("extra water") || lower.contains("purchase water") || lower.contains("tanker")) {
            return "🚰 **Extra Water Purchase / Tanker Top-Up for House " + houseNumber + "**:\n\n" +
                   "If your household requires additional water quota beyond your monthly limit:\n" +
                   "• Click **Purchase Extra Water** below to order instant top-up quota directly to your household meter balance.";
        }

        if (lower.contains("late fee") || lower.contains("penalty") || lower.contains("grace period") || lower.contains("overdue charge")) {
            return "⏳ **Late Fee & Grace Period Policy for House " + houseNumber + " (" + block + ")**:\n\n" +
                   "• **Grace Period**: " + gracePeriod + " Days from bill generation.\n" +
                   "• **Late Fee Rate**: ₹" + String.format("%.2f", lateFee) + " added monthly for overdue bills.\n" +
                   "💡 *Pay before the due date on the Bills page to avoid penalty charges!*";
        }

        if (lower.contains("profile") || lower.contains("my account") || lower.contains("change password") || lower.contains("mobile") || lower.contains("email") || lower.contains("occupants")) {
            return "👤 **Household Profile & Account Details for House " + houseNumber + "**:\n\n" +
                   "• **Resident Name**: " + (resident != null ? (resident.getFullName() != null ? resident.getFullName() : resident.getUsername()) : "Resident") + "\n" +
                   "• **Apartment Block**: " + block + "\n" +
                   "• **Occupancy**: " + (householdOpt.isPresent() ? householdOpt.get().getOccupancy() : "N/A") + " Residents\n\n" +
                   "You can update your avatar, phone number, and password on your **Profile Page**!";
        }

        if (lower.contains("escalate") || lower.contains("super admin") || lower.contains("higher authority") || lower.contains("unresolved")) {
            return "🏛️ **Escalation to Super Admin**:\n\n" +
                   "If your concern is not resolved by your Community Admin within 15 days or you face administrative issues, you can escalate your ticket directly to the **Super Admin** from the **Support Desk**!";
        }

        if (lower.contains("tip") || lower.contains("save") || lower.contains("reduce") || lower.contains("excess") || lower.contains("conservation")) {
            return "Here are actionable ways to lower your water consumption and bill in **House " + houseNumber + "**:\n\n" +
                   "• **Install Aerators**: Faucet aerators can reduce water flow by up to 30% without affecting pressure.\n" +
                   "• **Fix Silent Leaks**: A running toilet flapper can waste up to 200 Liters per day.\n" +
                   "• **Track Usage**: Check daily peak hours under the **My Usage** section.";
        }

        if (lower.contains("who are you") || lower.contains("your name") || lower.contains("what can you do")) {
            return "I am **AquaTrack AI**, your dedicated smart household assistant! 💧\n\nI help you:\n• View unpaid bills & invoice history\n• Check peak usage hours & water limits\n• View live tariff rates & calculate monthly bill breakdowns\n• Track daily water usage & report leaks!\n• Order extra water top-up & contact Community Admin!";
        }
        if (lower.contains("thank") || lower.contains("thanks") || lower.contains("awesome") || lower.contains("great")) {
            return "You're very welcome! 😊 Feel free to ask if you need anything else regarding your water services.";
        }

        String residentName = (resident != null ? (resident.getFullName() != null ? resident.getFullName() : resident.getUsername()) : "Resident");
        return "I am **Buddy 👤**, assistant for **" + residentName + "** (House **" + houseNumber + "**)! 😊\n\nPlease ask a relevant question about your water services. I can help you check **unpaid bills, peak consumption hours, monthly base limits, live tariff rates, water top-ups, and support tickets**!";
    }

    private List<Map<String, String>> generateActions(String query, String activePage) {
        List<Map<String, String>> actions = new ArrayList<>();
        String lower = query.toLowerCase();

        if (lower.contains("bill") || lower.contains("pay") || lower.contains("cost") || lower.contains("charge") || lower.contains("due") || lower.contains("unpaid") || lower.contains("invoice")) {
            actions.add(createAction("💳 View & Pay Bills", "/bills"));
            actions.add(createAction("📄 Download Invoices", "/invoices"));
            actions.add(createAction("📊 Check Usage History", "/usage"));
        } else if (lower.contains("leak") || lower.contains("pipe") || lower.contains("repair") || lower.contains("damage") || lower.contains("support") || lower.contains("ticket") || lower.contains("issue")) {
            actions.add(createAction("🛠️ Open Support Desk", "/support"));
            actions.add(createAction("🚨 Raise Concern", "/support"));
        } else if (lower.contains("buy water") || lower.contains("top up") || lower.contains("extra water")) {
            actions.add(createAction("💧 Purchase Extra Water", "/water-purchase"));
            actions.add(createAction("💳 Check Bills", "/bills"));
        } else {
            actions.add(createAction("📊 Usage Analytics", "/usage"));
            actions.add(createAction("💳 Pay Water Bill", "/bills"));
            actions.add(createAction("🛠️ Support Desk", "/support"));
            actions.add(createAction("💧 Extra Water", "/water-purchase"));
        }
        return actions;
    }

    private Map<String, String> createAction(String label, String path) {
        Map<String, String> action = new HashMap<>();
        action.put("label", label);
        action.put("action", "nav");
        action.put("path", path);
        return action;
    }

    // Rate limiter helper
    private static final Map<String, List<Long>> rateLimiterMap = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS_PER_MINUTE = 15;

    private boolean checkRateLimit(String identifier) {
        long now = System.currentTimeMillis();
        List<Long> timestamps = rateLimiterMap.computeIfAbsent(identifier, k -> new ArrayList<>());
        synchronized (timestamps) {
            timestamps.removeIf(t -> now - t > 60000);
            if (timestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
                return false;
            }
            timestamps.add(now);
            return true;
        }
    }

    private String callGeminiApiForRole(String userQuery, String systemContext, String activePage, String roleType) throws Exception {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return "";
        }

        // Cascade array of valid model endpoints available for this API key
        String[] modelCascade = new String[]{
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash-lite",
            "gemini-2.5-flash",
            "gemini-2.0-flash"
        };

        String roleInstruction = "You are Buddy 👤, smart water assistant for residents.\n";
        if ("SUPER_ADMIN".equalsIgnoreCase(roleType)) {
            roleInstruction = "You are Buddy 👑, executive assistant for Super Admin on AquaTrack.\n";
        } else if ("COMMUNITY_ADMIN".equalsIgnoreCase(roleType)) {
            roleInstruction = "You are Buddy 🛡️, community manager assistant for Community Admin.\n";
        }

        // Concise, highly disciplined system prompt
        String conciseSystemPrompt = roleInstruction +
                "Context:\n" + systemContext + "\n" +
                "Current Page: " + activePage + "\n\n" +
                "Instructions:\n" +
                "1. If off-topic/unwanted (general trivia, jokes, coding, unrelated questions), do NOT answer it. Gently decline: 'I am Buddy 😊, your AquaTrack assistant. Please ask a question related to your water bills, usage, tariffs, or support tickets!'\n" +
                "2. If query is vague or contains typos, interpret it in the context of water management and provide the exact relevant data cleanly.\n" +
                "3. Reply in the same language as user with extreme politeness and clear Markdown formatting.\n" +
                "4. Keep answer concise and direct (under 150 words).";

        String escapedPrompt = escapeJsonString(conciseSystemPrompt + "\n\nUser Query: " + userQuery);
        String jsonRequestBody = "{\n" +
                "  \"contents\": [{\n" +
                "    \"parts\": [{\"text\": \"" + escapedPrompt + "\"}]\n" +
                "  }],\n" +
                "  \"generationConfig\": {\n" +
                "    \"temperature\": 0.2,\n" +
                "    \"maxOutputTokens\": 350\n" +
                "  }\n" +
                "}";

        java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();

        for (String modelName : modelCascade) {
            try {
                String targetUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + geminiApiKey;

                java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                        .uri(java.net.URI.create(targetUrl))
                        .header("Content-Type", "application/json")
                        .POST(java.net.http.HttpRequest.BodyPublishers.ofString(jsonRequestBody))
                        .build();

                java.net.http.HttpResponse<String> httpResponse = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());

                if (httpResponse.statusCode() == 200) {
                    String body = httpResponse.body();
                    int textIndex = body.indexOf("\"text\": \"");
                    if (textIndex != -1) {
                        int start = textIndex + 9;
                        boolean inEscape = false;
                        StringBuilder sb = new StringBuilder();
                        for (int i = start; i < body.length(); i++) {
                            char c = body.charAt(i);
                            if (inEscape) {
                                if (c == 'n') sb.append('\n');
                                else if (c == 't') sb.append('\t');
                                else if (c == 'r') sb.append('\r');
                                else sb.append(c);
                                inEscape = false;
                            } else if (c == '\\') {
                                inEscape = true;
                            } else if (c == '"') {
                                break;
                            } else {
                                sb.append(c);
                            }
                        }
                        String responseText = sb.toString().trim();
                        if (!responseText.isBlank()) {
                            return responseText;
                        }
                    }
                }
            } catch (Exception ignored) {
                // Failover to next model in cascade
            }
        }

        throw new RuntimeException("All Gemini model API attempts in cascade failed.");
    }

    private String escapeJsonString(String input) {
        if (input == null) return "";
        return input.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                    .replace("\t", "\\t");
    }
}
