# 💧 AquaTrack — Smart Water Management & Billing Platform

AquaTrack is a premium, full-stack smart water management, analytics, and automated billing platform designed for residential societies, apartments, and colonies. It empowers residents to monitor consumption, view and print watermarked invoices, resolve leaks, and enables admins to distribute bulk purchase costs, manage residents, approve verification documents, and track system anomalies.

---

## 🚀 Key Features

### 👤 Household Resident Dashboard
* **Real-time Consumption**: Interactive charts showing daily and monthly consumption history.
* **Smart Water Conservation**: Interactive faucet visualization demonstrating water saving tips.
* **Watermarked Invoices**: Detailed, professional-grade billing invoices with official seals, prints, and downloads.
* **Notification Panel**: Real-time alerts for leaks, overconsumption, new bills, and verification updates.
* **Forgot Password Flow**: Secure recovery pipeline without external dependency.

### 🏢 Community Admin Dashboard
* **Resident Directory**: Smart search and filtering of all apartments and households.
* **Automated Billing Engine**: Generation of monthly billing cycles with consumption-based distribution.
* **Anomalies & Leak Detection**: Intelligent flagging of abnormal usage spikes.
* **Invitation System**: Invite new residents securely and approve uploaded verification documents.
* **Tariff Management**: Customizable tiered billing plans based on usage slabs.

### 🤖 AI Household Assistant & Smart Chatbot
* **AquaTrack AI Assistant**: Intelligent RAG & Google Gemini 1.5 Flash powered assistant for instant household query resolution.
* **Natural Multi-lingual Querying**: Responds to bill calculations, consumption stats, tariff rates, and support ticket statuses in Hindi, English, and regional languages.
* **Smart Actions**: One-click deep-link action buttons for payments, invoice downloads, usage analysis, and extra water purchases.

### 🛠️ Role-Differentiated Support & Resolution Center
* **Tiered Support Flow**: Customized ticketing dashboard tailored for Super Admins, Community Admins, and Household Residents.
* **Dynamic Role Attribution**: Notifications explicitly state whether a response came from a *Platform Super Admin* or *Community Manager*.
* **Automated Escalations**: Community Admins can escalate complex infrastructure tickets directly to Super Admins.
* **Automatic Ticket Cleanup**: Automated daily cleanup of tickets resolved over 15 days.

### 👑 Super Admin Panel
* **Global System Control**: Manage multiple colonies, buildings, and community block networks.
* **Verification Pipelines**: Final approval of onboarding community administrators and blocks.
* **High-Contrast Security Audit Logs**: Real-time monitoring of system events with light & dark theme accessibility.

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
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons | Premium glassmorphic responsive UI |
| **Backend** | Spring Boot, Spring Security, JWT | RESTful API and core business engine |
| **Database** | MySQL | Persistent relational database storage |
| **AI Integration** | Google Gemini 1.5 Flash API & RAG Engine | Intelligent household water assistant |
| **Payment Gateway** | Razorpay | Online UPI, Credit/Debit card payments |
| **Build Tools** | Maven, NPM | Package and dependency managers |

---

## 📦 Project Structure

```
aquatrack/
├── src/                    # Spring Boot backend source code
├── pom.xml                 # Maven dependencies & configuration
├── frontend/               # React + Vite frontend workspace
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
