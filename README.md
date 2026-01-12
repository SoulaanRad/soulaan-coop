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

---

## 📚 Documentation

### 🏁 Starting Your Co-op Journey

#### **New to the Project? Start Here:**
1. **[Soulaan Co-op Charter](documents/soulaan-coop-charter.md)** - **Read this first!** Understand our mission, values, and how the co-op works
2. **[Getting Started Guide](GETTING_STARTED.md)** - Set up your development environment and run the platform locally
3. **[Tech Roadmap](documents/tech_roadmap.md)** - See where we are and where we're going

---

### 🏗️ Setting Up Your Co-op

#### **Phase 1: Deploy the Economic Infrastructure**
The co-op runs on blockchain-based tokens that power the economy:

- **[Quick Start: Deploy Contracts](packages/contracts/QUICK_START.md)** - Deploy Unity Coin (UC) and SoulaaniCoin (SC) in 5 minutes
- **[Full Deployment Guide](packages/contracts/DEPLOYMENT_GUIDE.md)** - Complete instructions for deploying the co-op's economic system
- **[Understanding the Contracts](packages/contracts/README.md)** - Learn how UC (payments) and SC (governance) work together

**What you're deploying:**
- **Unity Coin (UC)** - The stable currency members use for rent, business purchases, and transactions
- **SoulaaniCoin (SC)** - Governance tokens that give members voting power and rewards
- **Redemption Vault** - How members convert UC back to cash when needed

#### **Phase 2: Set Up Treasury & Governance**
Protect community funds and establish decision-making:

- **[Set Up Multi-Sig Wallet](packages/contracts/docs/SETUP_MULTISIG.md)** - Create a secure multi-signature wallet for the treasury (requires 3-of-5 signatures)
- **[Add Governors & Admins](packages/contracts/SCRIPTS.md#setup-adminsts)** - Give team members the ability to manage the co-op
- **[Security Best Practices](packages/contracts/SECURITY.md)** - Keep the co-op's funds and systems secure

#### **Phase 3: Launch the Member Portal**
Give members access to the platform:

- **[Portal Setup Guide](apps/web/PORTAL_AUTH_README.md)** - Set up Web3 wallet authentication so members can log in
- **[Understanding Security](DEPLOYMENT_SECURITY_GUIDE.md)** - Learn how blockchain roles and app permissions work together
- **[Quick Deployment Summary](DEPLOYMENT_SUMMARY.md)** - Fast reference for getting the portal live

---

### 🔧 Managing Your Co-op

#### **Day-to-Day Operations**
- **[Contract Management Scripts](packages/contracts/SCRIPTS.md)** - Award SC to active members, check balances, manage roles
- **[Monitor Member Activity](packages/contracts/SCRIPTS.md#monitor-sc-awardssts)** - Track SC awards and member participation
- **[Handle Redemptions](packages/contracts/README.md#redemptionvault)** - Process member requests to convert UC to cash

#### **Governance & Decision Making**
- **[How Proposals Work](documents/soulaan_proposal_engine.md)** - Create and vote on community proposals
- **[Organizational Roadmap](documents/org_roadmap.md)** - Grow from pilot to full community institution

---

### 🧪 For Developers

#### **Development Workflow**
- **[Start Development Servers](START_DEV.md)** - Quick guide to run API and Web in dev mode
- **[Complete Development Guide](DEV_GUIDE.md)** - Full development workflow, debugging, and troubleshooting
- **[Environment Setup](ENV_SETUP_GUIDE.md)** - Configure all environment variables

#### **Testing & Quality**
- **[Testing Guide](TESTING.md)** - Run tests for the web app and API
- **[Contract Testing](packages/contracts/TESTING_GUIDE.md)** - Test smart contracts before deployment
- **[CI/CD Setup](packages/contracts/CI_CD_SETUP.md)** - Automate testing and deployment

---

### 📖 Quick Reference: "How Do I...?"

| **How do I...** | **Read this** |
|------------------|---------------|
| **Understand the co-op's mission?** | [Soulaan Co-op Charter](documents/soulaan-coop-charter.md) |
| **Set up my development environment?** | [Getting Started Guide](GETTING_STARTED.md) |
| **Run the API and Web in dev mode?** | [Start Development Servers](START_DEV.md) |
| **Configure environment variables?** | [Environment Setup Guide](ENV_SETUP_GUIDE.md) |
| **Deploy the co-op's economic system?** | [Quick Start: Deploy Contracts](packages/contracts/QUICK_START.md) |
| **Understand how UC and SC work?** | [Understanding the Contracts](packages/contracts/README.md) |
| **Set up the treasury multi-sig?** | [Set Up Multi-Sig Wallet](packages/contracts/docs/SETUP_MULTISIG.md) |
| **Add governors and admins?** | [Contract Management Scripts](packages/contracts/SCRIPTS.md) |
| **Launch the member portal?** | [Portal Setup Guide](apps/web/PORTAL_AUTH_README.md) |
| **Award SC to active members?** | [Contract Management Scripts](packages/contracts/SCRIPTS.md) |
| **Process member redemptions?** | [Understanding the Contracts](packages/contracts/README.md#redemptionvault) |
| **Create community proposals?** | [How Proposals Work](documents/soulaan_proposal_engine.md) |
| **See what's coming next?** | [Tech Roadmap](documents/tech_roadmap.md) |

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