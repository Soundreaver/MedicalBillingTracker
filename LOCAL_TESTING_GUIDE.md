# Local Testing Guide

This guide will help you test the Medical Billing Tracker locally with Supabase before deploying to production.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account and project

## Step 1: Set up Supabase

### 1.1 Create Supabase Project
1. Go to [Supabase](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization and provide:
   - Project name: `medical-billing-tracker`
   - Database password: (save this securely)
   - Region: Choose closest to your location
4. Wait for the project to be created (2-3 minutes)

### 1.2 Get Database Connection Details
1. In your Supabase project dashboard, go to **Settings > Database**
2. Scroll down to "Connection string" and copy the **URI** format
3. Replace `[YOUR-PASSWORD]` with your actual database password

## Step 2: Run Database Migrations

### 2.1 Execute SQL Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Create a new query and paste the migration SQL from `MIGRATION_SUMMARY.md`
3. Run the query to create all tables and schemas

### 2.2 Verify Tables Created
1. Go to **Table Editor** in Supabase dashboard
2. You should see all tables: users, sessions, patients, medicines, rooms, invoices, etc.

## Step 3: Configure Environment Variables

### 3.1 Understand the Environment Files
-   **`.env` (in the root directory)**: Holds all backend and secret keys. **Never commit this file.**
-   **`client/.env.local`**: Holds frontend-specific keys. It's safe for local development.

### 3.2 Create and Configure your `.env` File
1.  Copy the example file: `cp .env.example .env`
2.  Open the new `.env` file and fill in the values.

#### How to Get Your Keys:

-   **`DATABASE_URL`**:
    -   In your Supabase project, go to **Settings** > **Database**.
    -   Under **Connection string**, copy the `URI`.

-   **`SUPABASE_URL`** & **`SUPABASE_ANON_KEY`**:
    -   Go to **Settings** > **API**.
    -   **Project URL** is your `SUPABASE_URL`.
    -   **Project API Keys** > `anon` `public` key is your `SUPABASE_ANON_KEY`.

-   **`SUPABASE_SERVICE_ROLE_KEY`**:
    -   In **Settings** > **API** > **Project API Keys**, find the `service_role` `secret` key.
    -   Click "Show" to reveal it. **This key is highly sensitive.**

-   **`SESSION_SECRET`**:
    -   This is a random string you create to secure sessions.
    -   Run the following command in your terminal to generate a secure secret:
        ```bash
        npm run generate:jwt
        ```
    -   Copy the generated secret and paste it as the value for `SESSION_SECRET`.

### 3.3 Configure the Frontend Environment
In the `MedicalBillingTracker/client` directory, create a `.env.local` file with the following content:

```bash
# The URL where your backend server is running
VITE_API_URL=http://localhost:3000
```
This tells your frontend where to send API requests during local development.

## Step 4: Install Dependencies

```bash
# Navigate to project root
cd MedicalBillingTracker

# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Go back to root
cd ..
```

## Step 5: Test Database Connection

### 5.1 Verify Connection
Run the database connection test script to ensure your `.env` configuration is correct:

```bash
npm run test:db
```

If the connection is successful, you will see a confirmation message with a list of your database tables. If it fails, the script will provide troubleshooting tips.

## Step 6: Start Development Servers

### 6.1 Start the Backend Server
```bash
# From MedicalBillingTracker root
npm run dev
```

You should see:
```
Server running on localhost:3000
Environment: development
```

### 6.2 Start the Frontend Server (New Terminal)
```bash
# From MedicalBillingTracker root
cd client
npm run dev
```

You should see:
```
Local:   http://localhost:5173/
Network: use --host to expose
```

## Step 7: Test Application Functionality

### 7.1 Access the Application
1. Open your browser and go to `http://localhost:5173`
2. You should see the login page

### 7.2 Create Test User
Since there are no users in the database yet, you'll need to create one manually:

1. In Supabase **SQL Editor**, run:
```sql
INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active)
VALUES (
  'admin',
  'admin@test.com',
  '$2b$10$rGwPzFdpFcjhJhBcGO7tCuOWVfOK6XYX6VwXt4yRhEyFgDXc8jG5K', -- password: 'password123'
  'admin',
  'Test',
  'Admin',
  true
);
```

### 7.3 Test Login
1. Go to `http://localhost:5173`
2. Login with:
   - Username: `admin`
   - Password: `password123`

### 7.4 Test Core Features
1. **Dashboard**: Should load with empty stats
2. **Patients**: Try adding a new patient
3. **Rooms**: Try adding a new room
4. **Medicines**: Try adding medicine inventory
5. **Billing**: Try creating an invoice
6. **Payments**: Try recording a payment

## Step 8: Check API Endpoints

### 8.1 Test API Directly
You can test API endpoints using curl or a tool like Postman:

```bash
# Test health check
curl http://localhost:3000/api/health

# Test getting patients (you'll need to be logged in)
curl http://localhost:3000/api/patients
```

### 8.2 Check Network Tab
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Perform actions in the app
4. Verify API calls are working (200/201 status codes)

## Step 9: Verify Data Persistence

### 9.1 Check Supabase Tables
1. After adding data through the app
2. Go to Supabase **Table Editor**
3. Verify data appears in respective tables

### 9.2 Test Data Relationships
1. Create a patient
2. Create a room
3. Create an invoice for the patient
4. Add invoice items
5. Record a payment
6. Verify all relationships work correctly

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```
Error: connect ECONNREFUSED
```
**Solution**: Check your `DATABASE_URL` in `.env` file

#### 2. CORS Errors
```
Access to fetch at 'http://localhost:3000' from origin 'http://localhost:5173' has been blocked by CORS
```
**Solution**: Verify CORS configuration in `server/index.ts`

#### 3. Module Not Found Errors
```
Cannot resolve module '@shared/schema'
```
**Solution**: Run `npm install` in both root and client directories

#### 4. TypeScript Errors
```
Type errors in components
```
**Solution**: Run `npm run check` to identify and fix type issues

### Debug Mode

Enable detailed logging by setting in your `.env`:
```bash
DEBUG=medical-billing:*
NODE_ENV=development
```

### Database Reset

If you need to reset your database:
1. Go to Supabase **SQL Editor**
2. Run: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
3. Re-run the migration SQL

## Production Readiness Checklist

Before deploying, ensure:

- [ ] All local tests pass
- [ ] TypeScript compilation succeeds (`npm run check`)
- [ ] No console errors in browser
- [ ] All CRUD operations work
- [ ] Authentication flows work
- [ ] Data persists correctly
- [ ] API responses are correct
- [ ] File uploads work (if applicable)
- [ ] Error handling works properly

## Next Steps

Once local testing is complete:
1. Follow the `DEPLOYMENT_GUIDE.md` for production deployment
2. Set up production environment variables
3. Configure production domains and CORS
4. Test the deployed application thoroughly

## Support

If you encounter issues:
1. Check browser console for errors
2. Check server logs for errors
3. Verify environment variables
4. Ensure Supabase project is active
5. Check database connection string format
