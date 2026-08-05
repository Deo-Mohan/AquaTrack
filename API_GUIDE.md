# 💧 AquaTrack — Complete API Reference & Implementation Guide

This document provides a comprehensive, production-ready specification of all backend REST API endpoints, security authentication requirements, payload models, calculation logic, and controller implementations for the **AquaTrack Smart Water Management & Billing Platform**.

---

## 🔑 Authentication & Global Headers

All protected endpoints require HTTP Bearer Token authentication:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 🌐 1. Authentication & Account Management (`/api/auth`, `/api/users`)

### `POST /api/auth/signup`
Registers a new resident or community administrator.
* **Access Control**: Public
* **Payload**:
  ```json
  {
    "username": "rahulkumar",
    "password": "Password123!",
    "email": "rahul@example.com",
    "role": "ROLE_RESIDENT",
    "colonyName": "Green Valley Colony",
    "apartmentBlock": "Block A",
    "houseNumber": "101",
    "fullName": "Rahul Kumar",
    "mobileNumber": "9876543210",
    "whatsAppNumber": "9876543210",
    "gender": "male"
  }
  ```
* **Response (200 OK)**:
  ```json
  { "message": "User registered successfully. Pending verification approval." }
  ```

---

### `POST /api/auth/login`
Authenticates a user session and returns a JWT access token.
* **Access Control**: Public
* **Payload**:
  ```json
  { "username": "rahulkumar", "password": "Password123!" }
  ```
