# Frontend Testing Guide

## 1. Testing Tools

The frontend uses:

- **Vitest** – Test runner.
- **React Testing Library** – Component rendering and user interaction testing.
- **jest-dom** – DOM assertions.
- **jsdom** – Browser-like testing environment.

## 2. Running Tests

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run all frontend tests:

```bash
npm test
```

Run the inquiry form tests only:

```bash
npx vitest run src/tests/inquiry-form.test.tsx
```

## 3. Automated Test Coverage

| Test File | Purpose | Test Count |
|---|---|---:|
| auth.store.test.ts | Authentication state management | 1 |
| inquiry.schema.test.ts | Inquiry data validation | 2 |
| inquiry-form.test.tsx | Inquiry form user interactions | 3 |
| **Total** | | **6** |

### Inquiry Form Tests

1. Empty form submission displays validation errors.
2. Invalid inquiry information does not trigger API requests.
3. Valid inquiry information triggers duplicate checking and inquiry creation, followed by navigation.

## 4. Test Execution

Run:

```bash
npm test
```

The current test suite passes all 6 tests across 3 test files.

## 5. Testing Limitations

- Inquiry API calls are mocked in frontend component tests.
- Frontend tests do not verify actual database persistence.
- Full frontend-to-backend integration is checked separately.
- Manual testing is used for complete application workflows, authorization and stale-data scenarios.

These limitations are acknowledged as part of the assessment.
