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

### 👑 Super Admin Panel
* **Global System Control**: Manage multiple colonies, buildings, and community block networks.
* **Verification Pipelines**: Final approval of onboarding community administrators and blocks.

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons | Premium glassmorphic responsive UI |
| **Backend** | Spring Boot, Spring Security, JWT (JSON Web Tokens) | RESTful API and core business engine |
| **Database** | MySQL | Persistent relational database storage |
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
2. **Update Configurations**:
   Edit `src/main/resources/application.properties` with your database credentials:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/aquatrack?useSSL=false&serverTimezone=UTC
   spring.datasource.username=YOUR_MYSQL_USERNAME
   spring.datasource.password=YOUR_MYSQL_PASSWORD
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
* Role-Based Access Control (RBAC): `ROLE_ADMIN`, `ROLE_COMMUNITY_ADMIN`, and `ROLE_USER`.
* Protected API endpoints via Spring Security filter chains.
