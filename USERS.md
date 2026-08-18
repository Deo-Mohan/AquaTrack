# 💧 AquaTrack System Test Users & Seed Data

This document contains all pre-seeded test accounts available in the AquaTrack database for development, testing, and demonstration.

---

## 🔑 Common Password
All seeded accounts share the same password for ease of testing:
> **Password**: `Krishna1234@`

---

## ⚡ Super Admin (Global System Control)

| Field | Details |
| :--- | :--- |
| **Username** | `krishna` |
| **Full Name** | Krishna |
| **Role** | `ROLE_ADMIN` (Super Admin) |
| **Email** | `pwjeeprayas@gmail.com` |
| **Mobile Number** | `9876543210` |
| **Scope** | System-wide (Colonies, Buildings, Tariff Rules, Reports, Tickets) |
| **Account Status** | `APPROVED` |

---

## 🏛️ Colony 1: Bharat Nagar (Bhopal, MP)

### 👑 Community Admin: Taj Mahal
- **Username**: `abhay`
- **Full Name**: Abhay Raj
- **Role**: `ROLE_COMMUNITY_ADMIN`
- **Colony**: `Bharat Nagar`
- **Building / Block**: `Taj Mahal`
- **Email**: `abhay.raj@gmail.com`
- **Mobile Number**: `9876543220`
- **Account Status**: `APPROVED`

### 🏠 Household Residents under Abhay Raj (`Taj Mahal`)

| Full Name | Username | House No | Meter ID | Email | Mobile | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Yash Kumar** | `yash` | `101` | `MTR-TM-101` | `yash.tajmahal@gmail.com` | `9876543221` | `APPROVED` |
| **Ramendra Singh** | `ramendra` | `102` | `MTR-TM-102` | `ramendra.tajmahal@gmail.com` | `9876543222` | `APPROVED` |
| **Vivek Sharma** | `vivek` | `103` | `MTR-TM-103` | `vivek.tajmahal@gmail.com` | `9876543223` | `APPROVED` |

---

## 🏛️ Colony 2: Amarpur (Bhopal, MP)

### 👑 Community Admin: Block A2
- **Username**: `sushant`
- **Full Name**: Sushant Kumar
- **Role**: `ROLE_COMMUNITY_ADMIN`
- **Colony**: `Amarpur`
- **Building / Block**: `Block A2`
- **Email**: `sushant.amarpur@gmail.com`
- **Mobile Number**: `9876543230`
- **Account Status**: `APPROVED`

### 🏠 Household Residents under Sushant Kumar (`Block A2`)

| Full Name | Username | House No | Meter ID | Email | Mobile | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Ayush Kumar** | `ayush` | `201` | `MTR-A2-201` | `ayush.amarpur@gmail.com` | `9876543231` | `APPROVED` |
| **Adarsh Singh** | `adarsh` | `202` | `MTR-A2-202` | `adarsh.amarpur@gmail.com` | `9876543232` | `APPROVED` |
| **Chhotu Sharma** | `chhotu` | `203` | `MTR-A2-203` | `chhotu.amarpur@gmail.com` | `9876543233` | `APPROVED` |

---

## 🧪 Testing Guidelines

1. **Super Admin Flow**:
   - Log in with `krishna` / `Krishna1234@`.
   - Access global metrics, Colony & Building management, system-wide billing settings, and support ticket escalations.

2. **Community Admin Flow**:
   - Log in with `abhay` or `sushant`.
   - Manage residents for your assigned building (`Taj Mahal` or `Block A2`), record meter readings, issue monthly water bills, and configure tariff limits.

3. **Household Resident Flow**:
   - Log in with any resident username (`yash`, `ramendra`, `vivek`, `ayush`, `adarsh`, `chhotu`).
   - View water usage graphs, inspect monthly invoices, pay bills via Razorpay integration, and interact with the AI assistant.
