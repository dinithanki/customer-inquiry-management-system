# Design Decisions – Customer Inquiry Management System

## 1. Assumptions

- The application is an internal system used by customer service employees.
- ADMIN and STAFF users share access to the inquiry workspace.
- Only ADMIN users can manage staff accounts and soft-delete inquiries.
- An initial ADMIN account is created through database seeding.
- Inquiry statuses are NEW, IN_PROGRESS, and RESOLVED.
- Resolved inquiries can be reopened as IN_PROGRESS.
- Duplicate contact information should generate a warning rather than automatically prevent creation, since one customer may have multiple inquiries.

## 2. Key Design Decisions

### 2.1 Authentication and Authorization

Authentication and authorization are enforced by the backend rather than relying solely on frontend route protection.

Access tokens are stored in HttpOnly cookies, while refresh tokens are rotated and stored as hashes in PostgreSQL. Passwords are hashed using bcrypt.

Role-based authorization separates ADMIN and STAFF permissions, ensuring that administrative operations remain protected even when users attempt to access API endpoints directly.

### 2.2 Inquiry Management and Data Integrity

A controlled status lifecycle prevents invalid inquiry transitions while allowing resolved inquiries to be reopened.

Potential duplicates are identified using normalized contact information. Users can review matching inquiries and explicitly confirm whether they want to create another inquiry.

Soft deletion preserves inquiry records instead of permanently removing them. Audit information tracks important actions and the users responsible for them.

Optimistic concurrency control uses a version field to prevent outdated updates from silently overwriting newer changes. Conflicting updates return HTTP 409.

### 2.3 Frontend and Backend Separation

The frontend uses Next.js, React, TypeScript, Tailwind CSS, Zustand, Axios, React Hook Form, and Zod.

The backend uses Node.js, Express, TypeScript, PostgreSQL, and parameterized SQL queries.

Frontend validation provides immediate feedback to users, while the backend independently validates incoming requests and enforces business rules. This ensures that frontend validation is not treated as a security boundary.

## 3. Trade-offs

Real-time synchronization between browser sessions was not implemented because it was outside the assessment's essential scope.

Instead, optimistic concurrency control protects against stale updates by detecting conflicting changes and returning HTTP 409.

This approach reduces implementation complexity while maintaining data integrity.

## 4. Testing Strategy and Limitations

The backend has 86 automated tests across 12 test files, covering authentication, authorization, validation, API behavior, and business rules.

The frontend has 6 automated tests across 3 test files:

- Authentication store behavior: 1 test.
- Inquiry schema validation: 2 tests.
- Inquiry form interactions: 3 tests.

Frontend tests use Vitest and React Testing Library. API calls are mocked when testing frontend interactions.

The frontend tests do not independently verify actual database persistence or complete frontend-to-backend integration. These scenarios require additional integration and end-to-end testing, alongside manual application verification.

## 5. Use of AI and External Resources

AI tools were used to assist with implementation planning, code explanations, debugging, test development, and documentation.

AI-generated suggestions were reviewed, tested, and adapted to the project requirements. The final implementation and design decisions were evaluated against the assessment requirements.

## 6. Future Improvements

- **Customer Self-Service Portal:** Introduce customer registration and login, allowing customers to submit inquiries, view their inquiry history, and track request statuses. Customers should only be able to access their own records.
- **Automated Inquiry Collection:** Integrate WhatsApp Business, email, and website forms using workflow automation tools such as n8n. Automations could extract customer details, validate information, detect potential duplicates, and create inquiry records for staff review.
- **Real-Time Updates:** Implement real-time inquiry updates across multiple browser sessions.
- **Testing:** Expand frontend integration and end-to-end automated testing.
- **Monitoring:** Improve application logging, monitoring, and accessibility.
