# Customer Inquiry Management System

A full-stack customer inquiry management application for staff to
record, search, review, and manage customer inquiries through their
lifecycle.

> **Project status:** Backend implementation and automated backend
> verification are complete. Frontend implementation is the next
> development stage.

## Table of Contents

-   [Overview](#overview)
-   [Core Features](#core-features)
-   [Technology Stack](#technology-stack)
-   [Project Structure](#project-structure)
-   [Prerequisites](#prerequisites)
-   [Backend Setup](#backend-setup)
-   [Environment Configuration](#environment-configuration)
-   [Database Environments and
    Safety](#database-environments-and-safety)
-   [Database Migrations and Initial
    Admin](#database-migrations-and-initial-admin)
-   [Running the Backend](#running-the-backend)
-   [Testing](#testing)
-   [API Documentation](#api-documentation)
-   [Roles and Permissions](#roles-and-permissions)
-   [Inquiry Lifecycle](#inquiry-lifecycle)
-   [Security Notes](#security-notes)
-   [Further Documentation](#further-documentation)

## Overview

The system provides a shared workspace for staff to manage customer
inquiries. Authorized employees can create inquiries, search and filter
existing records, view inquiry details, and update inquiry statuses.
Administrators have additional staff-management and inquiry soft-delete
permissions.

The backend exposes a REST API and stores application data in
PostgreSQL.

## Core Features

### Authentication and sessions

-   Login using seeded or administrator-created accounts.
-   JWT access token stored in an HttpOnly cookie.
-   Refresh token stored in an HttpOnly cookie and rotated when
    refreshed.
-   Logout and session revocation.
-   Password change flow.
-   Temporary passwords for newly created or reset staff accounts, with
    a required password change.

### Inquiry management

-   Create and view customer inquiries.
-   Search and filter inquiries.
-   Paginated inquiry listing.
-   Duplicate inquiry detection based on normalized contact information.
-   Explicit confirmation before creating a detected duplicate.
-   Inquiry status history.
-   Optimistic concurrency using an inquiry version number.
-   Administrator-only soft deletion.

### Staff management

-   Administrator-only staff listing and search.
-   Create and update staff accounts.
-   Activate and deactivate staff accounts.
-   Reset staff passwords.
-   Revoke sessions when staff are deactivated or passwords are reset.

## Technology Stack

### Backend

-   Node.js
-   Express
-   TypeScript
-   PostgreSQL
-   `pg` PostgreSQL client
-   Zod validation
-   JSON Web Tokens
-   bcrypt
-   Vitest
-   Supertest
-   Swagger UI

### Frontend

The planned frontend stack is:

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS

Frontend implementation is not yet included in the current completed
backend scope.

## Project Structure

Current repository structure:

``` text
customer-inquiry-management-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   ├── migrations/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── TESTING.md
└── README.md
```

The frontend directory will be added during the frontend implementation
stage. The exact migration directory name should match the directory
configured in the backend migration runner.

## Prerequisites

Install the following before running the backend:

-   Node.js (a current LTS release is recommended)
-   npm
-   PostgreSQL database access (the current project uses Neon)
-   Git

## Backend Setup

Open a terminal in the repository root and enter the backend directory:

``` powershell
cd backend
```

Install dependencies:

``` powershell
npm install
```

## Environment Configuration

Create a `.env` file inside `backend/` using `.env.example` as a
reference.

The backend needs these environment variables:

``` env
PORT=5000
FRONTEND_ORIGIN=http://localhost:3000

DATABASE_URL="YOUR_PRODUCTION_DATABASE_CONNECTION_STRING"
DATABASE_URL_TEST="YOUR_TEST_DATABASE_CONNECTION_STRING"

INITIAL_ADMIN_NAME="System Administrator"
INITIAL_ADMIN_EMAIL="admin@example.com"
INITIAL_ADMIN_PASSWORD="REPLACE_WITH_A_STRONG_PASSWORD"

JWT_ACCESS_SECRET="REPLACE_WITH_A_RANDOM_SECRET_OF_AT_LEAST_32_BYTES"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
```

Use the exact variable names expected by the backend configuration. Do
not commit `.env` or share database connection strings, passwords, or
JWT secrets. Keep `.env.example` populated with placeholders only.

## Database Environments and Safety

The backend selects the PostgreSQL connection based on `NODE_ENV` in
`src/config/database.ts`.

  Situation                                            Database connection
  ---------------------------------------------------- ---------------------------------------------------
  Normal `npm run dev` when `NODE_ENV` is not `test`   `DATABASE_URL`
  `npm run dev` with `NODE_ENV=test`                   `DATABASE_URL_TEST`
  `npm test`                                           `DATABASE_URL_TEST` (Vitest sets `NODE_ENV=test`)

In this project:

-   `DATABASE_URL` points to the original production Neon branch.
-   `DATABASE_URL_TEST` points to the separate development/test Neon
    branch.

### Start the backend against the test database

From the `backend/` directory in PowerShell:

``` powershell
$env:NODE_ENV = "test"
npm run dev
```

Use this mode for manual API testing and test data.

When finished, stop the server with `Ctrl + C`, then remove the
environment override:

``` powershell
Remove-Item Env:NODE_ENV
```

### Return to the normal production database

After removing the test environment variable, start the backend
normally:

``` powershell
npm run dev
```

When `NODE_ENV` is not `test`, the backend selects `DATABASE_URL`, which
points to the production Neon branch.

**Important:** Switching connection strings does not copy or synchronize
data between Neon branches. Use the test branch for manual create,
update, and delete testing. Avoid destructive testing against
production.

## Database Migrations and Initial Admin

Use the migration and seed scripts configured in `backend/package.json`.

Run database migrations:

``` powershell
npm run db:migrate
```

Seed the initial administrator if the database setup requires it:

``` powershell
npm run db:seed:admin
```

Run these commands only after confirming which database is selected. Do
not run migrations or seed commands against production casually. Follow
the project's migration process and verify the active database first.

## Running the Backend

From `backend/`, start the API against the test database while
developing:

``` powershell
$env:NODE_ENV = "test"
npm run dev
```

The API runs at:

``` text
http://localhost:5000
```

Health endpoint:

``` text
http://localhost:5000/api/health
```

Stop the server with `Ctrl + C`.

To return to normal mode, run `Remove-Item Env:NODE_ENV` and then
`npm run dev`. In the current configuration, normal mode uses the
production database connection.

## Testing

Run all backend automated tests:

``` powershell
npm test
```

Run TypeScript type checking:

``` powershell
npm run typecheck
```

Build the backend:

``` powershell
npm run build
```

Run the complete verification sequence:

``` powershell
npm run typecheck
if ($LASTEXITCODE -eq 0) {
    npm run build
}
if ($LASTEXITCODE -eq 0) {
    npm test
}
```

The backend verification completed on 23 November 2026:

-   TypeScript type checking passed.
-   Production build passed.
-   12 test files passed.
-   86 automated tests passed.
-   0 failed tests.

For test coverage, test commands, manual API testing, and the database
safety procedure, see [`backend/TESTING.md`](backend/TESTING.md).

## Backend Testing Documentation

See **[backend/TESTING.md](backend/TESTING.md)** for the detailed backend testing guide, including test coverage, commands, Swagger testing, and safe switching between the test and production databases.

## API Documentation

When the backend is running, open Swagger UI:

``` text
http://localhost:5000/api-docs
```

Swagger provides interactive documentation for the available API
endpoints. Authenticate using a suitable account from the database
connected to the running backend.

## Roles and Permissions

### ADMIN

-   View and manage staff accounts.
-   Create, update, activate, deactivate, and reset staff accounts.
-   View, create, search, and update inquiries.
-   Soft-delete inquiries.

### STAFF

-   View, create, search, and update inquiries.
-   Cannot access staff-management endpoints.
-   Cannot soft-delete inquiries.

Both roles work in a shared inquiry workspace and can view the inquiries
available to the organization.

## Inquiry Lifecycle

Supported inquiry statuses:

-   `NEW`
-   `IN_PROGRESS`
-   `RESOLVED`

Supported transitions:

  Current status   Next status     Allowed
  ---------------- --------------- --------------
  `NEW`            `IN_PROGRESS`   Yes
  `NEW`            `RESOLVED`      Yes
  `IN_PROGRESS`    `RESOLVED`      Yes
  `IN_PROGRESS`    `NEW`           No
  `RESOLVED`       `IN_PROGRESS`   Yes (reopen)
  `RESOLVED`       `NEW`           No

## Security Notes

-   Passwords are hashed using bcrypt.
-   Access and refresh tokens are stored in HttpOnly cookies.
-   Refresh tokens are rotated and stored as hashes in the database.
-   Protected endpoints require authentication.
-   Staff-management and inquiry deletion operations enforce
    administrator authorization.
-   Request origin checks protect mutating browser requests.
-   Environment secrets must remain outside source control.

## Deployment to Vercel and Render

The frontend and API can be deployed separately. Configure the Vercel
project with `frontend` as its **Root Directory** and use the default
Next.js install and build settings. Set this environment variable in
Vercel for Production (and Preview only if you also configure the API to
trust that preview origin):

```text
NEXT_PUBLIC_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
```

Create a Render **Web Service** from this repository with `backend` as
its **Root Directory**, build command `npm ci && npm run build`, and
start command `npm start`. Configure these environment variables on
Render:

```text
FRONTEND_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app
DATABASE_URL=YOUR_PRODUCTION_POSTGRES_CONNECTION_STRING
JWT_ACCESS_SECRET=YOUR_LONG_RANDOM_SECRET
INITIAL_ADMIN_NAME=System Administrator
INITIAL_ADMIN_EMAIL=YOUR_ADMIN_EMAIL
INITIAL_ADMIN_PASSWORD=YOUR_STRONG_INITIAL_PASSWORD
```

Render supplies `PORT`. Use the exact frontend origin in
`FRONTEND_ORIGIN` (scheme and host, without a trailing slash). The
production login cookies use `SameSite=None; Secure` so browsers can send
them from a Vercel frontend to a Render API. Keep the Vercel and Render
services on HTTPS, and update `FRONTEND_ORIGIN` if the production
frontend domain changes. Run `npm run db:migrate` from the backend
directory against the production `DATABASE_URL` before the first
deployment that serves traffic; create the initial administrator with
`npm run db:seed:admin` if the database does not already have one.

After deployment, confirm `https://YOUR-RENDER-SERVICE.onrender.com/api/health`
returns successfully, then test login and a protected page in the
deployed frontend. Some browsers or privacy settings block third-party
cookies regardless of `SameSite`; if that affects your users, use
frontend and API custom domains under the same site or proxy API requests
through the frontend domain.

## Further Documentation

-   [`backend/TESTING.md`](backend/TESTING.md) --- backend test
    coverage, test commands, manual testing, and database switching
    instructions.
