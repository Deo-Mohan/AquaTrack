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

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @PostMapping("/query")
    public ResponseEntity<Map<String, Object>> processHouseholdQuery(@RequestBody Map<String, String> request) {
        String query = request.getOrDefault("query", "");
        String houseNumber = request.getOrDefault("houseNumber", "");
        String activePage = request.getOrDefault("activePage", "/dashboard");

        Map<String, Object> response = new HashMap<>();

        // Rate limiting check: Max 15 AI requests per minute per household
        if (!checkRateLimit(houseNumber)) {
            response.put("answer", "⚠️ **Rate Limit Reached**: You have reached the maximum AI request rate (15 queries/min). Using fast local response mode.");
            response.put("actions", generateActions(query, activePage));
            return ResponseEntity.ok(response);
        }

        Optional<Household> householdOpt = householdRepository.findByHouseNumber(houseNumber);
        String contextPrompt = buildHouseholdContext(houseNumber, householdOpt);

        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            try {
                String aiReply = callGeminiFlashApi(query, contextPrompt, activePage);
                if (aiReply != null && !aiReply.isBlank()) {
                    response.put("answer", aiReply);
                    response.put("actions", generateActions(query, activePage));
                    return ResponseEntity.ok(response);
                }
            } catch (Exception e) {
                // Fallback to local intelligent RAG engine if external Gemini API fails or times out
            }
        }

        // Fast & free local intelligent rule/RAG response engine
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
        sb.append("Outstanding Balance: ₹").append(unpaidTotal != null ? unpaidTotal : 0.0).append("\n");

        Double avgUsage = waterUsageRepository.avgConsumptionByHousehold(houseNumber);
        sb.append("Historical Daily Consumption Average: ").append(avgUsage != null ? String.format("%.1f", avgUsage) : "N/A").append(" L/day\n");

        return sb.toString();
    }

    private String generateLocalRAGReply(String query, String houseNumber, Optional<Household> householdOpt, String activePage) {
        String lower = query.trim().toLowerCase();

        // 1. Retrieve resident user details, community block & admin details
        User resident = userRepository.findByHouseNumber(houseNumber).orElse(null);
        String block = resident != null ? resident.getApartmentBlock() : (householdOpt.isPresent() ? householdOpt.get().getBlock() : "Block A");

        List<User> admins = userRepository.findByRoleAndApartmentBlock("ROLE_COMMUNITY_ADMIN", block);
        User admin = admins.isEmpty() ? null : admins.get(0);

        double baseRate = (admin != null && admin.getWaterRatePerLiter() != null) ? admin.getWaterRatePerLiter() : 0.05;
        double monthlyLimit = (admin != null && admin.getMonthlyLimitLiters() != null) ? admin.getMonthlyLimitLiters() : 3000.0;
        double excessRate = (admin != null && admin.getExcessRatePerLiter() != null) ? admin.getExcessRatePerLiter() : 0.10;
        double lateFee = (admin != null && admin.getLateFeePerMonth() != null) ? admin.getLateFeePerMonth() : 20.0;
        int gracePeriod = (admin != null && admin.getGracePeriodDays() != null) ? admin.getGracePeriodDays() : 20;

        // Fetch unpaid bills & all bills for this household
        Double unpaidTotal = billRepository.sumUnpaidByHousehold(houseNumber);
        if (unpaidTotal == null) unpaidTotal = 0.0;
        List<Bill> allBills = billRepository.findByHouseNumberOrderByDueDateDesc(houseNumber);

        // Fetch support tickets for this resident
        List<SupportTicket> userTickets = resident != null 
            ? supportTicketRepository.findByCreatedByIdOrderByCreatedAtDesc(resident.getId()) 
            : Collections.emptyList();

        // 2. Greetings
        if (lower.matches("^(hi|hello|hey|greetings|good morning|good afternoon|good evening|sup|hola).*")) {
            return "Hello there! 👋 Welcome to **AquaTrack Assistant**. How can I assist you with your water bills, support tickets, or tariff rates for House **" + houseNumber + "** today?";
        }

        // 3. Community Admin Contact & Block Details
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

        // 4. Support Ticket Status & Filtering Queries
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

        // 5. Specific Month Bill & Unpaid Invoices Query (e.g. "march month bill", "june bill", "bill of january")
        if (lower.contains("bill") || lower.contains("invoice") || lower.contains("unpaid") || lower.contains("overdue") || lower.contains("history") || lower.contains("pay")) {
            // Check if user specifically requested a month (e.g. march, april, june, etc.)
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

        // 6. Peak Consumption Hours Query
        if (lower.contains("peak") || lower.contains("peak hour") || lower.contains("peak time")) {
            return "⏰ **Peak Water Consumption Hours for House " + houseNumber + "**:\n\n" +
                   "• **Morning Peak**: **7:00 AM – 9:30 AM** (Bathing & Morning Chores)\n" +
                   "• **Evening Peak**: **7:00 PM – 9:00 PM** (Dinner Preparation & Cleaning)\n\n" +
                   "💡 *Tip: Shifting heavy water usage (like washing machines) to off-peak hours (11:00 AM - 4:00 PM) helps maintain steady water pressure!*";
        }

        // 7. Base Water Limit Query
        if (lower.contains("monthly base water limit") || lower.contains("base water limit") || lower.contains("my base limit") || lower.contains("free limit")) {
            return "🎯 **Monthly Base Water Limit for House " + houseNumber + " (" + block + ")**:\n\n" +
                   "• **Monthly Base Limit**: **" + String.format("%.0f", monthlyLimit) + " Liters**\n" +
                   "• **Base Rate**: ₹" + String.format("%.4f", baseRate) + " per Liter\n\n" +
                   "You get up to " + String.format("%.0f", monthlyLimit) + " Liters billed at the standard rate. Any consumption past this limit incurs the excess tier rate of ₹" + String.format("%.4f", excessRate) + "/L.";
        }

        // 8. Excess Water Tariff Calculation Query
        if (lower.contains("excess water tariff") || lower.contains("excess tariff") || lower.contains("excess rate") || lower.contains("excess calculated")) {
            return "⚡ **Excess Water Tariff Calculation for House " + houseNumber + "**:\n\n" +
                   "• **Tier 1 (Base Limit)**: 0 – " + String.format("%.0f", monthlyLimit) + " Liters @ **₹" + String.format("%.4f", baseRate) + "/L**\n" +
                   "• **Tier 2 (Excess Usage)**: Above " + String.format("%.0f", monthlyLimit) + " Liters @ **₹" + String.format("%.4f", excessRate) + "/L**\n\n" +
                   "**Example**: If you use 3,200 Liters (with a 3,000L limit):\n" +
                   "• Base Charge = 3,000 L × ₹" + String.format("%.2f", baseRate) + " = **₹" + String.format("%.2f", 3000 * baseRate) + "**\n" +
                   "• Excess Charge = 200 L × ₹" + String.format("%.2f", excessRate) + " = **₹" + String.format("%.2f", 200 * excessRate) + "**\n" +
                   "• **Total Bill** = **₹" + String.format("%.2f", (3000 * baseRate) + (200 * excessRate)) + "**";
        }

        // 9. Full Tariff Plan Summary Query
        if (lower.contains("tariff") || lower.contains("rate card") || lower.contains("plan") || lower.contains("tier")) {
            return "📋 **Current Tariff Plan & Policy for House " + houseNumber + " (" + block + ")** (Set by Community Admin):\n\n" +
                   "• **Base Rate**: ₹" + String.format("%.4f", baseRate) + " per Liter\n" +
                   "• **Monthly Base Limit**: " + String.format("%.0f", monthlyLimit) + " Liters\n" +
                   "• **Excess Rate**: ₹" + String.format("%.4f", excessRate) + " per Liter\n" +
                   "• **Late Payment Penalty**: ₹" + String.format("%.2f", lateFee) + " / month\n" +
                   "• **Grace Period**: " + gracePeriod + " days from bill generation";
        }

        // 10. Bill Calculation Formula & Breakdown
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

        // 11. Water Usage & Meter Reading Analytics Queries
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

        // 12. Current Outstanding Due Queries
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

        // 13. Water Leakage & Support Desk Quick Action
        if (lower.contains("leak") || lower.contains("pipe") || lower.contains("repair") || lower.contains("damage") || lower.contains("water cut") || lower.contains("no water")) {
            return "If you notice a leak, low pressure, or supply interruption in **House " + houseNumber + "**:\n\n" +
                   "1. Turn off your main stop-cock valve immediately if water loss is high.\n" +
                   "2. Raise a Support Ticket on the Support Desk so your Community Admin (" + (admin != null ? admin.getFullName() : "Admin") + ") can dispatch maintenance assistance quickly.";
        }

        // 13. Payment Methods & History Queries
        if (lower.contains("payment method") || lower.contains("how to pay") || lower.contains("upi") || lower.contains("card") || lower.contains("netbanking") || lower.contains("paid bill")) {
            return "💳 **Water Bill Payment Options for House " + houseNumber + "**:\n\n" +
                   "• **Supported Modes**: Razorpay Gateway (UPI, Credit/Debit Cards, NetBanking, Wallets)\n" +
                   "• **Instant Invoice**: Payment receipt & PDF invoice generated immediately upon payment.\n\n" +
                   "Go to the **Bills Page** or **Invoices Page** to settle dues or download receipts!";
        }

        // 14. Top-Up Water Purchase & Extra Supply Queries
        if (lower.contains("buy water") || lower.contains("top up") || lower.contains("extra water") || lower.contains("purchase water") || lower.contains("tanker")) {
            return "🚰 **Extra Water Purchase / Tanker Top-Up for House " + houseNumber + "**:\n\n" +
                   "If your household requires additional water quota beyond your monthly limit:\n" +
                   "• Click **Purchase Extra Water** below to order instant top-up quota directly to your household meter balance.";
        }

        // 15. Late Fee & Overdue Policy Queries
        if (lower.contains("late fee") || lower.contains("penalty") || lower.contains("grace period") || lower.contains("overdue charge")) {
            return "⏳ **Late Fee & Grace Period Policy for House " + houseNumber + " (" + block + ")**:\n\n" +
                   "• **Grace Period**: " + gracePeriod + " Days from bill generation.\n" +
                   "• **Late Fee Rate**: ₹" + String.format("%.2f", lateFee) + " added monthly for overdue bills.\n" +
                   "💡 *Pay before the due date on the Bills page to avoid penalty charges!*";
        }

        // 16. Profile & Account Settings Queries
        if (lower.contains("profile") || lower.contains("my account") || lower.contains("change password") || lower.contains("mobile") || lower.contains("email") || lower.contains("occupants")) {
            return "👤 **Household Profile & Account Details for House " + houseNumber + "**:\n\n" +
                   "• **Resident Name**: " + (resident != null ? (resident.getFullName() != null ? resident.getFullName() : resident.getUsername()) : "Resident") + "\n" +
                   "• **Apartment Block**: " + block + "\n" +
                   "• **Occupancy**: " + (householdOpt.isPresent() ? householdOpt.get().getOccupancy() : "N/A") + " Residents\n\n" +
                   "You can update your avatar, phone number, and password on your **Profile Page**!";
        }

        // 17. Escalation to Super Admin Query
        if (lower.contains("escalate") || lower.contains("super admin") || lower.contains("higher authority") || lower.contains("unresolved")) {
            return "🏛️ **Escalation to Super Admin**:\n\n" +
                   "If your concern is not resolved by your Community Admin within 15 days or you face administrative issues, you can escalate your ticket directly to the **Super Admin** from the **Support Desk**!";
        }

        // 18. Water Conservation & Savings Queries
        if (lower.contains("tip") || lower.contains("save") || lower.contains("reduce") || lower.contains("excess") || lower.contains("conservation")) {
            return "Here are actionable ways to lower your water consumption and bill in **House " + houseNumber + "**:\n\n" +
                   "• **Install Aerators**: Faucet aerators can reduce water flow by up to 30% without affecting pressure.\n" +
                   "• **Fix Silent Leaks**: A running toilet flapper can waste up to 200 Liters per day.\n" +
                   "• **Track Usage**: Check daily peak hours under the **My Usage** section.";
        }

        // 19. Courtesy & Small Talk
        if (lower.contains("who are you") || lower.contains("your name") || lower.contains("what can you do")) {
            return "I am **AquaTrack AI**, your dedicated smart household assistant! 💧\n\nI help you:\n• View unpaid bills & invoice history\n• Check peak usage hours & water limits\n• View live tariff rates & calculate monthly bill breakdowns\n• Track daily water usage & report leaks!\n• Order extra water top-up & contact Community Admin!";
        }
        if (lower.contains("thank") || lower.contains("thanks") || lower.contains("awesome") || lower.contains("great")) {
            return "You're very welcome! 😊 Feel free to ask if you need anything else regarding your water services.";
        }

        // 20. Default Fallback
        return "I am specifically tuned for **AquaTrack Water Management System**! 💧\n\nI can help you check **unpaid bills, peak consumption hours, monthly base limits, live tariff rates, water top-ups, and support tickets** for House **" + houseNumber + "**.";
    }

    private List<Map<String, String>> generateActions(String query, String activePage) {
        List<Map<String, String>> actions = new ArrayList<>();
        String lower = query.toLowerCase();

        if (lower.contains("bill") || lower.contains("pay") || lower.contains("cost") || lower.contains("charge") || lower.contains("due") || lower.contains("unpaid") || lower.contains("invoice") || lower.contains("march") || lower.contains("june") || lower.contains("january") || lower.contains("april") || lower.contains("may") || lower.contains("july") || lower.contains("august")) {
            actions.add(createAction("💳 View & Pay Bills", "/bills"));
            actions.add(createAction("📄 Download Invoices", "/invoices"));
            actions.add(createAction("📊 Check Usage History", "/usage"));
        } else if (lower.contains("leak") || lower.contains("pipe") || lower.contains("repair") || lower.contains("damage") || lower.contains("support") || lower.contains("ticket") || lower.contains("issue") || lower.contains("admin") || lower.contains("escalate")) {
            actions.add(createAction("🛠️ Open Support Desk", "/support"));
            actions.add(createAction("🚨 Raise Concern", "/support"));
            actions.add(createAction("🏛️ Escalate Issue", "/support"));
        } else if (lower.contains("buy water") || lower.contains("top up") || lower.contains("extra water") || lower.contains("purchase water") || lower.contains("tanker")) {
            actions.add(createAction("💧 Purchase Extra Water", "/water-purchase"));
            actions.add(createAction("💳 Check Bills", "/bills"));
        } else if (lower.contains("tariff") || lower.contains("rate") || lower.contains("limit") || lower.contains("base") || lower.contains("excess") || lower.contains("plan") || lower.contains("late fee") || lower.contains("penalty")) {
            actions.add(createAction("📋 View Tariff Structure", "/bills"));
            actions.add(createAction("💧 Purchase Extra Water", "/water-purchase"));
            actions.add(createAction("📊 Check Usage", "/usage"));
        } else if (lower.contains("peak") || lower.contains("usage") || lower.contains("meter") || lower.contains("consumption") || lower.contains("liters") || lower.contains("reading")) {
            actions.add(createAction("📊 My Daily Usage", "/usage"));
            actions.add(createAction("🌊 Water Saving Tips", "/tips"));
            actions.add(createAction("💧 Buy Top-Up Water", "/water-purchase"));
        } else if (lower.contains("profile") || lower.contains("account") || lower.contains("password") || lower.contains("mobile") || lower.contains("email")) {
            actions.add(createAction("👤 Edit Profile", "/profile"));
            actions.add(createAction("🔔 Notifications", "/notifications"));
        } else if (lower.contains("tip") || lower.contains("save") || lower.contains("reduce") || lower.contains("conservation")) {
            actions.add(createAction("🌊 Explore All Tips", "/tips"));
            actions.add(createAction("📊 Track Usage", "/usage"));
            actions.add(createAction("💳 View Bills", "/bills"));
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

    // Simple sliding-window rate limiter per house (max 15 requests per minute per house)
    private static final Map<String, List<Long>> rateLimiterMap = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS_PER_MINUTE = 15;

    private boolean checkRateLimit(String houseNumber) {
        long now = System.currentTimeMillis();
        List<Long> timestamps = rateLimiterMap.computeIfAbsent(houseNumber, k -> new ArrayList<>());
        synchronized (timestamps) {
            timestamps.removeIf(t -> now - t > 60000);
            if (timestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
                return false; // Rate limit exceeded
            }
            timestamps.add(now);
            return true;
        }
    }

    private String callGeminiFlashApi(String userQuery, String systemContext, String activePage) throws Exception {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return "";
        }

        String targetUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey;

        String systemPrompt = "You are AquaTrack AI, a highly intelligent, empathetic water management assistant for resident households.\n" +
                              "Use the following real-time household database context to answer the user accurately, clearly, and nicely:\n\n" +
                              systemContext + "\n" +
                              "Current UI Page User is viewing: " + activePage + "\n\n" +
                              "Guidelines:\n" +
                              "1. Understand natural, informal, typo-filled, regional, or indirect phrasing (e.g. 'kitna bill h', 'paani ka bill', 'admin kaun h', 'how much money owe'). Map the query to the correct database entity (Billing, Usage, Tariff, Support, Community Admin).\n" +
                              "2. If the user asks in Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Malayalam, Punjabi, Spanish, French, or any regional/universal language, respond fluently in that SAME language while using the household database numbers.\n" +
                              "3. Keep responses clear, concise, and beautifully formatted in GitHub-style Markdown with emojis.\n" +
                              "4. When explaining bills, provide itemized math step-by-step.\n" +
                              "5. If details are missing in context, politely offer general guidance or suggest checking the Bills/Support section.";

        String escapedPrompt = escapeJsonString(systemPrompt + "\n\nUser Question: " + userQuery);

        String jsonRequestBody = "{\n" +
                "  \"contents\": [{\n" +
                "    \"parts\": [{\"text\": \"" + escapedPrompt + "\"}]\n" +
                "  }],\n" +
                "  \"generationConfig\": {\n" +
                "    \"temperature\": 0.3,\n" +
                "    \"maxOutputTokens\": 500\n" +
                "  }\n" +
                "}";

        java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
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
                return sb.toString().trim();
            }
        }

        throw new RuntimeException("Gemini API HTTP Error Code: " + httpResponse.statusCode());
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
