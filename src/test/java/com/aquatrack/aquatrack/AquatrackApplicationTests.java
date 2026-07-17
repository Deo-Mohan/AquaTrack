package com.aquatrack.aquatrack;

import com.aquatrack.aquatrack.repository.UserRepository;
import com.aquatrack.aquatrack.model.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class AquatrackApplicationTests {

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private com.aquatrack.aquatrack.service.BillingEngineService billingEngineService;

	@Autowired
	private com.aquatrack.aquatrack.controller.WaterUsageController waterUsageController;

	@Autowired
	private com.aquatrack.aquatrack.controller.BillController billController;

	@Autowired
	private com.aquatrack.aquatrack.repository.WaterUsageRepository waterUsageRepository;

	@Autowired
	private com.aquatrack.aquatrack.service.PaymentReminderService paymentReminderService;

	@Autowired
	private com.aquatrack.aquatrack.repository.NotificationRepository notificationRepository;

	@Autowired
	private com.aquatrack.aquatrack.repository.BillRepository billRepository;

	@Test
	void contextLoads() {
		org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
		userRepository.findByUsername("krishna").ifPresent(user -> {
			user.setPassword(encoder.encode("password123"));
			userRepository.save(user);
			System.out.println("Set krishna password to password123");
		});
		userRepository.findByUsername("rahul").ifPresent(user -> {
			user.setPassword(encoder.encode("password123"));
			userRepository.save(user);
			System.out.println("Set rahul password to password123");
		});
		userRepository.findByUsername("rishi").ifPresent(user -> {
			user.setPassword(encoder.encode("password123"));
			userRepository.save(user);
			System.out.println("Set rishi password to password123");
		});
		userRepository.findByUsername("mohan").ifPresent(user -> {
			user.setPassword(encoder.encode("password123"));
			userRepository.save(user);
			System.out.println("Set mohan password to password123");
		});
	}

	@Test
	void testBillingEngineCustomWaterRate() {
		waterUsageRepository.deleteAll();
		userRepository.findByUsername("resident_test").ifPresent(u -> userRepository.delete(u));
		userRepository.findByUsername("admin_test").ifPresent(u -> userRepository.delete(u));

		// Prepare a Resident user
		User resident = userRepository.findByUsername("resident_test").orElseGet(() -> {
			User u = new User("resident_test", "resident_test@test.com", "password", "ROLE_RESIDENT", "APT-TEST-101", "Colony 1", "Block TEST", "Male");
			u.setStatus("APPROVED");
			return userRepository.save(u);
		});
		resident.setHouseNumber("APT-TEST-101");
		resident.setApartmentBlock("Block TEST");
		userRepository.save(resident);

		// Prepare a Community Admin user for Block A
		User blockAAdmin = userRepository.findByUsername("admin_test").orElseGet(() -> {
			User u = new User("admin_test", "admin_test@test.com", "password", "ROLE_COMMUNITY_ADMIN", "APT-TEST-999", "Colony 1", "Block TEST", "Male");
			u.setStatus("APPROVED");
			return userRepository.save(u);
		});
		blockAAdmin.setHouseNumber("APT-TEST-999");
		blockAAdmin.setApartmentBlock("Block TEST");
		blockAAdmin.setRole("ROLE_COMMUNITY_ADMIN");
		blockAAdmin.setWaterRatePerLiter(0.05);
		userRepository.save(blockAAdmin);

		// Log some water usage for the resident: 2000 Liters
		waterUsageRepository.save(new WaterUsageLog("APT-TEST-101", "Block TEST", java.time.LocalDate.now().minusDays(5), 2000.0, "MANUAL"));

		// Prepare a TariffPlan
		TariffPlan plan = new TariffPlan("Test Plan", 10.0, 5.0, 12.0, 30.0, 20.0, 50.0, 1L);

		// Calculate household bill
		java.util.Map<String, Double> breakdown = billingEngineService.calculateHouseholdBill(
				"APT-TEST-101", 
				java.time.LocalDate.now().minusDays(10), 
				java.time.LocalDate.now().plusDays(1), 
				plan
		);

		// Since customRatePerLiter is 0.05:
		// Base consumption charge = 2000 * 0.05 = 100.0
		// Fixed charge = 50.0
		// Total charge = 150.0
		org.junit.jupiter.api.Assertions.assertEquals(100.0, breakdown.get("tier1Charge"));
		org.junit.jupiter.api.Assertions.assertEquals(150.0, breakdown.get("totalCharge"));
	}

	@Test
	void testWaterUsageLoggingSecurity() {
		// Prepare a Community Admin user for Block A
		userRepository.findByUsername("admin_test").ifPresentOrElse(u -> {
			u.setHouseNumber("APT-TEST-999");
			u.setRole("ROLE_COMMUNITY_ADMIN");
			userRepository.save(u);
		}, () -> {
			User u = new User("admin_test", "admin_test@test.com", "password", "ROLE_COMMUNITY_ADMIN", "APT-TEST-999", "Colony 1", "Block A", "Male");
			u.setStatus("APPROVED");
			userRepository.save(u);
		});

		// Log usage for a Community Admin using a non-Admin role: should fail (403 status code)
		WaterUsageLog log = new WaterUsageLog("APT-TEST-999", "Block A", java.time.LocalDate.now(), 500.0, "MANUAL");
		
		org.springframework.http.ResponseEntity<?> responseCoAdmin = waterUsageController.logWaterUsage(log, "ROLE_COMMUNITY_ADMIN");
		org.junit.jupiter.api.Assertions.assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, responseCoAdmin.getStatusCode());

		// Log usage for a Community Admin using Admin role: should succeed
		org.springframework.http.ResponseEntity<?> responseSuperAdmin = waterUsageController.logWaterUsage(log, "ROLE_ADMIN");
		org.junit.jupiter.api.Assertions.assertEquals(org.springframework.http.HttpStatus.OK, responseSuperAdmin.getStatusCode());
	}

	@Test
	void testBillGenerationSecurity() {
		// Prepare a Community Admin user for Block A
		userRepository.findByUsername("admin_test").ifPresentOrElse(u -> {
			u.setHouseNumber("APT-TEST-999");
			u.setRole("ROLE_COMMUNITY_ADMIN");
			userRepository.save(u);
		}, () -> {
			User u = new User("admin_test", "admin_test@test.com", "password", "ROLE_COMMUNITY_ADMIN", "APT-TEST-999", "Colony 1", "Block A", "Male");
			u.setStatus("APPROVED");
			userRepository.save(u);
		});

		// Generate bill for a Community Admin using a non-Admin role: should fail (403 status code)
		Bill bill = new Bill();
		bill.setHouseNumber("APT-TEST-999");
		bill.setApartmentBlock("Block A");
		bill.setAmount(100.0);
		bill.setDueDate(java.time.LocalDate.now().plusDays(15));
		bill.setStatus("UNPAID");
		bill.setBillingCycleId(1L);

		org.springframework.http.ResponseEntity<?> responseCoAdmin = billController.createBill(bill, "ROLE_COMMUNITY_ADMIN");
		org.junit.jupiter.api.Assertions.assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, responseCoAdmin.getStatusCode());

		// Generate bill for a Community Admin using Admin role: should succeed
		org.springframework.http.ResponseEntity<?> responseSuperAdmin = billController.createBill(bill, "ROLE_ADMIN");
		org.junit.jupiter.api.Assertions.assertEquals(org.springframework.http.HttpStatus.OK, responseSuperAdmin.getStatusCode());
	}

	@Test
	void testPaymentReminderSystem() {
		// Clean up existing data for clean tests
		notificationRepository.deleteAll();
		billRepository.deleteAll();

		// Create a Community Admin
		User admin = userRepository.findByUsername("admin_reminder_test").orElseGet(() -> {
			User u = new User("admin_reminder_test", "admin_rem@test.com", "password", "ROLE_COMMUNITY_ADMIN", "APT-99", "Colony A", "Block REM", "Male");
			u.setStatus("APPROVED");
			return userRepository.save(u);
		});
		admin.setApartmentBlock("Block REM");
		admin.setRole("ROLE_COMMUNITY_ADMIN");
		admin.setStatus("APPROVED");
		userRepository.save(admin);

		// Create a Resident
		User resident = userRepository.findByUsername("resident_reminder_test").orElseGet(() -> {
			User u = new User("resident_reminder_test", "res_rem@test.com", "password", "ROLE_RESIDENT", "APT-10", "Colony A", "Block REM", "Male");
			u.setStatus("APPROVED");
			return userRepository.save(u);
		});
		resident.setHouseNumber("APT-10");
		resident.setApartmentBlock("Block REM");
		resident.setRole("ROLE_RESIDENT");
		resident.setStatus("APPROVED");
		userRepository.save(resident);

		// Add an unpaid bill
		Bill bill = new Bill();
		bill.setHouseNumber("APT-10");
		bill.setApartmentBlock("Block REM");
		bill.setAmount(120.0);
		bill.setGeneratedDate(java.time.LocalDate.now());
		bill.setDueDate(java.time.LocalDate.now().plusDays(10));
		bill.setStatus("UNPAID");
		bill.setBillingCycleId(1L);
		billRepository.save(bill);

		// Run check and notify
		java.util.Map<String, Integer> scanResults = paymentReminderService.checkAndNotifyUnpaidBills();
		
		// Assert that the scan identified 1 unpaid household for the admin
		org.junit.jupiter.api.Assertions.assertTrue(scanResults.containsKey("admin_reminder_test"));
		org.junit.jupiter.api.Assertions.assertEquals(1, scanResults.get("admin_reminder_test"));

		// Assert that a notification was created for the admin
		java.util.List<Notification> adminNotifs = notificationRepository.findByUsernameOrderByCreatedAtDesc("admin_reminder_test");
		org.junit.jupiter.api.Assertions.assertFalse(adminNotifs.isEmpty());
		org.junit.jupiter.api.Assertions.assertEquals("BILL_REMINDER", adminNotifs.get(0).getType());
		org.junit.jupiter.api.Assertions.assertTrue(adminNotifs.get(0).getMessage().contains("1 households"));

		// Dispatch a manual notice to the resident
		paymentReminderService.sendReminderToResident("APT-10", "Block REM");

		// Assert that a notification was created for the resident
		java.util.List<Notification> resNotifs = notificationRepository.findByUsernameOrderByCreatedAtDesc("resident_reminder_test");
		org.junit.jupiter.api.Assertions.assertFalse(resNotifs.isEmpty());
		org.junit.jupiter.api.Assertions.assertEquals("BILL_REMINDER", resNotifs.get(0).getType());
		org.junit.jupiter.api.Assertions.assertTrue(resNotifs.get(0).getMessage().contains("pending"));
	}

	@Test
	void testCsvTemplateAndImport() throws Exception {
		// Clean up residents
		userRepository.findByUsername("res_csv_1").ifPresent(u -> userRepository.delete(u));
		userRepository.findByUsername("res_csv_2").ifPresent(u -> userRepository.delete(u));

		// Create two residents
		User u1 = new User("res_csv_1", "csv1@test.com", "password123", "ROLE_RESIDENT", "H-CSV-1", "Colony X", "Block CSV", "Male");
		u1.setStatus("APPROVED");
		userRepository.save(u1);

		User u2 = new User("res_csv_2", "csv2@test.com", "password123", "ROLE_RESIDENT", "H-CSV-2", "Colony X", "Block CSV", "Male");
		u2.setStatus("APPROVED");
		userRepository.save(u2);

		// Download template for "Block CSV"
		org.springframework.http.ResponseEntity<String> templateResponse = waterUsageController.downloadTemplate("Block CSV");
		org.junit.jupiter.api.Assertions.assertEquals(org.springframework.http.HttpStatus.OK, templateResponse.getStatusCode());
		String csvBody = templateResponse.getBody();
		org.junit.jupiter.api.Assertions.assertNotNull(csvBody);
		org.junit.jupiter.api.Assertions.assertTrue(csvBody.contains("houseNumber,apartmentBlock,readingDate,readingLiters,logType"));
		org.junit.jupiter.api.Assertions.assertTrue(csvBody.contains("H-CSV-1,Block CSV"));
		org.junit.jupiter.api.Assertions.assertTrue(csvBody.contains("H-CSV-2,Block CSV"));

		// Simulate completed CSV upload
		String csvData = "houseNumber,apartmentBlock,readingDate,readingLiters,logType\n" +
				"H-CSV-1,Block CSV," + java.time.LocalDate.now().toString() + ",1500.0,DAILY\n" +
				"H-CSV-2,Block CSV," + java.time.LocalDate.now().toString() + ",25000.0,MONTHLY\n";

		org.springframework.mock.web.MockMultipartFile mockFile = new org.springframework.mock.web.MockMultipartFile(
				"file", "water_usage_template.csv", "text/csv", csvData.getBytes()
		);

		org.springframework.http.ResponseEntity<?> uploadResponse = waterUsageController.uploadCsvReadings(mockFile, "ROLE_ADMIN");
		org.junit.jupiter.api.Assertions.assertEquals(org.springframework.http.HttpStatus.OK, uploadResponse.getStatusCode());
		org.junit.jupiter.api.Assertions.assertTrue(uploadResponse.getBody().toString().contains("Processed 2 readings successfully"));

		// Verify records in database
		java.util.List<WaterUsageLog> logs1 = waterUsageRepository.findByHouseNumber("H-CSV-1");
		org.junit.jupiter.api.Assertions.assertFalse(logs1.isEmpty());
		org.junit.jupiter.api.Assertions.assertEquals("DAILY", logs1.get(0).getLogType());
		org.junit.jupiter.api.Assertions.assertEquals(1500.0, logs1.get(0).getReadingLiters());

		java.util.List<WaterUsageLog> logs2 = waterUsageRepository.findByHouseNumber("H-CSV-2");
		org.junit.jupiter.api.Assertions.assertFalse(logs2.isEmpty());
		org.junit.jupiter.api.Assertions.assertEquals("MONTHLY", logs2.get(0).getLogType());
		org.junit.jupiter.api.Assertions.assertEquals(25000.0, logs2.get(0).getReadingLiters());
	}
	@Test
	void testTieredBillingWithExcessCharge() {
		// Clean up previous test data
		userRepository.findByUsername("tier_admin_test").ifPresent(u -> userRepository.delete(u));
		userRepository.findByUsername("tier_resident_test").ifPresent(u -> userRepository.delete(u));

		// Create a Community Admin with tiered tariff settings
		User admin = new User("tier_admin_test", "tier_admin@test.com", "password", "ROLE_COMMUNITY_ADMIN", "APT-TIER-999", "Colony T", "Block TIER", "Male");
		admin.setStatus("APPROVED");
		admin.setWaterRatePerLiter(0.01);		// ₹0.01 per liter base rate
		admin.setMonthlyLimitLiters(3000.0);	// 3000 L limit
		admin.setExcessRatePerLiter(0.03);		// ₹0.03 per liter above limit
		userRepository.save(admin);

		// Create a Resident with NO tariff fields set (simulates invite-registered user)
		User resident = new User("tier_resident_test", "tier_res@test.com", "password", "ROLE_RESIDENT", "APT-TIER-101", "Colony T", "Block TIER", "Male");
		resident.setStatus("APPROVED");
		// Intentionally NOT setting waterRatePerLiter, monthlyLimitLiters, excessRatePerLiter
		userRepository.save(resident);

		// Log 5000 L usage (exceeds the 3000 L limit by 2000 L)
		waterUsageRepository.save(new WaterUsageLog("APT-TIER-101", "Block TIER", java.time.LocalDate.now().minusDays(3), 5000.0, "MANUAL"));

		// Trigger bill generation via BillController
		org.springframework.http.ResponseEntity<?> resp = billController.generateBillForHousehold("APT-TIER-101");
		org.junit.jupiter.api.Assertions.assertEquals(org.springframework.http.HttpStatus.OK, resp.getStatusCode());

		Bill generatedBill = (Bill) resp.getBody();
		org.junit.jupiter.api.Assertions.assertNotNull(generatedBill);

		// Expected: within-limit = 3000 L * 0.01 = ₹30, excess = 2000 L * 0.03 = ₹60, total = ₹90
		org.junit.jupiter.api.Assertions.assertEquals(3000.0, generatedBill.getWithinLimitLiters(), 0.01);
		org.junit.jupiter.api.Assertions.assertEquals(2000.0, generatedBill.getExcessLiters(), 0.01);
		org.junit.jupiter.api.Assertions.assertEquals(30.0, generatedBill.getBaseCharge(), 0.01);
		org.junit.jupiter.api.Assertions.assertEquals(60.0, generatedBill.getExcessCharge(), 0.01);
		org.junit.jupiter.api.Assertions.assertEquals(90.0, generatedBill.getAmount(), 0.01);

		// Clean up usage logs
		waterUsageRepository.findByHouseNumber("APT-TIER-101").forEach(l -> waterUsageRepository.delete(l));
		billRepository.findByHouseNumber("APT-TIER-101").forEach(b -> billRepository.delete(b));
	}
}
