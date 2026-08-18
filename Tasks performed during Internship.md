# Task Performed During Internship — Infosys Springboard Virtual Internship 7.0

| Field | Details |
| :--- | :--- |
| **Internship Name** | Infosys Springboard Virtual Internship 7.0 |
| **Intern Name** | Krishna Mohan Kumar |
| **Project Title** | Web-Based Water Usage Monitoring and Billing Administration Platform (AquaTrack) |
| **Start Date** | 30 June 2026 |
| **End Date** | 9 August 2026 |
| **Duration** | 8 Weeks (Virtual / Remote) |

---

## 1. Executive Summary & Objective

During the 8-week **Infosys Springboard Virtual Internship 7.0**, I designed, architected, developed, and deployed **AquaTrack** — a full-stack, enterprise-grade residential water monitoring, automated billing, and community administration platform built using **Spring Boot 4.1**, **React 19 + Vite**, **MySQL 8.0**, **Tailwind CSS 4.x**, **Framer Motion**, and **Google Gemini 1.5 Flash AI**.

The project resolves critical urban apartment challenges: non-transparent water billing, equitable shared-area procurement cost distribution, undetected water leakage, and manual administrative overhead.

---

## 2. Weekly Breakup of Tasks Performed

### Weeks 1–2: Database Architecture, Backend Foundation & Authentication
- **Database Schema Design:** Architected a relational schema (`aquatrack`) supporting a hierarchical location model (`Colony` → `Building` → `Apartment Block` → `Household`) and mapped all JPA entities.
- **Spring Boot Initialization:** Configured Spring Boot 4.1 with Spring Data JPA, Hibernate, HikariCP connection pool, and Lombok.
- **Security & Authentication:** Implemented stateless JWT-based authentication using **Spring Security 6** and JJWT (0.11.5) with Role-Based Access Control (RBAC) supporting `ROLE_ADMIN` (Super Admin), `ROLE_COMMUNITY_ADMIN`, and `ROLE_RESIDENT`.
- **Water Usage Logging Module:** Built APIs for manual daily meter reading logs and bulk CSV import (`POST /api/water-usage/upload-csv`) with validation and duplicate detection.

### Weeks 3–4: Billing Engine, Tariff System, Cost Distribution & Alert Engine
- **Configurable Tiered Tariff Engine (`BillingEngineService`):** Implemented a 3-tier price resolution algorithm (Resident override → Community Admin block rate → System default TariffPlan) supporting base limits, excess usage penalty rates, late fee accrual, and grace periods.
- **Billing Cycle Lifecycle:** Developed a state machine (`OPEN` → `FINALIZED` → `ARCHIVED`) with automated missing-log validation before finalization.
- **Shared Area Cost Allocation (`ConsumptionDistributionService`):** Aggregated common-area water usage and distributed procurement costs proportionally among active households.
- **Anomaly & Leak Detection (`AlertService`):** Built scheduled background processors detecting consumption spikes exceeding 150% of historical averages, automatically triggering in-app notifications and email alerts.
- **Resident Invitation Workflow:** Built token-based resident registration (`/register/invite/:token`) with document verification approvals.

### Weeks 5–6: Frontend Workstation, AI Assistant, Razorpay & PDF Exports
- **Resident & Admin Dashboards:** Built interactive React 19 dashboards featuring **Recharts** analytics (Area, Bar, Line, Pie), peer conservation leaderboards, and real-time environmental metrics.
- **Meter Workstation (`MeterWorkstation.jsx`):** Developed voice-search lookup (`useSpeechToText` hook + `MicSearchBox`), dynamic text highlight matching, and keyboard navigation.
- **AI Household Assistant (`HouseholdChatbot.jsx`):** Integrated **Google Gemini 1.5 Flash** with Retrieval-Augmented Generation (RAG), local fuzzy intent matching (<50ms), Text-to-Speech (TTS with Siri/Google voice priority), Speech-to-Text (STT), and deep-link action buttons.
- **Razorpay Integration & Invoice Generator:** Integrated Razorpay SDK for UPI/Card payments with HMAC-SHA256 signature verification and created an 825-line print-ready watermarked PDF invoice generator (`invoiceGenerator.js`).

