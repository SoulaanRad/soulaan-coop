# 🚀 Getting Started with Soulaan Co-op

**A simple guide to get the Soulaan Co-op platform up and running**

This guide will help you set up the development environment and understand the basic structure of the project.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Setup](#quick-setup)
3. [Environment Configuration](#environment-configuration)
4. [Running the Application](#running-the-application)
5. [Development Workflow](#development-workflow)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Prerequisites

Before you begin, make sure you have:

- **Node.js** v22+ - [Install with nvm](https://github.com/nvm-sh/nvm): `nvm install 22 && nvm use 22`
- **pnpm** - Install globally: `npm install -g pnpm`
- **PostgreSQL** - [Download here](https://www.postgresql.org/download/) or use Docker
- **Git** - For version control
- Basic command line knowledge

---

## ⚡ Quick Setup

### Step 1: Clone and Install

```bash
# 1. Clone the repository
git clone https://github.com/SoulaanRad/soulaan-coop.git
cd soulaancoop

# 2. Install dependencies
pnpm install
```

### Step 2: Setup Database

```bash
# Generate Prisma client and push schema
pnpm db:generate
pnpm db:push
```

### Step 3: Start Development Server

```bash
# Start all applications
pnpm dev

# Or start only the web app
pnpm dev --filter @soulaan-coop/web
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

---

## 🔧 Environment Configuration

### Database Configuration

Create `packages/db/.env`:

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

**Replace:**
- `username` and `password` with your PostgreSQL credentials
- `your-auth-secret` with a random string

---

## 🚀 Running the Application

### Development Mode

```bash
# Start all services
pnpm dev

# Or start specific apps
pnpm dev --filter @soulaan-coop/web   # Web app only
```

### Useful Commands

```bash
# View database in GUI
pnpm db:studio

# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Type checking
pnpm typecheck
```

---

## 💻 Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** in the appropriate directory:
   - `apps/web/` - Frontend (Next.js)
   - `apps/api/` - Backend API
   - `packages/db/` - Database schema
   - `packages/trpc/` - API routes

3. **Update database schema** (if needed):
   ```bash
   # Edit packages/db/prisma/schema.prisma
   pnpm db:push
   pnpm db:generate
   ```

4. **Test your changes**:
   ```bash
   pnpm dev
   # Visit http://localhost:3000
   ```

5. **Lint and format**:
   ```bash
   pnpm lint:fix
   pnpm format
   ```

6. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

### Project Structure

```
apps/
├── web/          # Next.js frontend
│   ├── app/      # App router pages
│   ├── components/ # React components
│   └── lib/      # Utilities
└── api/          # Express backend

packages/
├── db/           # Prisma schema & migrations
├── trpc/         # API routes
├── ui/           # Shared components
└── validators/   # Zod schemas
```

---

## 🐛 Troubleshooting

### "Cannot find module '@prisma/client'"

**Solution:**
```bash
pnpm db:generate
```

### "ECONNREFUSED" - Database connection failed

**Solution:**
```bash
# Make sure PostgreSQL is running

# macOS (with Homebrew)
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Check if it's running
psql --version
```

### "Node.js version ... is required"

**Solution:**
```bash
nvm install 22
nvm use 22
node --version  # Should show v22.x.x
```

### "pnpm: command not found"

**Solution:**
```bash
npm install -g pnpm
pnpm --version
```

### Port 3000 already in use

**Solution:**
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 pnpm dev
```

### Database migration errors

**Solution:**
```bash
# Reset database (⚠️ deletes all data)
pnpm db:push --force-reset
pnpm db:generate
```

---

## 📚 Additional Resources

- **[Main README](README.md)** - Project overview and tech stack
- **[Tech Roadmap](documents/tech_roadmap.md)** - Development phases
- **[Soulaan Co-op Charter](documents/soulaan-coop-charter.md)** - Founding principles

---

## 🆘 Getting Help

**Still stuck?**

1. Check the terminal logs where you ran `pnpm dev`
2. [Create an issue](https://github.com/SoulaanRad/soulaan-coop/issues) with:
   - Error message
   - Steps to reproduce
   - Your OS and Node version

---

**Happy coding! 🎉**

