# 🤖 AquaTrack AI Household Assistant & Chatbot Guide

AquaTrack features an enterprise-grade, multi-lingual, voice-enabled **AI Household Assistant & Chatbot** designed to assist residents, community admins, and super admins with instant billing queries, consumption analytics, leak reporting, tariff explanations, and platform navigation.

---

## 🏗️ Architecture & Core Components

```
                     ┌─────────────────────────────────────────┐
                     │          Household Resident / Admin    │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │  Frontend: HouseholdChatbot.jsx         │
                     │  - Glassmorphic Draggable/Resizable UI  │
                     │  - Voice Input (STT) & Speech (TTS)    │
                     │  - Deep-link Action Buttons             │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │    Local Intent Interceptor & Fuzzy     │
                     │    Matching Engine (Fast-Path)          │
                     └────────────────────┬────────────────────┘
                                          │ (If not matched locally)
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │  Backend: ChatbotController.java        │
                     │  - Contextual RAG Prompt Assembler      │
                     │  - Google Gemini 1.5 Flash REST API    │
                     └─────────────────────────────────────────┘
```

---

## 🎯 Key Features & Functionalities

### 1. ⚡ Local Intent Interceptor & Fuzzy Matching Engine
To ensure instant (<50ms) response times and eliminate unnecessary API calls, the chatbot utilizes a client-side fuzzy intent resolution engine:
* **Identity & Account Queries**: Responds with logged-in user's full name, house number, block, and meter ID.
* **Current Bill & Outstanding Due**: Pulls live invoice data, due dates, and offers 1-tap "Pay Now" action buttons.
* **Usage Analytics**: Calculates total liters consumed in the current month and compares against the base monthly quota.
* **Tariff & Pricing Rates**: Explains standard rates, tier limits, grace periods, and late fee policies.
* **Water Purchase & Tankers**: Provides deep-links to request additional water tankers.
* **Support & Maintenance**: Guides users to create or check support tickets.

---

### 2. 🤖 Google Gemini 1.5 Flash AI Engine & Contextual RAG
When a complex or custom query is entered:
* The backend (`ChatbotController.java`) constructs a rich **Retrieval-Augmented Generation (RAG)** context payload containing:
  - User's profile details (Name, House Number, Block, Role).
  - Active water billing cycle and current month consumption.
  - Active tariff tiers and penalty rates.
  - Recent support tickets and payment status.
* Queries Google Gemini 1.5 Flash API with strict system instructions to act as **AquaTrack Water Conservation & Billing Expert**.

---

### 3. 🎙️ Acoustic Personalization & Text-to-Speech (TTS)
* **Localized Voice Acoustics**: Integrated browser `window.speechSynthesis` with Indian accent prioritization (`en-IN`, `hi-IN`).
* **Siri-Tuned Parameters**: Configured pitch (`1.05`), rate (`1.0`), and volume (`1.0`) for natural, human-like voice responses.
* **Voice Search Input (STT)**: Integrated Web Speech API for hands-free voice query typing.

---

### 4. 🌐 Multi-Lingual Support
* Full native understanding and response generation in **English**, **Hindi**, and **Regional Languages**.
* Automatic translation fallback for quick question pills.

---

### 5. 🎨 Interactive Glassmorphic UI
* **Multi-Touch Responsive Window**: Drag-and-move header with resizable bounds on desktop and compact full-screen mode on mobile.
* **Contextual Quick Question Pills**: Dynamic suggestion buttons based on user role (Resident vs. Admin).
* **Action Buttons**: Embedded deep-link buttons inside chat bubbles for instant navigation:
  - 💳 **Pay Bill Now** (`/billing`)
  - 📄 **View & Download Invoice** (`/invoices`)
  - 📊 **Check Detailed Usage** (`/usage-history`)
  - 🚰 **Order Extra Water Tanker** (`/water-purchase`)
  - 🔧 **File Support Ticket** (`/support`)

---

## 📡 API Reference

### 1. `POST /api/chatbot/query`
Processes user chat queries via the backend RAG engine.

* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Request Payload**:
  ```json
  {
    "query": "Why is my bill higher than last month?",
    "username": "rahulkumar",
    "language": "en"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "answer": "Your July bill includes 450 Liters of excess consumption above your 10,000L base quota. The excess rate of ₹0.08/L was applied.",
    "intent": "BILLING_INQUIRY",
    "suggestedActions": [
      { "label": "View Usage Breakup", "path": "/my-usage" },
      { "label": "Pay Outstanding Bill", "path": "/billing" }
    ]
  }
  ```

---

### 2. `GET /api/chatbot/suggestions`
Retrieves role-specific context pills for the chatbot interface.

* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response (200 OK)**:
  ```json
  [
    "What is my current water bill?",
    "How can I reduce daily water usage?",
    "What are the excess tariff rates for Block A?",
    "How to request a water tanker?"
  ]
  ```

---

## 🛠️ Configuration & Secrets

Ensure the following key is set in `src/main/resources/application-secrets.properties`:
```properties
GEMINI_API_KEY=your_google_gemini_api_key_here
```
