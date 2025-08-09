# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Soulaan Co-op is a community-owned economic platform built as a monorepo using Turborepo and T3 Stack. It implements Unity Coin (UC) and SoulaaniCoin (SC) digital currencies to build generational Black wealth through economic cooperation. The project consists of a Next.js web frontend, Express.js API backend, and shared packages for database, tRPC API layer, UI components, and validation schemas.

## Essential Commands

### Development
```bash
pnpm dev              # Start all applications in watch mode
pnpm dev:next         # Start only the Next.js frontend (port 3000)
pnpm dev:mobile       # Start only the Expo mobile app web version (port 8081)
pnpm build            # Build all applications for production
pnpm start            # Start production builds
pnpm start:mobile     # Start mobile app production build
```

### Code Quality & Testing
```bash
pnpm lint             # Lint all packages
pnpm lint:fix         # Fix linting issues automatically  
pnpm typecheck        # Run TypeScript type checking across all packages
pnpm format:fix       # Format code with Prettier
```

### Database Operations
```bash
pnpm db:generate      # Generate Prisma client from schema
pnpm db:push          # Push schema changes to database (development)
pnpm db:migrate       # Run database migrations (development)
pnpm db:migrate-prod  # Run database migrations (production)
pnpm db:studio        # Open Prisma Studio database browser
```

### Package Management
```bash
pnpm install          # Install all dependencies
pnpm clean            # Remove node_modules from root
pnpm clean:workspaces # Clean all workspace node_modules
```

## Architecture

This monorepo follows a layered architecture pattern with clear separation of concerns:

### Applications (`/apps`)
- **`web/`** - Next.js 15 frontend with App Router, React 19, TypeScript, Tailwind CSS, and shadcn/ui components
- **`api/`** - Express.js backend API server that serves tRPC endpoints and handles authentication
- **`mobile/`** - Expo React Native app with React Navigation, comprehensive onboarding flow, and community investment features
- **`community-investment-app/`** - V0 prototype (can be deleted after mobile implementation is complete)

### Shared Packages (`/packages`)  
- **`db/`** - Prisma database schema, client, and migrations for PostgreSQL with models for User, Business, Transaction, and Waitlist entities
- **`trpc/`** - End-to-end typesafe API layer with routers, procedures, and authentication context
- **`ui/`** - Shared React components built on Radix UI primitives and styled with Tailwind
- **`validators/`** - Zod schemas for request/response validation across the application

### Development Tooling (`/tooling`)
- **`eslint/`** - Shared ESLint configurations for different environments (Next.js, React, Node.js)
- **`prettier/`** - Code formatting configuration
- **`tailwind/`** - Tailwind CSS configuration presets  
- **`typescript/`** - TypeScript configuration templates
- **`github/`** - GitHub Actions for CI/CD workflows

## Key Technical Details

- **Package Manager**: pnpm with workspace configuration
- **Build System**: Turborepo for efficient monorepo builds and caching
- **Database**: PostgreSQL with Prisma ORM for type-safe database access
- **API Layer**: tRPC for end-to-end type safety between frontend and backend
- **Authentication**: NextAuth.js integration through tRPC context
- **Environment**: T3 environment variables with Zod validation
- **UI Framework**: React 19 with Next.js 15 App Router
- **Styling**: Tailwind CSS with shadcn/ui component library built on Radix UI

## Database Schema Highlights

The application models a cooperative economic platform with:
- **Users** with roles (user, business, admin) and SC token holdings
- **Businesses** with approval workflows and UC payment integration  
- **Transactions** tracking UC transfers between users and businesses
- **Waitlist** system for managing platform access and business onboarding

## Development Workflow

1. Database changes require updating `packages/db/prisma/schema.prisma` followed by `pnpm db:push` and `pnpm db:generate`
2. API changes are made in `packages/trpc/src/routers/` with automatic type safety to frontend
3. UI components are shared from `packages/ui/` and follow shadcn/ui patterns
4. All packages use workspace dependencies (e.g., `@repo/db`, `@repo/trpc`) for internal imports
5. Always run `pnpm typecheck` and `pnpm lint` before committing changes

## Important Notes

- Node.js >= 22.14.0 and pnpm >= 9.6.0 are required
- Environment variables are configured in `packages/db/.env` for database connections
- The project follows the Soulaan Co-op Charter for community governance and economic principles
- All authentication and sensitive operations flow through tRPC procedures with proper validation