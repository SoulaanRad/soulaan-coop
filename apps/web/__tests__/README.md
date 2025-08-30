# Test Suite

This directory contains comprehensive tests for the Soulaan Coop web application.

## Test Structure

### Unit Tests (`__tests__/api/`)
- `waitlist.test.ts` - Tests for the waitlist API endpoint
- `business-waitlist.test.ts` - Tests for the business waitlist API endpoint

### Integration Tests (`__tests__/integration/`)
- `database.test.ts` - Tests for database operations using real Prisma client

### Component Tests (`__tests__/components/`)
- `waitlist-form.test.tsx` - Tests for the WaitlistForm React component

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run only unit tests
pnpm test -- --testPathPattern="api"

# Run only integration tests
pnpm test -- --testPathPattern="integration"

# Run only component tests
pnpm test -- --testPathPattern="components"
```

## Test Environment

### Environment Variables
Create a `.env.test` file with:
```
NODE_ENV=test
SLACK_WEBHOOK_URL=https://hooks.slack.com/test-webhook
NEXT_PUBLIC_POSTHOG_KEY=test-posthog-key
```

### Database Testing
For integration tests, you can either:
1. Use the same database as development (tests clean up after themselves)
2. Set up a separate test database with `TEST_DATABASE_URL`

## Test Coverage

The tests cover:
- ✅ API endpoint validation and error handling
- ✅ Database operations (create, upsert, constraints)
- ✅ React component rendering and user interactions
- ✅ Form submission and state management
- ✅ Slack webhook integration
- ✅ Error scenarios and edge cases

## Mocking Strategy

- **API Tests**: Mock PrismaClient and fetch for isolated testing
- **Component Tests**: Mock fetch for API calls
- **Integration Tests**: Use real database for end-to-end validation

## Adding New Tests

When adding new features:
1. Add unit tests for API endpoints in `__tests__/api/`
2. Add integration tests for database models in `__tests__/integration/`
3. Add component tests for React components in `__tests__/components/`

Follow the existing patterns and ensure comprehensive coverage of happy paths, error cases, and edge conditions.
