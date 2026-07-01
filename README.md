# IntervAI - Enterprise AI Mock Interview Platform

Welcome to **IntervAI**, an enterprise-grade AI-powered mock interview platform designed to help candidates prepare for interviews with realistic AI-driven interactions.

## 🚀 Getting Started

You can run the application either using **Docker** (recommended for all-in-one setup) or by starting the backend and frontend services **locally**.

---

### Option A: Using Docker (Recommended)

Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running on your system.

1. Navigate to the root directory:
   ```bash
   cd IntervAI
   ```
2. Start the entire stack (MongoDB, Node.js Backend, React Frontend):
   ```bash
   docker compose up --build
   ```
3. Open your browser:
   * **Frontend Client:** [http://localhost:5173](http://localhost:5173)
   * **Backend API:** [http://localhost:5000](http://localhost:5000)

---

### Option B: Local Setup (Individual Services)

To run the components individually, ensure you have [Node.js](https://nodejs.org/) installed and a local MongoDB instance running on `mongodb://localhost:27017`.

#### 1. Setup Backend
Open a terminal window and run:
```bash
cd IntervAI
npm install
npm run dev
```
*Runs the Express server with Nodemon on [http://localhost:5000](http://localhost:5000).*

#### 2. Setup Frontend
Open a separate terminal window and run:
```bash
cd IntervAI/frontend
npm install
npm run dev
```
*Runs the React + Vite development server on [http://localhost:5173](http://localhost:5173).*

---

## 📧 Email Verification in Local Development

Since local setups do not send real emails by default:
1. When you register a new account or request a verification link, the backend does **not** send an actual email.
2. Instead, look at your **backend terminal logs**.
3. Under the `--- LOCAL DEV EMAIL DISPATCH ---` section, you will see the generated verification link:
   ```text
   http://localhost:5173/verify-email?token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Copy and paste that link into your browser to verify your account.

> **Warning:** Do not copy the token directly from your MongoDB database (e.g. MongoDB Compass). The database stores a secure, one-way hash of the token. Pasting the database hash into the URL will cause verification to fail.

---

## 🛠️ Project Structure

* **`IntervAI/`** - Backend code, configurations, database models, and API logic.
* **`IntervAI/frontend/`** - React single-page application built with Vite and Tailwind CSS.
