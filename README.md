# Medical Billing Tracker

This is a full-stack web application for managing medical billing, patients, and inventory. It is built with React, Express, and PostgreSQL.

## Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (v18 or later)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js)
*   A [Supabase](https://supabase.com/) account for the PostgreSQL database.

## Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies for the server and client:**

    ```bash
    npm run setup
    ```

    This will install the dependencies for both the root project and the `client` directory.

## Configuration

1.  **Create a `.env` file in the root of the `MedicalBillingTracker` directory.** You can copy the `.env.example` file as a template:

    ```bash
    cp .env.example .env
    ```

2.  **Set up your Supabase database:**

    *   Create a new project on Supabase.
    *   In your Supabase project, go to **Project Settings** > **Database**.
    *   Under **Connection string**, find your database connection details.

3.  **Update the `.env` file with your Supabase credentials:**

    ```env
    DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
    JWT_SECRET="your-jwt-secret"
    FRONTEND_URL="http://localhost:5173"
    ```

    *   Replace `<user>`, `<password>`, `<host>`, `<port>`, and `<database>` with your Supabase connection details.
    *   Generate a secure JWT secret and replace `"your-jwt-secret"`. You can use the following command to generate a secret:

        ```bash
        npm run generate:jwt
        ```

4.  **Create a `.env.local` file in the `client` directory.**

    ```bash
    cp client/.env.example client/.env.local
    ```

5.  **Update `client/.env.local` with the API URL:**

    ```env
    VITE_API_URL=http://localhost:3001
    ```

## Database Migration and Seeding

1.  **Apply the database schema:**

    ```bash
    npm run db:push
    ```

    This will push the schema defined in `shared/schema.ts` to your Supabase database.

2.  **Seed the database with initial users:**

    The application will automatically seed the database with default users when the server starts in development mode. The default users are:

    *   **Admin:**
        *   Username: `admin`
        *   Password: `admin123`
    *   **Doctor:**
        *   Username: `dr.sharmin`
        *   Password: `doctor123`

## Running the Application

1.  **Start the backend server:**

    ```bash
    npm run dev
    ```

    The server will start on `http://localhost:3001`.

2.  **In a separate terminal, start the frontend development server:**

    ```bash
    cd client
    npm run dev
    ```

    The frontend will be available at `http://localhost:5173`.

You can now open your browser and navigate to `http://localhost:5173` to use the application.
