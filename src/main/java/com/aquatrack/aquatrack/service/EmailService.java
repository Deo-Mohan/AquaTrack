package com.aquatrack.aquatrack.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    private static final String SENDER_NAME = "AquaTrack Administration";
    private static final String FROM_EMAIL = "no-reply@aquatrack.com";

    // 1. Send Community Approval Email
    public void sendCommunityApprovalEmail(String toEmail, String fullName, String communityName) {
        String subject = "Congratulations! Your Community is Approved";
        
        String htmlContent = "<div style=\"font-family: 'Segoe UI', Arial, sans-serif; background-color: #0d1117; color: #c9d1d9; padding: 40px 20px; text-align: center;\">" +
                "  <div style=\"max-width: 600px; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 16px; padding: 40px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5); text-align: left;\">" +
                "    <div style=\"text-align: center; margin-bottom: 30px;\">" +
                "      <span style=\"font-size: 32px; font-weight: 800; color: #00f2fe; text-shadow: 0 0 10px rgba(0, 242, 254, 0.3);\">AquaTrack</span>" +
                "      <div style=\"height: 2px; width: 60px; background: linear-gradient(90deg, #00c6ff, #0072ff); margin: 15px auto 0;\"></div>" +
                "    </div>" +
                "    <p style=\"font-size: 16px; line-height: 1.6;\">Dear <strong>" + fullName + "</strong>,</p>" +
                "    <p style=\"font-size: 16px; line-height: 1.6;\">We are thrilled to inform you that your registration request for community <strong>" + communityName + "</strong> has been <strong>approved</strong> by the Super Administrator!</p>" +
                "    <div style=\"background: rgba(0, 242, 254, 0.05); border-left: 4px solid #00f2fe; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;\">" +
                "      <p style=\"margin: 0; font-size: 15px; color: #58a6ff;\">" +
                "        <strong>Next Steps:</strong> You may now log in to the admin portal and start onboarding household users to your community." +
                "      </p>" +
                "    </div>" +
                "    <div style=\"text-align: center; margin: 35px 0;\">" +
                "      <a href=\"http://localhost:5173/login\" style=\"background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; font-weight: bold; border-radius: 8px; font-size: 15px; box-shadow: 0 4px 15px rgba(0, 198, 255, 0.4); transition: transform 0.2s;\">" +
                "        Login to Admin Dashboard" +
                "      </a>" +
                "    </div>" +
                "    <p style=\"font-size: 14px; color: #8b949e; line-height: 1.5; margin-top: 40px;\">Best regards,<br/>The AquaTrack Team</p>" +
                "  </div>" +
                "</div>";

        sendEmail(toEmail, subject, htmlContent);
    }

    // 2. Send Invitation Email to Household User
    public void sendInvitationEmail(String toEmail, String fullName, String communityName, String token, String meterId) {
        String subject = "You are invited to join " + communityName + " on AquaTrack";
        String inviteUrl = "http://localhost:5173/register/invite/" + token;

        String htmlContent = "<div style=\"font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; padding: 40px 10px; color: #c9d1d9; text-align: center;\">" +
                "  <div style=\"max-width: 550px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.6); text-align: left;\">" +
                "    <div style=\"height: 6px; background: linear-gradient(90deg, #00f2fe 0%, #4facfe 50%, #0072ff 100%);\"></div>" +
                "    <div style=\"padding: 40px 30px;\">" +
                "      <div style=\"text-align: center; margin-bottom: 30px;\">" +
                "        <span style=\"font-size: 28px; font-weight: 800; color: #00f2fe; letter-spacing: -0.5px; text-shadow: 0 0 10px rgba(0, 242, 254, 0.2);\">AquaTrack</span>" +
                "        <div style=\"font-size: 11px; color: #8b949e; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px;\">Smart Water Management</div>" +
                "      </div>" +
                "      <p style=\"font-size: 16px; line-height: 1.6; color: #f0f6fc; margin-bottom: 20px;\">Hello <strong>" + fullName + "</strong>,</p>" +
                "      <p style=\"font-size: 15px; line-height: 1.6; color: #c9d1d9; margin-bottom: 25px;\">You have been invited by your Community Admin to join the <strong>" + communityName + "</strong> community on the AquaTrack platform as a Resident.</p>" +
                "      <div style=\"background-color: #0d1117; border: 1px solid #30363d; border-radius: 12px; padding: 20px; margin-bottom: 30px;\">" +
                "        <table style=\"width: 100%; border-collapse: collapse; font-size: 14px; color: #c9d1d9;\">" +
                "          <tr>" +
                "            <td style=\"padding: 6px 0; color: #8b949e; width: 40%;\">Community:</td>" +
                "            <td style=\"padding: 6px 0; font-weight: 600; color: #f0f6fc;\">" + communityName + "</td>" +
                "          </tr>" +
                "          <tr>" +
                "            <td style=\"padding: 6px 0; color: #8b949e;\">Account Type:</td>" +
                "            <td style=\"padding: 6px 0; font-weight: 600; color: #f0f6fc;\">Household Resident</td>" +
                "          </tr>" +
                (meterId != null && !meterId.trim().isEmpty() ?
                "          <tr>" +
                "            <td style=\"padding: 6px 0; color: #8b949e;\">Meter ID:</td>" +
                "            <td style=\"padding: 6px 0; font-weight: 600; color: #f0f6fc;\">" + meterId.trim() + "</td>" +
                "          </tr>" : "") +
                "          <tr>" +
                "            <td style=\"padding: 6px 0; color: #8b949e;\">Validity:</td>" +
                "            <td style=\"padding: 6px 0; font-weight: 600; color: #ff7e5f;\">48 Hours Only</td>" +
                "          </tr>" +
                "        </table>" +
                "      </div>" +
                "      <h3 style=\"font-size: 15px; font-weight: 600; color: #58a6ff; margin-top: 0; margin-bottom: 12px;\">What you can do with AquaTrack:</h3>" +
                "      <ul style=\"font-size: 14px; line-height: 1.6; padding-left: 20px; margin-bottom: 35px; color: #8b949e;\">" +
                "        <li style=\"margin-bottom: 8px;\"><strong style=\"color: #c9d1d9;\">Track Consumption:</strong> Monitor your household water usage in real-time.</li>" +
                "        <li style=" + '"' + "margin-bottom: 8px;" + '"' + "><strong style=\"color: #c9d1d9;\">Smart Invoicing:</strong> View monthly logs and securely clear dues online.</li>" +
                "        <li style=" + '"' + "margin-bottom: 8px;" + '"' + "><strong style=\"color: #c9d1d9;\">Leak Detection:</strong> Receive instant alerts regarding abnormal usage spikes.</li>" +
                "      </ul>" +
                "      <div style=\"text-align: center; margin-bottom: 35px;\">" +
                "        <a href=\"" + inviteUrl + "\" style=\"display: inline-block; width: 80%; max-width: 250px; background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); color: #ffffff; text-decoration: none; padding: 14px 24px; font-weight: bold; border-radius: 8px; font-size: 15px; text-align: center; box-shadow: 0 4px 15px rgba(0, 198, 255, 0.3);\">" +
                "          Complete Registration" +
                "        </a>" +
                "      </div>" +
                "      <div style=\"border-left: 3px solid #ff7e5f; background-color: rgba(255, 126, 95, 0.05); padding: 12px 15px; border-radius: 0 8px 8px 0; margin-bottom: 30px;\">" +
                "        <p style=\"margin: 0; font-size: 13px; line-height: 1.5; color: #ff7e5f;\">" +
                "          This invitation link is unique to you and will expire in 48 hours. Please complete your registration before the expiry." +
                "        </p>" +
                "      </div>" +
                "      <div style=\"border-top: 1px solid #30363d; padding-top: 25px; font-size: 12px; color: #8b949e; text-align: center; line-height: 1.6;\">" +
                "        <p style=\"margin: 0 0 8px 0;\">If the button above does not work, copy and paste this link into your browser:</p>" +
                "        <a href=\"" + inviteUrl + "\" style=\"color: #58a6ff; text-decoration: underline; word-break: break-all; overflow-wrap: break-word;\">" +
                "          " + inviteUrl + "" +
                "        </a>" +
                "      </div>" +
                "      <p style=\"font-size: 13px; color: #8b949e; line-height: 1.5; margin-top: 40px; margin-bottom: 0; border-top: 1px solid #30363d; padding-top: 20px;\">" +
                "        Warm regards,<br/>" +
                "        <strong>The AquaTrack Team</strong>" +
                "      </p>" +
                "    </div>" +
                "  </div>" +
                "</div>";
        sendEmail(toEmail, subject, htmlContent);
    }

    // 3. Send Forgot Password OTP Email
    public void sendForgotPasswordOtpEmail(String toEmail, String otpCode) {
        String subject = "Reset Your AquaTrack Password - Verification Code";
        
        String htmlContent = "<div style=\"font-family: 'Segoe UI', Arial, sans-serif; background-color: #0d1117; color: #c9d1d9; padding: 40px 20px; text-align: center;\">" +
                "  <div style=\"max-width: 600px; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 16px; padding: 40px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5); text-align: left;\">" +
                "    <div style=\"text-align: center; margin-bottom: 30px;\">" +
                "      <span style=\"font-size: 32px; font-weight: 800; color: #00f2fe; text-shadow: 0 0 10px rgba(0, 242, 254, 0.3);\">AquaTrack</span>" +
                "      <div style=\"height: 2px; width: 60px; background: linear-gradient(90deg, #00c6ff, #0072ff); margin: 15px auto 0;\"></div>" +
                "    </div>" +
                "    <p style=\"font-size: 16px; line-height: 1.6;\">Hello,</p>" +
                "    <p style=\"font-size: 16px; line-height: 1.6;\">We received a request to reset your password. Use the verification code below to authorize this request:</p>" +
                "    <div style=\"text-align: center; margin: 30px 0;\">" +
                "      <span style=\"font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #00f2fe; background: #0d1117; padding: 12px 30px; border-radius: 8px; border: 1px solid #30363d; display: inline-block;\">" + otpCode + "</span>" +
                "    </div>" +
                "    <p style=\"font-size: 14px; line-height: 1.6; color: #8b949e;\">This verification code is valid for <strong>10 minutes</strong>. If you did not make this request, please secure your account immediately.</p>" +
                "    <div style=\"display: flex; justify-content: center; gap: 15px; margin: 35px 0;\">" +
                "      <a href=\"http://localhost:5173/login\" style=\"background: #21262d; border: 1px solid #30363d; color: #c9d1d9; text-decoration: none; padding: 12px 25px; font-weight: bold; border-radius: 8px; font-size: 14px;\">" +
                "        Login Page" +
                "      </a>" +
                "      <a href=\"http://localhost:5173/forgot-password\" style=\"background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); color: #ffffff; text-decoration: none; padding: 12px 25px; font-weight: bold; border-radius: 8px; font-size: 14px; box-shadow: 0 4px 15px rgba(0, 198, 255, 0.3);\">" +
                "        Reset Password" +
                "      </a>" +
                "    </div>" +
                "    <p style=\"font-size: 14px; color: #8b949e; line-height: 1.5; margin-top: 40px;\">Best regards,<br/>The AquaTrack Team</p>" +
                "  </div>" +
                "</div>";

        sendEmail(toEmail, subject, htmlContent);
    }

    // 4. Send Payment Reminder Email
    public void sendPaymentReminderEmail(String toEmail, String fullName) {
        String subject = "Pending Water Bill Reminder - AquaTrack";
        String htmlContent = "<div style=\"font-family: 'Segoe UI', Arial, sans-serif; background-color: #0d1117; color: #c9d1d9; padding: 40px 20px; text-align: center;\">" +
                "  <div style=\"max-width: 600px; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 16px; padding: 40px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5); text-align: left;\">" +
                "    <div style=\"text-align: center; margin-bottom: 30px;\">" +
                "      <span style=\"font-size: 32px; font-weight: 800; color: #00f2fe; text-shadow: 0 0 10px rgba(0, 242, 254, 0.3);\">AquaTrack</span>" +
                "      <div style=\"height: 2px; width: 60px; background: linear-gradient(90deg, #00c6ff, #0072ff); margin: 15px auto 0;\"></div>" +
                "    </div>" +
                "    <p style=\"font-size: 16px; line-height: 1.6;\">Dear Resident <strong>" + fullName + "</strong>,</p>" +
                "    <p style=\"font-size: 16px; line-height: 1.6;\">Your monthly water bill is pending.</p>" +
                "    <div style=\"background: rgba(255, 126, 95, 0.05); border-left: 4px solid #ff7e5f; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;\">" +
                "      <p style=\"margin: 0; font-size: 15px; color: #ff7e5f;\">" +
                "        Please complete your payment as soon as possible to avoid service disruption or late fees." +
                "      </p>" +
                "    </div>" +
                "    <div style=\"text-align: center; margin: 35px 0;\">" +
                "      <a href=\"http://localhost:5173/login\" style=\"background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; font-weight: bold; border-radius: 8px; font-size: 15px; box-shadow: 0 4px 15px rgba(255, 126, 95, 0.4);\">" +
                "        Pay Water Bill" +
                "      </a>" +
                "    </div>" +
                "    <p style=\"font-size: 14px; color: #8b949e; line-height: 1.5; margin-top: 40px;\">Best regards,<br/>The AquaTrack Team</p>" +
                "  </div>" +
                "</div>";

        sendEmail(toEmail, subject, htmlContent);
    }

    // 5. Send Bill Generated Email (with full tariff breakdown)
    public void sendBillGeneratedEmail(String toEmail, String fullName, String houseNumber, Double amount,
            java.time.LocalDate generatedDate, java.time.LocalDate dueDate, Double consumption, String meterId) {
        sendBillGeneratedEmail(toEmail, fullName, houseNumber, amount, generatedDate, dueDate, consumption, meterId,
                null, null, null, null, null);
    }

    // Overload with tariff breakdown details
    public void sendBillGeneratedEmail(String toEmail, String fullName, String houseNumber, Double amount,
            java.time.LocalDate generatedDate, java.time.LocalDate dueDate, Double consumption, String meterId,
            Double withinLimitLiters, Double excessLiters, Double baseRatePerLiter, Double excessRatePerLiter, Double monthlyLimitLiters) {
        String subject = "New Water Bill Generated for House " + houseNumber;
        String formattedDate = generatedDate != null ? generatedDate.toString() : java.time.LocalDate.now().toString();
        String monthName = generatedDate != null ? generatedDate.getMonth().toString() : java.time.LocalDate.now().getMonth().toString();

        boolean hasTariffBreakdown = monthlyLimitLiters != null && monthlyLimitLiters > 0
                && baseRatePerLiter != null && baseRatePerLiter > 0;

        String breakdownHtml = "";
        if (hasTariffBreakdown) {
            double baseCharge = (withinLimitLiters != null ? withinLimitLiters : 0.0) * (baseRatePerLiter != null ? baseRatePerLiter : 0.0);
            double excessChg = (excessLiters != null && excessLiters > 0 && excessRatePerLiter != null)
                    ? excessLiters * excessRatePerLiter : 0.0;
            breakdownHtml =
                "      <tr><td colspan=\"2\"><hr style=\"border-color:#30363d; margin: 8px 0;\"/></td></tr>" +
                "      <tr><td style=\"padding: 6px 0; color: #8b949e; font-size: 13px;\">Monthly Limit:</td><td style=\"padding: 6px 0; font-weight: bold; text-align: right; font-size: 13px; color: #f0f6fc;\">" + (monthlyLimitLiters != null ? monthlyLimitLiters.intValue() : 0) + " L</td></tr>" +
                "      <tr><td style=\"padding: 6px 0; color: #8b949e; font-size: 13px;\">Within-Limit Usage:</td><td style=\"padding: 6px 0; font-weight: bold; text-align: right; font-size: 13px; color: #10b981;\">" + (withinLimitLiters != null ? withinLimitLiters.intValue() : 0) + " L × ₹" + String.format("%.4f", baseRatePerLiter != null ? baseRatePerLiter : 0.0) + " = ₹" + String.format("%.2f", baseCharge) + "</td></tr>" +
                (excessLiters != null && excessLiters > 0 && excessRatePerLiter != null ?
                "      <tr><td style=\"padding: 6px 0; color: #f87171; font-size: 13px;\">⚠ Excess Consumption:</td><td style=\"padding: 6px 0; font-weight: bold; text-align: right; font-size: 13px; color: #f87171;\">" + excessLiters.intValue() + " L × ₹" + String.format("%.4f", excessRatePerLiter) + " = +₹" + String.format("%.2f", excessChg) + "</td></tr>" : "");
        }

        String htmlContent = "<div style=\"font-family: 'Segoe UI', Arial, sans-serif; background-color: #0d1117; color: #c9d1d9; padding: 40px 20px; text-align: center;\">" +
                "  <div style=\"max-width: 600px; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 16px; padding: 40px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5); text-align: left;\">" +
                "    <div style=\"text-align: center; margin-bottom: 30px;\">" +
                "      <span style=\"font-size: 32px; font-weight: 800; color: #00f2fe; text-shadow: 0 0 10px rgba(0, 242, 254, 0.3);\">AquaTrack</span>" +
                "      <div style=\"height: 2px; width: 60px; background: linear-gradient(90deg, #00c6ff, #0072ff); margin: 15px auto 0;\"></div>" +
                "    </div>" +
                "    <p style=\"font-size: 16px; line-height: 1.6;\">Dear <strong>" + fullName + "</strong>,</p>" +
                "    <p style=\"font-size: 16px; line-height: 1.6;\">A new water utility bill has been generated for your household (House " + houseNumber + ") by the Community Admin.</p>" +
                "    <div style=\"background: rgba(0, 242, 254, 0.05); border: 1px solid #30363d; padding: 20px; margin: 25px 0; border-radius: 8px;\">" +
                "      <h3 style=\"margin-top: 0; color: #00f2fe; border-bottom: 1px solid #30363d; padding-bottom: 10px;\">Bill Summary (" + monthName + ")</h3>" +
                "      <table style=\"width: 100%; border-collapse: collapse; font-size: 15px; color: #c9d1d9;\">" +
                "        <tr><td style=\"padding: 8px 0; color: #8b949e;\">Generated Date:</td><td style=\"padding: 8px 0; font-weight: bold; text-align: right;\">" + formattedDate + "</td></tr>" +
                "        <tr><td style=\"padding: 8px 0; color: #8b949e;\">Due Date:</td><td style=\"padding: 8px 0; font-weight: bold; text-align: right;\">" + dueDate + "</td></tr>" +
                (meterId != null && !meterId.trim().isEmpty() ?
                "        <tr><td style=\"padding: 8px 0; color: #8b949e;\">Meter ID:</td><td style=\"padding: 8px 0; font-weight: bold; text-align: right;\">" + meterId.trim() + "</td></tr>" : "") +
                "        <tr><td style=\"padding: 8px 0; color: #8b949e;\">Total Consumption:</td><td style=\"padding: 8px 0; font-weight: bold; text-align: right;\">" + (consumption != null ? consumption.intValue() : 0) + " Liters</td></tr>" +
                breakdownHtml +
                "        <tr style=\"border-top: 1px solid #30363d;\"><td style=\"padding: 12px 0 0 0; color: #8b949e; font-size: 16px;\">Total Amount:</td><td style=\"padding: 12px 0 0 0; font-weight: 800; font-size: 18px; color: #00f2fe; text-align: right;\">₹" + String.format("%.2f", amount) + "</td></tr>" +
                "      </table>" +
                "    </div>" +
                "    <div style=\"text-align: center; margin: 35px 0;\">" +
                "      <a href=\"http://localhost:5173/dashboard/bills\" style=\"display: inline-block; background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; font-weight: bold; border-radius: 8px; font-size: 15px; box-shadow: 0 4px 15px rgba(0, 198, 255, 0.4);\">" +
                "        Pay Now" +
                "      </a>" +
                "    </div>" +
                "    <p style=\"font-size: 14px; color: #8b949e; line-height: 1.5; margin-top: 40px;\">Best regards,<br/>The AquaTrack Team</p>" +
                "  </div>" +
                "</div>";

        sendEmail(toEmail, subject, htmlContent);
    }

    // Core private helper to dispatch or write logs
    private void sendEmail(String toEmail, String subject, String htmlContent) {
        System.out.println("==========================================================================");
        System.out.println("SIMULATING EMAIL DISPATCH TO: " + toEmail);
        System.out.println("SUBJECT: " + subject);
        System.out.println("HTML CONTENT LENGTH: " + htmlContent.length());
        System.out.println("==========================================================================");

        // 1. Write to local file so developer can inspect it
        try {
            File emailDir = new File("emails");
            if (!emailDir.exists()) {
                emailDir.mkdir();
            }
            File logFile = new File(emailDir, "sent-emails.log");
            try (FileWriter writer = new FileWriter(logFile, true)) {
                writer.write("\n--------------------------------------------------\n");
                writer.write("TIMESTAMP: " + LocalDateTime.now() + "\n");
                writer.write("TO: " + toEmail + "\n");
                writer.write("SUBJECT: " + subject + "\n");
                writer.write("BODY:\n" + htmlContent + "\n");
                writer.write("--------------------------------------------------\n");
            }
        } catch (IOException ex) {
            System.err.println("Failed to write email simulation log: " + ex.getMessage());
        }

        // 2. Real dispatch if JavaMailSender is configured
        if (mailSender != null) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(FROM_EMAIL, SENDER_NAME);
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);
                
                mailSender.send(message);
                System.out.println("SUCCESS: Real email sent to " + toEmail);
            } catch (Exception e) {
                System.err.println("SMTP Dispatch failed (Normal behavior if SMTP host is not configured): " + e.getMessage());
            }
        } else {
            System.out.println("NOTE: JavaMailSender is not configured in properties. Simulating email logging successfully.");
        }
    }
}
