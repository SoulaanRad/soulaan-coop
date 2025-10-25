# Soulaan Co-op Monorepo

**Building Generational Black Wealth Through Economic Cooperation**

Welcome to the official Soulaan Co-op monorepo! This project is designed to transform everyday spending, rent, and business transactions into lasting community wealth and ownership using digital tools like Unity Coin (UC) and SoulaaniCoin (SC).

---

## 🚀 What is Soulaan Co-op?

Soulaan Co-op is a community-owned economic platform and digital wallet system. Our goal is to keep dollars circulating within Black communities, reward participation, and give everyone a real say in how community money is invested.

- **Unity Coin (UC):** Stable digital money for payments, rent, and business.
- **SoulaaniCoin (SC):** Soulbound token for voting, rewards, and governance.
- **Merchant POS:** Accept UC and track sales at local businesses.
- **Community Dashboard:** Transparency into how community money is spent.

### 📜 Important Documents

- **[Soulaan Co-op Charter](documents/soulaan-coop-charter.md)** - Our founding principles, governance structure, and community guidelines
- **[Tech Roadmap](documents/tech_roadmap.md)** - Phased plan for the tech implementation
- **[Organizational Roadmap](documents/org_roadmap.md)** - Stages for building the co-op institution and community network

---

## 🏗️ Project Structure

This is a monorepo built with [Turborepo](https://turbo.build/repo) and [T3 Stack](https://create.t3.gg/) for type safety and developer experience.

```
soulaancoop/
├── apps/
│   ├── web/                 # Next.js frontend application
│   └── api/                 # Express.js backend API
├── packages/
│   ├── auth/                # Authentication utilities
│   ├── db/                  # Database schema and Prisma client
│   ├── trpc/                # tRPC router and procedures
│   ├── ui/                  # Shared UI components
│   └── validators/          # Zod validation schemas
├── tooling/                 # Development tools and configs
└── turbo/                   # Turborepo configuration
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - High-quality component library

### Backend
- **Express.js** - Node.js web framework
- **tRPC** - End-to-end typesafe APIs
- **Prisma** - Database ORM and migrations
- **PostgreSQL** - Primary database
- **Zod** - Schema validation

### Infrastructure
- **Turborepo** - Monorepo build system
- **pnpm** - Fast, disk space efficient package manager
- **T3 Environment** - Type-safe environment variables

## 📋 Prerequisites

- **Node.js** >= 22.14.0 (see `.nvmrc`)
- **pnpm** >= 10.11.1
- **PostgreSQL** database
- **Git**

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/SoulaanRad/soulaan-coop.git
cd soulaancoop
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create a `.env` file in the `packages/db/` directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/soulaancoop"
DIRECT_URL="postgresql://username:password@localhost:5432/soulaancoop"

# Authentication
AUTH_SECRET="your-auth-secret"
AUTH_REDIRECT_PROXY_URL="http://localhost:3000"

# Slack (optional)
SLACK_WEBHOOK_URL="your-slack-webhook-url"

# Server
PORT=3001
```

### 4. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# (Optional) Run migrations
pnpm db:migrate
```

### 5. Start Development Servers

```bash
# Start all applications in development mode
pnpm dev

# Or start specific applications
pnpm dev:next    # Frontend only
```

The applications will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 📝 Available Scripts

### Root Level Commands
```bash
pnpm dev              # Start all applications in development
pnpm build            # Build all applications
pnpm lint             # Lint all packages
pnpm lint:fix         # Fix linting issues
pnpm format:fix       # Format code with Prettier
pnpm typecheck        # Run TypeScript type checking
```

### Database Commands
```bash
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema changes to database
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Prisma Studio
```

### Authentication
```bash
pnpm auth:generate    # Generate auth utilities
```

## 🗄️ Database Schema

The application uses PostgreSQL with the following main models:

- **User** - Platform users with roles (user, business, admin)
- **Business** - Registered businesses with approval status
- **Transaction** - UC transactions between users and businesses
- **WaitlistEntry** - User and business waitlist entries
- **BusinessWaitlist** - Detailed business waitlist information

## 🔧 Development Workflow

### Adding New Features

1. **Create feature branch**: `git checkout -b feature/your-feature`
2. **Make changes** in the appropriate packages/apps
3. **Update database schema** if needed in `packages/db/prisma/schema.prisma`
4. **Run database commands** if schema changed:
   ```bash
   pnpm db:push
   pnpm db:generate
   ```
5. **Test your changes**: `pnpm dev`
6. **Lint and format**: `pnpm lint:fix && pnpm format`
7. **Commit and push**: Follow conventional commits

### Code Quality

- **ESLint** - Code linting with strict rules
- **Prettier** - Code formatting
- **TypeScript** - Static type checking
- **Husky** - Git hooks for pre-commit checks

## 🚀 Deployment

### Frontend (Next.js)
- Deploy to Vercel, Netlify, or any Next.js-compatible platform
- Set environment variables in your deployment platform

### Backend (Express.js)
- Deploy to Railway, Render, or any Node.js platform
- Ensure PostgreSQL database is accessible
- Set all required environment variables

### Database
- Use managed PostgreSQL services (Supabase, Railway, etc.)
- Run migrations: `pnpm db:migrate-prod`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure all checks pass: `pnpm lint && pnpm typecheck`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Join our community discussions
- Contact the development team

---

**Building the future of community economics, one transaction at a time.** 💪🏾