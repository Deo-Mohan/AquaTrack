# 💧 AquaTrack — Smart Water Management & Billing Platform

AquaTrack is a premium, full-stack smart water management, analytics, PWA, and automated billing platform designed for residential societies, apartments, and colonies. It empowers residents to monitor consumption, view and print watermarked invoices, resolve leaks, and enables admins to distribute bulk purchase costs, manage residents, approve verification documents, and track system anomalies.

---

## 🚀 Key Features

### 📲 Progressive Web App (PWA) & Mobile Installation
* **Native-Like Installation**: Standalone installable app experience across Android, iOS, Windows, and macOS with service worker caching (`sw.js`) and dynamic app manifest (`manifest.json`).
* **Device-Aware PWA Guide**: Responsive, theme-matching (Light/Dark mode) installation prompt with dynamic instructions customized for Smartphones, Tablets, and Desktops.

### 👤 Household Resident Dashboard & Gamified Leaderboard
* **Real-time Consumption**: Interactive charts showing daily and monthly consumption history.
* **Gamified Peer Competition**: Top 5 block leaderboard, proportional consumption share analysis, and real-time environmental impact metrics (CO2 offset, trees nourished, tanker equivalents).
* **Smart Water Conservation**: Interactive faucet visualization demonstrating water saving tips.
* **Watermarked Invoices**: Detailed, professional-grade billing invoices with official seals, prints, and downloads.
* **Notification Panel**: Real-time alerts for leaks, overconsumption, new bills, and verification updates.

### 🏢 Community Admin & Super Admin Workstation
* **Community Water Distribution Graph**: Centrally-aligned, mobile-optimized analytics card featuring 1-tap pill selectors for **Colony View** vs **Building View**, colony filtering, and **Bar**, **Line**, & **Area** chart toggles.
* **Payment Reminder Control Panel**: Responsive mobile-optimized action controls for *Scan & Alert Admins* and *Send All Reminders* with high-contrast alert status banners.
* **Resident Directory**: Smart search and filtering of all apartments and households.
* **Automated Billing Engine**: Generation of monthly billing cycles with consumption-based distribution.
* **Anomalies & Leak Detection**: Intelligent flagging of abnormal usage spikes.
* **Invitation System**: Invite new residents securely and approve uploaded verification documents.
* **Tariff Management**: Customizable tiered billing plans based on usage slabs.

### 🤖 AI Household Assistant & Smart Chatbot
* **AquaTrack AI Assistant**: Intelligent RAG & Google Gemini 1.5 Flash powered assistant for instant household query resolution.
* **Natural Multi-lingual Querying**: Responds to bill calculations, consumption stats, tariff rates, and support ticket statuses in Hindi, English, and regional languages.
* **Acoustic Personalization & TTS**: High-fidelity Text-to-Speech (TTS) integration with natural acoustic parameters.
* **Smart Actions**: One-click deep-link action buttons for payments, invoice downloads, usage analysis, and extra water purchases.

### 🛠️ Role-Differentiated Support & Resolution Center
* **Tiered Support Flow**: Customized ticketing dashboard tailored for Super Admins, Community Admins, and Household Residents.
* **Dynamic Role Attribution**: Notifications explicitly state whether a response came from a *Platform Super Admin* or *Community Manager*.
* **Automated Escalations**: Community Admins can escalate complex infrastructure tickets directly to Super Admins.
* **Automatic Ticket Cleanup**: Automated daily cleanup of tickets resolved over 15 days.

### 🎙️ Speech-to-Text (STT) Voice-Enabled Search & Keyboard Navigation
* **Voice Search Integration**: Native Web Speech API integration (`useSpeechToText` hook & `MicSearchBox` component) across Meter Workstation, Water Billing History, and Invoices modules.
* **Keyboard-Driven Dropdown**: Complete keyboard navigation (↑/↓ arrow keys, Tab/Enter selection, Esc to dismiss) for instant resident & meter search.
* **Matched Search Highlighting**: Dynamic blue-highlighted matching text in search results for resident names, house numbers, meter IDs, and apartment blocks.

