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

### 🔐 Portal Documentation

**👤 I'm a developer setting up for the first time:**
1. Start here: **[📋 Deployment Summary](DEPLOYMENT_SUMMARY.md)** - 5 min overview
2. Then follow: **[🚀 Getting Started Guide](GETTING_STARTED_ADMIN.md)** - Step-by-step setup

**🔧 I need technical details:**
- **[🔒 Portal Security Guide](DEPLOYMENT_SECURITY_GUIDE.md)** - How authentication works
- **[🔑 Portal Authentication](apps/web/PORTAL_AUTH_README.md)** - Implementation details
- **[📜 Contracts Scripts](packages/contracts/SCRIPTS.md)** - All available commands

---

## ⚡ Quick Start (5 minutes)

**Just want to see it running?**

```bash
# 1. Install dependencies
pnpm install

# 2. Set up database (requires PostgreSQL running)
cp packages/db/.env.example packages/db/.env  # Then edit with your DB credentials
pnpm db:push

# 3. Start the app
pnpm dev
```

Visit **http://localhost:3000** to see the app!

> **Note:** For portal access (admin features), you'll need to deploy smart contracts first. See [Portal Setup](#setting-up-the-portal) below.

---

## 🏗️ Project Structure

This is a monorepo built with [Turborepo](https://turbo.build/repo) and [T3 Stack](https://create.t3.gg/) for type safety and developer experience.

```
soulaancoop/
├── apps/
│   ├── web/                 # 🌐 Main website + portal (Next.js)
│   ├── mobile/              # 📱 Mobile app (React Native)
│   └── api/                 # ⚙️  Backend API (Express)
├── packages/
│   ├── contracts/           # 📜 Smart contracts (SC, UC, Vault)
│   ├── db/                  # 🗄️  Database (Prisma schema + migrations)
│   ├── trpc/                # 🔌 API layer (type-safe endpoints)
│   ├── ui/                  # 🎨 Shared components
│   └── validators/          # ✅ Validation schemas (Zod)
├── documents/               # 📚 Charter, roadmaps, proposals
└── tooling/                 # 🔧 ESLint, Prettier, TypeScript configs
```

## 🛠️ Tech Stack

**Core Technologies:**
- **Next.js 15** + React 19 + TypeScript - Modern web framework
- **PostgreSQL** + Prisma - Database and ORM
- **Tailwind CSS** + shadcn/ui - Styling and components
- **Hardhat** + Solidity - Smart contracts on Base blockchain
- **Wagmi** + Viem - Web3 integration

**Infrastructure:**
- Turborepo monorepo + pnpm package manager

<details>
<summary><strong>📋 View detailed tech stack</strong></summary>

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

### Blockchain
- **Hardhat** - Ethereum development environment
- **Solidity** - Smart contract language
- **Wagmi** - React hooks for Ethereum
- **Viem** - TypeScript Ethereum library
- **Web3Modal** - Wallet connection UI
- **Base Sepolia** - Testnet for development

### Infrastructure
- **Turborepo** - Monorepo build system
- **pnpm** - Fast, disk space efficient package manager
- **T3 Environment** - Type-safe environment variables

</details>

## 📋 Prerequisites

**Basic (to run the app):**
- **Node.js** >= 22.14.0 - [Install with nvm](https://github.com/nvm-sh/nvm): `nvm install 22 && nvm use 22`
- **pnpm** >= 10.11.1 - Install: `npm install -g pnpm`
- **PostgreSQL** - [Download here](https://www.postgresql.org/download/) or use Docker
- **Git** - For version control

**Advanced (for portal/blockchain features):**
- **MetaMask** - [Browser extension](https://metamask.io/) for wallet connection
- **Base Sepolia testnet ETH** - [Get from faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)

## 🚀 Getting Started

### 🗺️ Setup Journey

Choose your path:

```
┌─────────────────────────────────────────────────────────────────┐
│  PATH 1: Basic Development (15 min)                             │
│  ✓ Run the app locally                                          │
│  ✓ Make changes to the frontend                                 │
│  ✗ No portal access yet                                         │
│                                                                  │
│  → Follow steps 1-5 below                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PATH 2: Full Portal Setup (45 min)                             │
│  ✓ Everything in Path 1                                         │
│  ✓ Deploy smart contracts                                       │
│  ✓ Access portal with Web3 wallet                               │
│  ✓ Add team members                                             │
│                                                                  │
│  → Follow steps 1-5, then see GETTING_STARTED_ADMIN.md         │
└─────────────────────────────────────────────────────────────────┘
```

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

**You'll need 3 environment files:**

<details>
<summary><strong>📁 packages/db/.env</strong> - Database connection (⚠️ REQUIRED)</summary>

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/soulaancoop"
DIRECT_URL="postgresql://username:password@localhost:5432/soulaancoop"

# Authentication
AUTH_SECRET="your-auth-secret"
AUTH_REDIRECT_PROXY_URL="http://localhost:3000"

# Server
PORT=3001
```

> Replace `username`, `password` with your PostgreSQL credentials

</details>

<details>
<summary><strong>📁 apps/web/.env.local</strong> - Portal & blockchain (optional for basic dev)</summary>

```bash
# Blockchain Configuration
NEXT_PUBLIC_SOULAANI_COIN_ADDRESS="0x..." # Your deployed SC contract address
NEXT_PUBLIC_UNITY_COIN_ADDRESS="0x..."    # Your deployed UC contract address
NEXT_PUBLIC_CHAIN_ID="84532"              # Base Sepolia
NEXT_PUBLIC_RPC_URL="https://sepolia.base.org"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-project-id"

# Session Configuration
SESSION_SECRET="your-32-char-random-string"
SESSION_MAX_AGE="604800"                  # 7 days in seconds
```

> Only needed if you want to access the portal. Get WalletConnect Project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com)

</details>

<details>
<summary><strong>📁 packages/contracts/.env</strong> - Contract deployment (optional for basic dev)</summary>

```bash
# Deployment Configuration
PRIVATE_KEY="your-deployer-private-key"
RPC_URL="https://sepolia.base.org"
GOVERNANCE_BOT_ADDRESS=""                 # Optional
TREASURY_SAFE_ADDRESS=""                  # Optional
```

> ⚠️ **Security:** Never commit this file! Only needed if you're deploying contracts.

</details>

💡 **Tip:** Start with just the database `.env` to get the app running, then add the others when you need portal features.

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

### 🎉 What's Next?

**After basic setup, you can:**
- ✅ Browse the main website at http://localhost:3000
- ✅ View the database with `pnpm db:studio`
- ✅ Make changes to the code (hot reload enabled)
- ✅ Run tests with `pnpm test`

**To access the portal:**
- 📜 Deploy smart contracts (see [GETTING_STARTED_ADMIN.md](GETTING_STARTED_ADMIN.md))
- 🔑 Connect your MetaMask wallet
- 💰 Receive SoulaaniCoin (SC) to gain access

## 📝 Available Scripts

### 🚀 Most Used Commands
```bash
pnpm dev              # Start all apps in development mode
pnpm db:studio        # Open database GUI (Prisma Studio)
pnpm lint:fix         # Fix linting issues automatically
pnpm format           # Format code with Prettier
```

<details>
<summary><strong>📋 View all available commands</strong></summary>

### Root Level Commands
```bash
pnpm dev              # Start all applications in development
pnpm build            # Build all applications
pnpm lint             # Lint all packages
pnpm lint:fix         # Fix linting issues
pnpm format:fix       # Format code with Prettier
pnpm typecheck        # Run TypeScript type checking
pnpm clean            # Clean all build artifacts
```

### Database Commands
```bash
pnpm db:generate      # Generate Prisma client (after schema changes)
pnpm db:push          # Push schema changes to database (dev only)
pnpm db:migrate       # Create and run migrations (production-safe)
pnpm db:studio        # Open Prisma Studio (database GUI)
pnpm db:seed          # Seed database with test data
```

### Contract Commands (in packages/contracts/)
```bash
pnpm deploy:sepolia           # Deploy contracts to Base Sepolia
pnpm deploy:local             # Deploy to local Hardhat network
pnpm setup-admins:sepolia     # Add team members and grant SC
pnpm test                     # Run contract tests
pnpm verify:sepolia           # Verify contracts on Basescan
```

### Development Commands
```bash
pnpm dev:next         # Start only the Next.js app
pnpm dev:api          # Start only the API server
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
```

</details>

## 💡 Key Concepts

**Understanding the System:**

- **Unity Coin (UC)** - Stable digital currency for everyday transactions (payments, rent, business purchases)
- **SoulaaniCoin (SC)** - Soulbound token (non-transferable) that grants:
  - 🔐 Portal access
  - 🗳️ Voting rights
  - 🏆 Governance participation
- **Portal** - Web dashboard for SC holders to view financial data, manage members, and participate in governance
- **Roles** - Users can have multiple roles:
  - `member` - Basic SC holder
  - `business` - Registered business owner
  - `admin` - Can manage members
  - `governor` - Full governance rights (award/slash SC, manage members)

**How it works:**
1. Deploy smart contracts to blockchain
2. Add team members and award them SC
3. They connect their wallet to access the portal
4. Portal checks on-chain SC balance for authentication
5. Role-based features show based on their assigned roles

---

## 🗄️ Database Schema

The application uses PostgreSQL with the following main models:

- **User** - Platform users with wallet addresses and roles array (member, business, admin, governor)
- **Business** - Registered businesses with approval status
- **Transaction** - UC transactions between users and businesses
- **WaitlistEntry** - User and business waitlist entries
- **BusinessWaitlist** - Detailed business waitlist information
- **AuthChallenge** - Temporary challenges for wallet signature verification
- **RateLimit** - Rate limiting for authentication attempts

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

### Setting Up the Portal

For first-time portal setup (deploying contracts and adding team members):

1. **Deploy contracts**: See [GETTING_STARTED_ADMIN.md](GETTING_STARTED_ADMIN.md)
2. **Configure environment**: Add contract addresses to `apps/web/.env.local`
3. **Add team members**: Use `pnpm setup-admins:sepolia` in `packages/contracts/`
4. **Start the portal**: `pnpm dev --filter @soulaan-coop/web`
5. **Access portal**: Navigate to `http://localhost:3000/portal`

See the full guide in [GETTING_STARTED_ADMIN.md](GETTING_STARTED_ADMIN.md).

### Code Quality

- **ESLint** - Code linting with strict rules
- **Prettier** - Code formatting
- **TypeScript** - Static type checking
- **Husky** - Git hooks for pre-commit checks

## 🚀 Deployment

### Smart Contracts
- Deploy to Base Sepolia (testnet) or Base Mainnet (production)
- Use Hardhat deployment scripts in `packages/contracts/`
- See [DEPLOYMENT_SECURITY_GUIDE.md](DEPLOYMENT_SECURITY_GUIDE.md) for security best practices
- Scripts reference: [packages/contracts/SCRIPTS.md](packages/contracts/SCRIPTS.md)

### Frontend (Next.js)
- Deploy to Vercel, Netlify, or any Next.js-compatible platform
- Set environment variables in your deployment platform
- Ensure blockchain RPC endpoints are accessible

### Backend (Express.js)
- Deploy to Railway, Render, or any Node.js platform
- Ensure PostgreSQL database is accessible
- Set all required environment variables

### Database
- Use managed PostgreSQL services (Supabase, Railway, etc.)
- Run migrations: `pnpm db:migrate deploy`

## 🐛 Troubleshooting

<details>
<summary><strong>Error: "Cannot find module '@prisma/client'"</strong></summary>

Run `pnpm db:generate` to generate the Prisma client:
```bash
pnpm db:generate
```

</details>

<details>
<summary><strong>Error: "ECONNREFUSED" when starting the app</strong></summary>

Make sure PostgreSQL is running:
```bash
# macOS (with Homebrew)
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Check if it's running
psql --version
```

</details>

<details>
<summary><strong>Portal shows "Access Denied" or "No SoulaaniCoin"</strong></summary>

You need SoulaaniCoin (SC) to access the portal:
1. Deploy contracts first: See [Getting Started Guide](GETTING_STARTED_ADMIN.md)
2. The deployer automatically receives 1 SC
3. Add team members with `pnpm setup-admins:sepolia` in `packages/contracts/`

</details>

<details>
<summary><strong>Error: "Node.js version ... is required"</strong></summary>

Use Node 22:
```bash
nvm install 22
nvm use 22
node --version  # Should show v22.x.x
```

</details>

<details>
<summary><strong>Error: "pnpm: command not found"</strong></summary>

Install pnpm globally:
```bash
npm install -g pnpm
pnpm --version  # Should show v10.11.1 or higher
```

</details>

<details>
<summary><strong>Database migration errors</strong></summary>

Reset your database (⚠️ deletes all data):
```bash
pnpm db:push --force-reset
pnpm db:generate
```

</details>

<details>
<summary><strong>MetaMask not connecting</strong></summary>

1. Make sure MetaMask is installed and unlocked
2. Switch to Base Sepolia network in MetaMask
3. Clear your browser cache and try again
4. Check that `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set in `.env.local`

</details>

**Still stuck?** [Create an issue](https://github.com/SoulaanRad/soulaan-coop/issues) with:
- Error message
- Steps to reproduce
- Your OS and Node version

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure all checks pass: `pnpm lint && pnpm typecheck`
6. Submit a pull request

## ❓ FAQ

<details>
<summary><strong>Do I need to know blockchain/Web3 to contribute?</strong></summary>

No! Most of the codebase is standard Next.js/React. Blockchain is only needed for:
- Portal authentication
- Smart contract deployment (one-time setup)

You can work on the frontend, database, and API without touching Web3.

</details>

<details>
<summary><strong>What's the difference between the portal and the main app?</strong></summary>

- **Main app** (`/`) - Public website, waitlist, information
- **Portal** (`/portal`) - Protected area for SC holders to manage the co-op

Think of the portal as the "back office" for co-op members.

</details>

<details>
<summary><strong>Can I use this without deploying contracts?</strong></summary>

Yes! You can develop the frontend and database features without contracts. Portal access requires contracts, but everything else works fine.

</details>

<details>
<summary><strong>How much does it cost to deploy?</strong></summary>

On Base Sepolia (testnet): **FREE** - just need test ETH from faucet
On Base Mainnet (production): ~$10-50 in ETH for gas fees

</details>

<details>
<summary><strong>Is this production-ready?</strong></summary>

The codebase is under active development. See [Tech Roadmap](documents/tech_roadmap.md) for current status and planned features.

</details>

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Join our community discussions
- Contact the development team

---

**Building the future of community economics, one transaction at a time.** 💪🏾
