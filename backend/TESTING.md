# Backend Testing Guide

## 1. Purpose

This document explains how to run the Customer Inquiry Management System
backend tests, which areas are covered, and which PostgreSQL database is
used in each environment.

The backend uses Node.js, Express, TypeScript, PostgreSQL (Neon),
Vitest, and Supertest.

## 2. Database environments

The backend selects its database in `src/config/database.ts` based on
`NODE_ENV`.

  Command / environment                         Database connection
  --------------------------------------------- --------------------------------------------------------
  `npm run dev` when `NODE_ENV` is not `test`   `DATABASE_URL`
  `npm run dev` when `NODE_ENV=test`            `DATABASE_URL_TEST`
  `npm test`                                    `DATABASE_URL_TEST` (Vitest runs with `NODE_ENV=test`)

### Important safety rule

The normal development command, `npm run dev`, uses `DATABASE_URL` when
`NODE_ENV` is not set to `test`. In this project, `DATABASE_URL` points
to the production Neon branch.

Do not use the normal development command for test data or destructive
manual testing.

### Run the API against the test database

From the `backend` directory, in PowerShell:

``` powershell
$env:NODE_ENV = "test"
npm run dev
```

Stop the server with `Ctrl + C`. Then remove the environment override:

``` powershell
Remove-Item Env:NODE_ENV
```

After removing it, a normal `npm run dev` uses `DATABASE_URL` again.

### Environment variables

The backend `.env` file should contain both connection variables:

``` env
DATABASE_URL="YOUR_PRODUCTION_DATABASE_CONNECTION_STRING"
DATABASE_URL_TEST="YOUR_TEST_DATABASE_CONNECTION_STRING"
```

Keep real connection strings and credentials private. Do not commit
`.env` to Git. Use `.env.example` with placeholders instead.

The test database must be separate from production. Never point
`DATABASE_URL_TEST` at the production database.

## 3. Test commands

Run these commands from the `backend` directory.

### Run all automated tests

``` powershell
npm test
```

### Run one test file

``` powershell
npx vitest run tests/trusted-origin.middleware.test.ts
```

Replace the filename with the test file you want to run.

### Run TypeScript type checking

``` powershell
npm run typecheck
```

### Create the production build

``` powershell
npm run build
```

### Run the complete verification sequence

``` powershell
npm run typecheck
if ($LASTEXITCODE -eq 0) {
    npm run build
}
if ($LASTEXITCODE -eq 0) {
    npm test
}
```

The sequence stops if type checking or the build fails.

## 4. What is tested?

The current backend suite contains **86 automated tests across 12 test
files**.

  ------------------------------------------------------------------------------------------
  Test file                                                 Tests Coverage
  ------------------------------------------- ------------------- --------------------------
  `inquiry.integration.test.ts`                                27 Inquiry API access for
                                                                  ADMIN and STAFF, creation,
                                                                  duplicate detection and
                                                                  confirmation, pagination,
                                                                  search, status filtering,
                                                                  detail/history, status
                                                                  transitions, stale-version
                                                                  conflicts, validation,
                                                                  missing records,
                                                                  role-based deletion and
                                                                  soft deletion

  `user.integration.test.ts`                                   17 Admin-only staff
                                                                  management, staff listing
                                                                  and search, staff
                                                                  creation,
                                                                  activation/deactivation,
                                                                  password reset and session
                                                                  revocation

  `auth.password.integration.test.ts`                           7 Password changes,
                                                                  incorrect current
                                                                  password, confirmation
                                                                  mismatch, minimum length,
                                                                  same-password rejection,
                                                                  session handling and
                                                                  unauthenticated requests

  `auth.session.integration.test.ts`                            5 Refresh-token rotation,
                                                                  old-token reuse rejection,
                                                                  logout, and
                                                                  revoked-session
                                                                  access/refresh rejection

  `auth.integration.test.ts`                                    7 Authentication API
                                                                  behavior

  `inquiry.concurrency.integration.test.ts`                     1 Prevents simultaneous
                                                                  duplicate inquiry creation

  `database.test.ts`                                            1 Confirms connection to the
                                                                  separate test database

  `role.middleware.test.ts`                                     5 Role-based access control

  `trusted-origin.middleware.test.ts`                           5 Trusted frontend origin,
                                                                  untrusted origin/referer
                                                                  rejection, safe GET
                                                                  requests, and requests
                                                                  without Origin/Referer
                                                                  headers

  `auth.middleware.test.ts`                                     3 Authentication middleware
                                                                  behavior

  `app.test.ts`                                                 2 Application-level behavior

  `inquiry.validator.test.ts`                                   6 Inquiry input validation

  **Total**                                                **86** 
  ------------------------------------------------------------------------------------------

## 5. Main scenarios covered

### Authentication and sessions

-   Authenticated and unauthenticated API access
-   Access to protected routes
-   Refresh-token rotation
-   Reuse of an old refresh token is rejected
-   Logout revokes the session
-   Revoked sessions cannot continue accessing protected routes
-   Password changes validate the current password and confirmation
-   Other sessions are revoked after a password change while the current
    session remains active