### 🎨 Accessible UI & High-Contrast Liquid Glass Aesthetic
* **Responsive Light/Dark Themes**: Fully synchronized theme system supporting instant light and dark mode switching across all pages, charts, modals, and PWA prompts.
* **High-Contrast Typography**: Cohesive rich-brown and high-contrast earth-tone styling for status indicators, unbilled water logs, and warnings.
* **Multi-Language Protection**: Enforced `notranslate` tags across language selector controls ensuring proper native display of languages.

---

## 👨‍💻 Author & Developer Details

* **Lead Developer**: Krishna Mohan Kumar
* **Portfolio**: [https://krishnamohandeo.netlify.app](https://krishnamohandeo.netlify.app)
* **LinkedIn**: [https://www.linkedin.com/in/krishna-mohan-kumar/](https://www.linkedin.com/in/krishna-mohan-kumar/)
* **GitHub**: [https://github.com/Deo-Mohan](https://github.com/Deo-Mohan)

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Recharts | Premium glassmorphic responsive PWA UI |
| **Backend** | Spring Boot, Spring Security, JWT | RESTful API and core business engine |
| **Database** | MySQL | Persistent relational database storage |
| **AI Integration** | Google Gemini 1.5 Flash API & RAG Engine | Intelligent household water assistant |
| **PWA Capabilities** | Web App Manifest, Service Worker, Install Prompt | Cross-platform offline installable application |
| **Payment Gateway** | Razorpay | Online UPI, Credit/Debit card payments |
| **Build Tools** | Maven, NPM | Package and dependency managers |

---

## 📦 Project Structure

```
aquatrack/
├── src/                    # Spring Boot backend source code
├── pom.xml                 # Maven dependencies & configuration
├── frontend/               # React + Vite frontend workspace
│   ├── public/             # PWA assets, manifest.json, sw.js
│   ├── src/                # React pages, components, & custom hooks
│   ├── package.json        # NPM packages & build scripts
│   └── vite.config.js      # Vite dev server configuration
├── .gitignore              # Root Git ignore rules
└── README.md               # Project documentation
```

---

## ⚙️ Local Setup Instructions

### 1. Prerequisites
* **Java Development Kit (JDK)**: v17 or higher
* **Node.js**: v18 or higher (with npm)
* **MySQL Database**: v8.0 or higher

---

### 2. Backend Setup (Spring Boot)

1. **Configure Database**:
   Create a schema named `aquatrack` in your MySQL database:
   ```sql
   CREATE DATABASE aquatrack;
   ```
2. **Setup Local Secrets File**:
   Create a file `src/main/resources/application-secrets.properties` (git-ignored) for private keys:
   ```properties
   SPRING_MAIL_PASSWORD=your_gmail_app_password
   GEMINI_API_KEY=your_google_gemini_api_key
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```
3. **Run Backend**:
   Run using Maven from the root directory:
   ```bash
   ./mvnw spring-boot:run
   ```
   *The server starts on port `8080`.*

---

### 3. Frontend Setup (React + Vite)

1. **Install Dependencies**:
   Navigate to the `frontend` folder and install NPM packages:
   ```bash
   cd frontend
   npm install
   ```
2. **Launch Dev Server**:
   Start the Vite local development server:
   ```bash
   npm run dev
   ```
   *The client will be running at `http://localhost:5173`.*

---

## 🔒 Security Architecture
* Stateless JWT-based authentication protocol.
* Secure local credentials management via git-ignored `application-secrets.properties`.
* Role-Based Access Control (RBAC): `ROLE_SUPER_ADMIN`, `ROLE_COMMUNITY_ADMIN`, and `ROLE_RESIDENT`.
* Protected API endpoints via Spring Security filter chains.
