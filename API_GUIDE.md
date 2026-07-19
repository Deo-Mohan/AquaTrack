# AquaTrack: API Reference and Implementation Guide

This document describes the core backend API endpoints, payload models, and controller implementations for the AquaTrack Platform.

---

## 1. Authentication and Onboarding

### `POST /api/auth/signup`
Registers a new resident or community administrator.
* **Payload:**
  ```json
  {
    "username": "rahulkumar",
    "password": "Password123!",
    "email": "rahul@example.com",
    "role": "ROLE_COMMUNITY_ADMIN",
    "colonyName": "Qutub Minar Colony",
    "apartmentBlock": "Block A",
    "houseNumber": "101",
    "fullName": "Rahul Kumar",
    "mobileNumber": "9876543210",
    "gender": "Male"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "message": "User registered successfully. Pending approval."
  }
  ```

### `POST /api/auth/login`
Authenticates a user and starts a session.
* **Payload:**
  ```json
  {
    "username": "rahulkumar",
    "password": "Password123!"
  }
  ```
* **Response (200 OK):** Returns user profile details, active colony/block context, and authorization flags.

---

## 2. Billing Cycles Management (`/api/billing-cycles`)

Handles operational timeframes for batch calculations.

### `POST /api/billing-cycles`
Creates a new billing cycle.
* **Payload:**
  ```json
  {
    "cycleName": "July 2026 Cycle",
    "startDate": "2026-07-01",
    "endDate": "2026-07-31",
    "apartmentId": 1,
    "apartmentBlock": "Block A",
    "createdByRole": "ROLE_COMMUNITY_ADMIN"
  }
  ```
* **Java Implementation Snippet:**
  ```java
  @PostMapping
  public ResponseEntity<BillingCycle> createCycle(@Valid @RequestBody BillingCycle cycle) {
      cycle.setStatus("OPEN");
      if (cycle.getCreatedByRole() == null || cycle.getCreatedByRole().trim().isEmpty()) {
          cycle.setCreatedByRole("ROLE_COMMUNITY_ADMIN");
      }
      return ResponseEntity.ok(billingCycleRepository.save(cycle));
  }
  ```

### `GET /api/billing-cycles` & `GET /api/billing-cycles/apartment/{apartmentId}`
Fetches active billing cycles with **Super Admin override filtering** applied.
* **Override Logic:** If a Super Admin (`ROLE_ADMIN`) creates a cycle for a specific apartment and block, any Community Admin-defined cycles for that block are automatically filtered out on the backend to prevent duplicate or conflicting cycles.
* **Java Implementation Snippet:**
  ```java
  private List<BillingCycle> applyOverrides(List<BillingCycle> cycles) {
      return cycles.stream().filter(c -> {
          if (!"ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(c.getCreatedByRole()) && c.getCreatedByRole() != null) {
              return true;
          }
          boolean hasSuperAdminOverride = cycles.stream().anyMatch(other -> 
              "ROLE_ADMIN".equalsIgnoreCase(other.getCreatedByRole()) &&
              other.getApartmentId().equals(c.getApartmentId()) &&
              (
                  (other.getApartmentBlock() == null && c.getApartmentBlock() == null) ||
                  (other.getApartmentBlock() != null && other.getApartmentBlock().equalsIgnoreCase(c.getApartmentBlock()))
              )
          );
          return !hasSuperAdminOverride;
      }).collect(Collectors.toList());
  }
  ```

---

## 3. Water Consumption Logging (`/api/water-usage`)

Manages meter readings. Only administrators can perform logging operations.

### `POST /api/water-usage/log`
Submits a meter reading log for a household.
* **Access Control:** Residents are blocked from logging water usage. Community Admins can log usage for standard households, and Super Admins can log usage for any household (including Community Admins).
* **Payload:**
  ```json
  {
    "houseNumber": "101",
    "apartmentBlock": "Block A",
    "consumptionLiters": 350.0,
    "date": "2026-07-19"
  }
  ```
* **Java Implementation Snippet:**
  ```java
  if (log.getHouseNumber() != null) {
      Optional<User> targetUser = userRepository.findByHouseNumber(log.getHouseNumber());
      if (targetUser.isPresent() && "ROLE_COMMUNITY_ADMIN".equalsIgnoreCase(targetUser.get().getRole())) {
          if (!"ROLE_ADMIN".equalsIgnoreCase(callerRole)) {
              return ResponseEntity.status(403).body("Access denied. Only Super Admin can log water usage for a Community Admin.");
          }
      }
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "message": "Water usage log submitted successfully."
  }
  ```

---

## 4. Invoicing and Payments (`/api/bills`)

Calculates, issues, and tracks bills.

### `POST /api/bills/create`
Generates a custom bill manual override.
* **Payload:**
  ```json
  {
    "houseNumber": "101",
    "apartmentBlock": "Block A",
    "amount": 420.50,
    "dueDate": "2026-08-15",
    "status": "UNPAID",
    "billingCycleId": 1
  }
  ```

### `POST /api/billing-cycles/{id}/finalize`
Triggers batch billing calculation across all households in the cycle's scope.
* **Calculations Executed:**
  1. Verifies that all households have logged readings within the cycle range.
  2. Integrates and distributes shared area costs across block residents.
  3. Evaluates tiered tariff rates (Base Usage vs. Excess Usage Penalty rates).
  4. Creates database bill records and sends email notifications.