### Weeks 7–8: Integration, Testing, PWA & Final Presentation
- **Progressive Web App (PWA):** Built `sw.js` service worker caching, dynamic `manifest.json`, and device-aware installation guide (`PwaInstallPrompt.jsx`).
- **Multi-Language Support:** Integrated Google Translate with phonetic transliteration for names and `notranslate` protection for identifiers.
- **Support Ticket System:** Built multi-role ticketing with escalation to Super Admin and automated daily cleanup (`SupportCleanupService`).
- **Transactional Email Service (`EmailService.java`):** Built 8 branded HTML email templates for bill delivery, payment reminders, leak alerts, and invitations.
- **Testing & Finalization:** Performed integration testing, API validation, cross-browser verification, and completed technical documentation.

---

## 3. High-Level Flow Chart

Below is the end-to-end architectural workflow of the AquaTrack system:

```
[ Meter Reading Input / CSV Upload ] ──► [ WaterUsageLog Repository ]
                                                   │
                                                   ▼
[ Admin Triggers Cycle Finalization ] ──► [ BillingEngineService ]
                                                   │
                ┌──────────────────────────────────┼──────────────────────────────────┐
                ▼                                  ▼                                  ▼
   [ Apply Tiered Tariff Plan ]      [ Shared Cost Distribution ]      [ Calculate Net Household Bill ]
                │                                  │                                  │
                └──────────────────────────────────┼──────────────────────────────────┘
                                                   │
                                                   ▼
                                    [ Generate Bill Records (UNPAID) ]
                                                   │
                     ┌─────────────────────────────┴─────────────────────────────┐
                     ▼                                                           ▼
    [ Send Itemized HTML Email Invoices ]                       [ Trigger In-App Notifications ]
                     │                                                           │
                     ▼                                                           ▼
    [ Resident Receives Email Invoice ]                         [ View on Resident Dashboard ]
                     │                                                           │
                     └─────────────────────────────┬─────────────────────────────┘
                                                   │
                                                   ▼
                                  [ Online Payment via Razorpay Gateway ]
                                                   │
                                                   ▼
                                  [ Verify Signature & Update Status: PAID ]
```

---

## 4. Architectural & UI Highlights

Below are visual architectural references extracted from project assets:

### System Architecture Flowchart
![System Flowchart](file:///d:/INFOSYS%20PROJECT/docx_extracted/word/media/image1.png)

### Sample Administrative Dashboard Interface
![Sample Dashboard](file:///d:/INFOSYS%20PROJECT/docx_extracted/word/media/image2.png)

---

## 5. Technology Stack Summary

| Domain | Framework / Library | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Core** | Spring Boot | 4.1.0 | RESTful API Services, Dependency Injection |
| **Security** | Spring Security 6 + JJWT | 6.x / 0.11.5 | Stateless JWT Authentication, RBAC |
| **Database & ORM** | MySQL + Spring Data JPA | 8.0+ | Relational Data Persistence & Schema Management |
| **Frontend Core** | React + Vite | 19 / 8.x | High-Performance SPA Interface |
| **Styling & Motion** | Tailwind CSS + Framer Motion | 4.x / 12.x | Glassmorphic Responsive Design System & Animations |
| **Analytics & Charts** | Recharts | 3.x | Interactive Water Usage & Financial Visualizations |
| **AI Integration** | Google Gemini 1.5 Flash | REST API | Multilingual RAG AI Assistant |
| **Payment Gateway** | Razorpay Java SDK | 1.4.3 | UPI & Card Payment Processing |
| **Email Service** | Spring Boot Mail (JavaMail) | — | Transactional HTML Email Delivery |
| **Voice Interface** | Web Speech API (STT / TTS) | Browser Native | Voice Search Input & Conversational Speech Output |

---

## 6. Key Deliverables & Achievements

1. **Full-Stack Application Deployment:** Delivered a fully working, secure, responsive application supporting Super Admin, Community Admin, and Resident workflows.
2. **Automated Billing Accuracy:** Eliminated manual calculation errors through a strict 3-tier tariff engine and proportional shared-area cost distribution.
3. **AI Assistant Integration:** Developed a 2-layer AI chatbot processing billing queries in sub-50ms with fallback to Gemini 1.5 Flash RAG context.
4. **Offline PWA Capabilities:** Delivered an installable Progressive Web App with offline service worker caching and cross-platform installation prompts.
5. **Comprehensive Technical Documentation:** Created exhaustive documentation guides (`README.md`, `API_GUIDE.md`, `BILLING_CYCLE_GUIDE.md`, `CHATBOT_GUIDE.md`, `TRANSLATION_GUIDE.md`).

---

*Document prepared by: **Krishna Mohan Kumar***  
*Infosys Springboard Virtual Internship 7.0*  
*Project: AquaTrack*