* **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "username": "rahulkumar",
    "role": "ROLE_RESIDENT",
    "email": "rahul@example.com",
    "apartmentBlock": "Block A",
    "houseNumber": "101",
    "colonyName": "Green Valley Colony",
    "meterId": "WM-BLK-A-101"
  }
  ```

---

### `PUT /api/users/profile/{username}`
Updates user profile information (email, full name, mobile, whatsapp, gender).
* **Access Control**: Authenticated User (`ROLE_RESIDENT`, `ROLE_COMMUNITY_ADMIN`, `ROLE_ADMIN`)
* **Payload**:
  ```json
  {
    "fullName": "Rahul Kumar",
    "email": "rahul.updated@example.com",
    "mobileNumber": "9876543210",
    "whatsAppNumber": "9876543210",
    "gender": "male"
  }
  ```

---

### `PUT /api/users/profile/change-password/{username}`
Updates user account password securely.
* **Access Control**: Authenticated User
* **Payload**:
  ```json
  {
    "currentPassword": "Password123!",
    "newPassword": "NewSecurePassword123!"
  }
  ```

---

## 📅 2. Billing Cycles & Overrides (`/api/billing-cycles`)

### `POST /api/billing-cycles`
Creates a new billing operational timeframe.
* **Access Control**: `ROLE_COMMUNITY_ADMIN`, `ROLE_ADMIN`
* **Payload**:
  ```json
  {
    "cycleName": "August 2026 Cycle",
    "startDate": "2026-08-01",
    "endDate": "2026-08-31",
    "apartmentBlock": "Block A"
  }
  ```

---

### `GET /api/billing-cycles`
Retrieves billing cycles with **Super Admin Override logic** applied.
* **Access Control**: Authenticated User
* **Super Admin Override Logic**: If a Super Admin creates a cycle for a specific block, any Community Admin-defined cycles for that block are automatically overridden to prevent billing conflicts.

---

### `POST /api/billing-cycles/{id}/finalize`
Finalizes a cycle and triggers automated batch bill generation across all households.
* **Access Control**: `ROLE_COMMUNITY_ADMIN`, `ROLE_ADMIN`
* **Response (200 OK)**:
  ```json
  { "message": "Billing cycle finalized. 42 invoices generated and notifications sent." }
  ```

---

## 🚰 3. Water Meter Logging & Bulk CSV (`/api/water-usage`)

### `POST /api/water-usage/log`
Submits a meter reading log for a household.
* **Access Control**: `ROLE_COMMUNITY_ADMIN` Only (Residents & Super Admins blocked from manual logging)
* **Payload**:
  ```json
  {
    "houseNumber": "101",
    "apartmentBlock": "Block A",
    "readingLiters": 350.0,
    "readingDate": "2026-08-05",
    "logType": "DAILY"
  }
  ```

---

### `POST /api/water-usage/upload-csv`
Bulk imports water usage logs from a CSV file.
* **Access Control**: `ROLE_COMMUNITY_ADMIN`, `ROLE_ADMIN`
* **Form Field**: `file` (Multipart CSV file)

---

## 💳 4. Invoices, Payments, & Reminders (`/api/bills`)

### `GET /api/bills/user/{houseNumber}`
Fetches billing history for a specific household.
* **Access Control**: Authenticated Resident or Admin

---

### `POST /api/bills/reminders/check`
Scans all community blocks for overdue bills and alerts Community Admins.
* **Access Control**: `ROLE_ADMIN` (Super Admin)
* **Response (200 OK)**:
  ```json
  { "message": "Global scan completed. Community admins have been alerted." }
  ```

---

### `POST /api/bills/reminders/send-all`
Dispatches automated email payment reminders to all unpaid households in a block.
* **Access Control**: `ROLE_COMMUNITY_ADMIN`, `ROLE_ADMIN`
* **Query Parameter**: `apartmentBlock=Block A`

---

### `POST /api/bills/reminders/send`
Dispatches an individual payment notice to a specific resident.
* **Query Parameters**: `houseNumber=101&apartmentBlock=Block A`

---

## 🚚 5. Bulk Water Tanker Purchase (`/api/water-purchase`)

### `POST /api/water-purchase/request`
Submits a emergency/extra bulk water tanker request.
* **Access Control**: `ROLE_RESIDENT`, `ROLE_COMMUNITY_ADMIN`
* **Payload**:
  ```json
  {
    "tankerCapacityLiters": 5000,
    "deliveryDate": "2026-08-06",
    "deliveryTimeSlot": "MORNING_08_11",
    "apartmentBlock": "Block A",
    "houseNumber": "101",
    "paymentMethod": "UPI"
  }
  ```

---

## 🏷️ 6. Tariff Management (`/api/tariffs`)

### `GET /api/tariffs/block/{apartmentBlock}`
Fetches active water tariff rates, base limit quotas, penalty rates, grace periods, and late fee amounts.
* **Response (200 OK)**:
  ```json
  {
    "apartmentBlock": "Block A",
    "baseLimitLiters": 10000,
    "baseRatePerLiter": 0.04,
    "excessRatePerLiter": 0.08,
    "gracePeriodDays": 5,
    "lateFeeFixed": 150.00
  }
  ```

---

## 🎫 7. Support Ticketing & Escalations (`/api/tickets`)

### `POST /api/tickets`
Submits a new maintenance or billing support ticket.
* **Payload**:
  ```json
  {
    "subject": "Meter Reading Discrepancy",
    "category": "METER_ISSUE",
    "description": "My daily reading shows 800L which is higher than average.",
    "priority": "HIGH"
  }
  ```

---

### `PUT /api/tickets/{id}/escalate`
Escalates an unresolved ticket from Community Admin to Super Admin.
* **Access Control**: `ROLE_COMMUNITY_ADMIN`

---

## 🤖 8. AI Chatbot Assistant (`/api/chatbot`)

### `POST /api/chatbot/query`
Executes RAG context assembly and queries Google Gemini 1.5 Flash.
* **Payload**:
  ```json
  {
    "query": "What is my current bill status?",
    "username": "rahulkumar",
    "language": "en"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "answer": "Your August bill of ₹450 is currently UNPAID and due on 15th August.",
    "intent": "BILLING_STATUS"
  }
  ```

---

## 🔔 9. PWA Push Notifications (`/api/notifications`)

### `POST /api/notifications/pwa-subscription`
Registers Web Push API credentials for PWA notifications.
* **Payload**:
  ```json
  {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BIP...",
      "auth": "3z..."
    }
  }
  ```
