# AquaTrack Deployment Guide — Host Live for Free

This guide provides a step-by-step walkthrough to deploy the AquaTrack application online for live access.

---

## 🏗️ Deployment Architecture

| Tier | Provider Recommendation | Alternative Options | Free Tier Cost |
| :--- | :--- | :--- | :--- |
| **Frontend (React + Vite PWA)** | **Vercel** | Netlify, Render Static | 100% Free |
| **Backend (Spring Boot)** | **Render** | Railway, Koyeb | Free (750 hrs/mo) |
| **Database (MySQL 8.0)** | **Aiven MySQL** | Railway MySQL, PlanetScale | Free (5GB Storage) |

---

## 📌 Phase 1: Deploy MySQL Database (Aiven / Railway)

### Option A: Aiven for MySQL (Recommended — Free 5GB Cloud MySQL)
1. Sign up at [aiven.io](https://aiven.io/).
2. Create a new service -> **MySQL** -> Select **Free Tier**.
3. Once provisioned, note down your connection credentials:
   - `Host` (e.g. `mysql-aquatrack-xyz.aivencloud.com`)
   - `Port` (e.g. `12345`)
   - `User` (e.g. `avnadmin`)
   - `Password`
   - `Database Name` (`aquatrack`)

---

## 📌 Phase 2: Deploy Spring Boot Backend (Render.com)

1. Push your project to GitHub (if not already done).
2. Sign up / Log in to [render.com](https://render.com/).
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository (`aquatrack`).
5. Configure the service settings:
   - **Name**: `aquatrack-backend`
   - **Environment**: `Java` (or Docker using Dockerfile)
   - **Build Command**: `./mvnw clean package -DskipTests`
   - **Start Command**: `java -jar target/aquatrack-0.0.1-SNAPSHOT.jar`
6. Add **Environment Variables** in Render Dashboard:
   - `SPRING_DATASOURCE_URL` = `jdbc:mysql://<AIVEN_HOST>:<AIVEN_PORT>/aquatrack?useSSL=true`
   - `SPRING_DATASOURCE_USERNAME` = `avnadmin`
   - `SPRING_DATASOURCE_PASSWORD` = `<YOUR_AIVEN_PASSWORD>`
   - `JWT_SECRET` = `<YOUR_SECURE_JWT_SECRET>`
   - `RAZORPAY_KEY_ID` = `<YOUR_RAZORPAY_KEY>`
   - `RAZORPAY_KEY_SECRET` = `<YOUR_RAZORPAY_SECRET>`
   - `SPRING_MAIL_USERNAME` = `<YOUR_GMAIL>`
   - `SPRING_MAIL_PASSWORD` = `<YOUR_GMAIL_APP_PASSWORD>`
7. Click **Deploy Web Service**. Render will build and launch your API on `https://aquatrack-backend.onrender.com`.

---

## 📌 Phase 3: Deploy React Frontend (Vercel)

1. Sign up / Log in to [vercel.com](https://vercel.com/) with GitHub.
2. Click **Add New** -> **Project**.
3. Import your GitHub repository (`aquatrack`).
4. Select **Root Directory**: `frontend`.
5. Framework Preset: **Vite**.
6. Add **Environment Variable**:
   - `VITE_API_BASE_URL` = `https://aquatrack-backend.onrender.com/api`
7. Click **Deploy**. Vercel will build and assign your live URL: `https://aquatrack.vercel.app`.
