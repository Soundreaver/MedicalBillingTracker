# Medical Billing Tracker - Production Deployment Guide

This guide provides step-by-step instructions to deploy the Medical Billing Tracker application using Supabase, Vercel (for the frontend), and Render (for the backend).

## 🚀 Architecture Overview

-   **Frontend**: React + Vite, deployed on **Vercel**
-   **Backend**: Express.js + Node.js, deployed on **Render**
-   **Database**: PostgreSQL, hosted on **Supabase**
-   **Authentication**: Secure, session-based authentication

## 📋 Prerequisites

-   A **Supabase** account
-   A **Vercel** account
-   A **Render** account
-   A **GitHub** account with your project pushed to a repository

---

## 🗄️ Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project
1.  Go to [Supabase](https://supabase.com) and create a new project.
2.  Securely save your **Database Password**.
3.  Choose a region close to your users.

### 1.2 Run the Database Migration
1.  In your Supabase project, navigate to the **SQL Editor**.
2.  Open the `supabase-migration.sql` file from your project.
3.  Copy its entire contents, paste it into the SQL Editor, and click **"Run"**.
    *   This will create all necessary tables, indexes, views, and sample data, including a default admin user (`admin` / `password123`).

---

## 🔧 Step 2: Deploy Backend to Render

### 2.1 Create a New Web Service
1.  Go to your [Render Dashboard](https://dashboard.render.com) and click **New > Web Service**.
2.  Connect your GitHub repository.

### 2.2 Configure the Service
-   **Name**: `medical-billing-api` (or similar)
-   **Region**: Choose a region close to your Supabase database.
-   **Branch**: `main`
-   **Root Directory**: `MedicalBillingTracker`
-   **Runtime**: `Node`
-   **Build Command**: `npm install && npm run build`
-   **Start Command**: `npm start`

### 2.3 Configure Environment Variables
Go to the **Environment** tab and add the following variables.

#### How to Get Your Production Keys:

-   **`DATABASE_URL`**:
    -   In Supabase: **Settings > Database > Connection string > URI**.
    -   Remember to replace `[YOUR-PASSWORD]` with your actual database password.

-   **`SUPABASE_URL`** & **`SUPABASE_ANON_KEY`**:
    -   In Supabase: **Settings > API**.
    -   `SUPABASE_URL` is the **Project URL**.
    -   `SUPABASE_ANON_KEY` is the `anon` `public` key under **Project API Keys**.

-   **`SUPABASE_SERVICE_ROLE_KEY`**:
    -   In Supabase: **Settings > API > Project API Keys**.
    -   This is the `service_role` `secret` key. **This is highly sensitive.**

-   **`SESSION_SECRET`**:
    -   Generate a new, secure secret for production by running `npm run generate:jwt` locally and copying the output.

-   **`NODE_ENV`**:
    -   Set this to `production`.

-   **`FRONTEND_URL`**:
    -   You will get this URL after deploying your frontend to Vercel in the next step. You can leave it blank for now and update it later.

### 2.4 Deploy
Click **Create Web Service**. After the initial deployment, copy your backend URL (e.g., `https://medical-billing-api.onrender.com`).

---

## 🌐 Step 3: Deploy Frontend to Vercel

### 3.1 Create a New Project
1.  Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... > Project**.
2.  Import your GitHub repository.

### 3.2 Configure the Project
-   **Framework Preset**: `Vite`
-   **Root Directory**: `MedicalBillingTracker/client`
-   **Build and Output Settings**: Vercel should detect these automatically.

### 3.3 Configure Environment Variables
Go to **Settings > Environment Variables** and add the following:

-   **`VITE_API_URL`**:
    -   Paste the URL of your deployed Render backend (e.g., `https://medical-billing-api.onrender.com`).

### 3.4 Deploy
Click **Deploy**. Once the deployment is complete, you will have your frontend URL (e.g., `https://your-project-name.vercel.app`).

---

## 🔄 Step 4: Final Configuration

### 4.1 Update Backend CORS
1.  Go back to your Render dashboard.
2.  Navigate to your backend service's **Environment** settings.
3.  Update the `FRONTEND_URL` variable with your Vercel deployment URL.
4.  This will trigger a new deployment on Render with the updated CORS settings.

### 4.2 Change Default Admin Password
1.  Log in to your deployed application with the default credentials (`admin` / `password123`).
2.  Navigate to the settings page and change the password immediately.

## ✅ Verification

-   **Frontend**: Visit your Vercel URL and ensure the application loads.
-   **Backend**: Test API endpoints or simply try logging in, which confirms frontend-backend communication.
-   **Functionality**: Test key features like adding a patient or creating an invoice to ensure the database connection is working.

Your Medical Billing Tracker is now live! 🎉
