# Contributing Guide

Thank you for your interest in contributing to the Customer Inquiry Management System!

This document explains how to set up the project, make changes, and submit contributions.

## 1. Project Overview

The Customer Inquiry Management System is a full-stack application designed to help customer service teams manage customer inquiries, track their statuses, and maintain inquiry history.

### Technology Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL
- **Authentication:** JWT and refresh tokens
- **Testing:** Vitest, React Testing Library, Supertest

## 2. Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- PostgreSQL
- Git

### Clone the Repository

```bash
git clone https://github.com/dinithanki/customer-inquiry-management-system.git

cd customer-inquiry-management-system
```

### Backend Setup

```bash
cd backend
npm install
```

Configure your environment variables using the project's environment example file, if available.

Create and configure your PostgreSQL database, then run the database migrations:

```bash
npm run db:migrate
```

Run the backend development server:

```bash
npm run dev
```

### Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Configure the frontend API URL in your local environment file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

The application should be available at:

`http://localhost:3000`

## 3. Development Guidelines

Please follow these guidelines when contributing:

- Write readable, maintainable, and properly structured code.
- Use TypeScript types wherever appropriate.
- Follow the existing project architecture and coding conventions.
- Use meaningful variable, function, and component names.
- Validate user input on both the frontend and backend.
- Handle errors and provide appropriate feedback.
- Avoid committing environment files, passwords, API keys, or other secrets.
- Keep changes focused and avoid unnecessary modifications.

## 4. Branching Guidelines

Create a separate branch for each feature or bug fix.

Suggested branch naming:

```text
feature/feature-name
fix/bug-description
docs/documentation-update
refactor/component-name
```

Example:

```bash
git checkout -b feature/improve-inquiry-search
```

## 5. Commit Message Guidelines

Use clear and descriptive commit messages.

Suggested prefixes:

| Prefix | Purpose |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `test:` | Adding or updating tests |
| `refactor:` | Code improvements |
| `style:` | Formatting changes |
| `chore:` | Maintenance tasks |

Examples:

```bash
git commit -m "feat: improve inquiry search"
git commit -m "fix: handle invalid inquiry status"
git commit -m "docs: update installation instructions"
```

## 6. Testing

Before submitting changes, run the relevant tests.

### Backend

```bash
cd backend
npm test
npm run build
```

### Frontend

```bash
cd frontend
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Please make sure your changes do not break existing functionality.

## 7. Pull Request Process

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Run the relevant tests.
5. Commit and push your changes.
6. Open a Pull Request with a clear description.

Include the following in your Pull Request:

- A summary of the changes.
- The reason for the changes.
- Screenshots for relevant UI changes.
- Testing performed.
- Any related issues.

## 8. Reporting Bugs

When reporting a bug, include:

- A clear description of the problem.
- Steps to reproduce it.
- Expected behavior.
- Actual behavior.
- Relevant screenshots or error messages.

## 9. Feature Suggestions

Feature suggestions and improvements are welcome.

Please describe the proposed feature, the problem it solves, and how it could improve the application.

## 10. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Thank you for helping improve the Customer Inquiry Management System!