### Staff management and authorization

-   ADMIN can manage staff accounts
-   STAFF cannot access ADMIN-only staff management
-   Staff can be activated and deactivated
-   Password resets require a new temporary password
-   Existing sessions are revoked when a staff account is deactivated or
    its password is reset

### Inquiry management

-   ADMIN and STAFF can create and view inquiries
-   Invalid inquiry data is rejected
-   Duplicate active inquiries are detected
-   Duplicate creation requires explicit confirmation
-   Inquiry listing supports pagination, search, and status filtering
-   Inquiry details include status history
-   Allowed status transitions and reopening are supported
-   Invalid transitions are rejected
-   Stale inquiry versions return a conflict rather than silently
    overwriting newer data
-   STAFF cannot delete inquiries
-   ADMIN can soft-delete inquiries
-   Deleted inquiries are not returned as active records
-   Concurrent duplicate submissions are handled safely

### Request security

-   Requests from the configured frontend origin are allowed
-   Untrusted origins and referers are rejected for mutating requests
-   Safe GET requests are allowed
-   Requests without Origin or Referer are allowed for non-browser
    clients such as Postman and automated tests

## 6. Manual API testing with Swagger

The API documentation is available at:

``` text
http://localhost:5000/api-docs
```

To test safely, first start the backend against the test database:

``` powershell
$env:NODE_ENV = "test"
npm run dev
```

Then:

1.  Open Swagger UI.
2.  Use the login endpoint with a test account from the test database.
3.  Use authenticated endpoints to test the API.
4.  Try invalid input and verify that the API rejects it.
5.  Try an endpoint without authentication and verify that access is
    denied.
6.  Test role restrictions using appropriate ADMIN and STAFF test
    accounts.

Swagger's browser requests use the API origin. For frontend-origin
testing, use the configured frontend origin (`http://localhost:3000`)
when the frontend is running.

Do not use production accounts or production data for destructive manual
tests.

## 7. Test result recorded

On **23 November 2026**, the backend verification completed
successfully:

-   TypeScript type checking: passed
-   Production TypeScript build: passed
-   Test files: 12 passed
-   Automated tests: 86 passed
-   Failed tests: 0

PostgreSQL emitted an SSL-mode compatibility warning during the test
run. It did not cause the build or tests to fail.

## 8. Before adding new tests

When adding backend functionality:

1.  Add tests for successful behavior.
2.  Add tests for invalid input and missing records.
3.  Add tests for unauthenticated access and role restrictions where
    relevant.
4.  Add tests for conflicts or concurrent updates where relevant.
5.  Run the focused test file.
6.  Run `npm run typecheck`, `npm run build`, and `npm test`.
7.  Confirm that all tests use the separate test database.

## 9. Important notes

-   Automated tests are not a substitute for manual end-to-end testing
    of the complete application.
-   The stale-version test verifies conflict handling; it does not
    implement real-time synchronization between browser tabs.
-   The trusted-origin middleware allows requests without Origin or
    Referer for non-browser clients. This is intentional for tools such
    as Postman and automated tests; it should not be described as a
    CSRF-token implementation.
-   Keep test credentials and database connection strings out of source
    control.

## 10. Switching back to the normal production database

When manual testing is finished, stop the backend server before changing
the environment:

1.  In the terminal running the server, press `Ctrl + C`.
2.  Remove the test environment variable in the same PowerShell
    terminal:

``` powershell
Remove-Item Env:NODE_ENV
```

3.  Start the backend normally:

``` powershell
npm run dev
```

When `NODE_ENV` is not set to `test`, `src/config/database.ts` selects
`DATABASE_URL`. In this project, that is the original production Neon
branch.

### Quick reference

  ----------------------------------------------------------------------------
  Action                  PowerShell command           Database
  ----------------------- ---------------------------- -----------------------
  Start backend for safe  `$env:NODE_ENV = "test"`     `DATABASE_URL_TEST`
  manual testing          then `npm run dev`           

  Stop backend            `Ctrl + C`                   Server stops

  Return terminal to      `Remove-Item Env:NODE_ENV`   No server running
  normal mode                                          

  Start backend normally  `npm run dev`                `DATABASE_URL`

  Run automated tests     `npm test`                   `DATABASE_URL_TEST`
  ----------------------------------------------------------------------------

### Important reminders

-   Database switching only changes which connection string the backend
    uses. It does not copy or synchronize records between Neon branches.
-   Removing `NODE_ENV` affects only the current PowerShell session. If
    you open a new terminal, check that `NODE_ENV` has not been set in
    your PowerShell profile or elsewhere.
-   `npm test` uses the test environment automatically through Vitest;
    you do not need to set `NODE_ENV` manually for the test command.
-   Use the test database for manual create, update, and delete testing.
    Avoid destructive testing against production.
