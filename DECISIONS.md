# Design Decisions – Customer Inquiry Management System

## 1. Assumptions

- The application is an internal workspace used by customer service employees.
- All authenticated ADMIN and STAFF users can view and manage inquiries.
- Only ADMIN users can manage staff accounts and soft-delete inquiries.
- A seeded ADMIN account is provided instead of public registration.
- Inquiry statuses are NEW, IN_PROGRESS, and RESOLVED.
- Resolved inquiries can be reopened as IN_PROGRESS.
- Duplicate contact information is treated as a warning rather than an automatic rejection because one customer may have multiple inquiries.

## 2. Key Design Decisions

### 2.1 Authentication and Authorization

The backend enforces authentication and role-based authorization rather than relying only on frontend page restrictions.

Access tokens are stored in HttpOnly cookies, while refresh tokens are rotated and stored as hashes in the database. Passwords are hashed using bcrypt.

ADMIN and STAFF roles have different permissions. This protects administrative operations even when users attempt to access API endpoints directly.

### 2.2 Inquiry Management and Data Integrity

Inquiries use a structured status lifecycle with controlled transitions.

Potential duplicate inquiries are identified using normalized contact information. Users receive a warning and can confirm creating a separate inquiry when appropriate.

Inquiry records are soft-deleted rather than permanently removed. Audit information records who created, updated, resolved, or deleted an inquiry.

Optimistic concurrency control uses a version field to prevent outdated updates from silently overwriting newer changes. Conflicting updates return a 409 response.

### 2.3 Frontend and Backend Separation

The frontend uses Next.js, React, TypeScript, Tailwind CSS, Zustand, Axios, React Hook Form, and Zod.

The backend uses Node.js, Express, PostgreSQL, and parameterized database queries through the service layer.

Frontend validation provides immediate feedback, while the backend independently validates incoming data and enforces business rules. This prevents frontend validation from being treated as a security boundary.

## 3. Trade-offs

Real-time synchronization between browser tabs was not implemented because it was not required for the assessment.

Instead, optimistic concurrency control prevents stale updates from silently overwriting newer database changes. A conflicting request receives a 409 response, allowing the user to refresh and retry.

This approach keeps the implementation simpler without sacrificing important data integrity.

## 4. Testing Strategy and Limitations

The backend has 86 automated tests covering API behavior, authentication, authorization, validation, and business rules.

The frontend has 6 automated tests across 3 test files:

- Authentication store behavior: 1 test.
- Inquiry schema validation: 2 tests.
- Inquiry form interactions: 3 tests.

Frontend component tests use Vitest and React Testing Library. API calls are mocked to test form validation, prevent invalid submissions, and verify successful submission behavior.

The frontend component tests do not independently verify actual database persistence or the complete frontend-to-backend integration. These workflows are also checked through manual application testing.

## 5. Use of AI and External Resources

AI tools were used to assist with implementation planning, code explanations, test development, debugging, and documentation.

AI-generated suggestions were reviewed and adapted to the application's requirements rather than accepted automatically. The final implementation and design decisions were evaluated against the assessment requirements.

## 6. Future Improvements

- Add real-time inquiry updates between multiple browser sessions.
- Expand frontend integration and end-to-end automated testing.
- Improve monitoring, logging, and operational observability.
- Add more comprehensive accessibility testing.
