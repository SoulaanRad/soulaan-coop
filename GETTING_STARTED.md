# Getting Started with Cahootz

This guide gets the Cahootz monorepo running locally for product, web, API, mobile, and backend development.

## Prerequisites

- Node.js 22 or newer
- pnpm 10.11.1 or newer
- PostgreSQL
- Git

With `nvm`:

```bash
nvm install 22
nvm use 22
corepack enable
```

## Install Dependencies

```bash
pnpm install
```

## Configure Environment

Create a root `.env` file and package-specific `.env` files as needed. The shortest local path is usually:

```bash
cp .env.example .env
cp packages/db/.env.example packages/db/.env
```

Set the database connection in `packages/db/.env`:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/cahootz"
```

Replace `username` and `password` with your local PostgreSQL credentials.

## Set Up the Database

```bash
pnpm db:generate
pnpm db:push
```

Optional:

```bash
pnpm db:studio
```

## Run the App

```bash
pnpm dev
```

Default local services:

- Web: http://localhost:3000
- API: http://localhost:3001

Useful focused commands:

```bash
pnpm dev:web
pnpm dev:api
pnpm dev:api:full
```

## Development Workflow

1. Create a branch for your change.
2. Make scoped edits in the relevant app or package.
3. Update Prisma schema and run `pnpm db:push` plus `pnpm db:generate` if the data model changed.
4. Run the checks that match the change:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

5. Update docs when setup, behavior, or operational steps change.

## Project Map

```text
apps/web        Next.js web app
apps/api        Express API service
apps/mobile     Expo mobile app
packages/db     Prisma schema, migrations, and seeds
packages/trpc   API routers and services
packages/contracts Smart contracts and deployment scripts
packages/ui     Shared UI primitives
documents       Cahootz product and operating docs
```

## Troubleshooting

### Prisma client is missing

```bash
pnpm db:generate
```

### Database connection fails

Make sure PostgreSQL is running and the `DATABASE_URL` in `packages/db/.env` points to an existing database.

### Node version is wrong

```bash
nvm install 22
nvm use 22
node --version
```

### Port 3000 is already in use

Stop the process using the port or start the web app on another port.

## More Docs

- [Main README](README.md)
- [Cahootz Charter](documents/cahootz-charter.md)
- [Proposal Engine](documents/cahootz-proposal-engine.md)
- [Technical Roadmap](documents/tech_roadmap.md)
- [Organizational Roadmap](documents/org_roadmap.md)
