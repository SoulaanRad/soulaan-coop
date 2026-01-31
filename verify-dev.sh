#!/bin/bash

echo "🔍 Verifying development setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found"
    exit 1
fi

# Check pnpm
echo -n "Checking pnpm... "
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo -e "${GREEN}✓${NC} $PNPM_VERSION"
else
    echo -e "${RED}✗${NC} pnpm not found"
    exit 1
fi

# Check if node_modules exists
echo -n "Checking dependencies... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Dependencies not installed. Run: pnpm install"
fi

# Check if Prisma Client is generated
echo -n "Checking Prisma Client... "
if [ -d "node_modules/@prisma/client" ]; then
    echo -e "${GREEN}✓${NC} Prisma Client generated"
else
    echo -e "${YELLOW}⚠${NC} Prisma Client not generated. Run: pnpm db:generate"
fi

# Check environment files
echo ""
echo "Environment files:"

echo -n "  Root .env... "
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC} Missing"
fi

echo -n "  apps/api/.env... "
if [ -f "apps/api/.env" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} Missing (will use defaults)"
fi

echo -n "  apps/web/.env... "
if [ -f "apps/web/.env" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} Missing"
fi

echo -n "  apps/mobile/.env... "
if [ -f "apps/mobile/.env" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} Missing"
fi

# Check PostgreSQL
echo ""
echo -n "Checking PostgreSQL... "
if command -v psql &> /dev/null; then
    if psql -U postgres -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} Running"
    else
        echo -e "${YELLOW}⚠${NC} Not running or connection failed"
    fi
else
    echo -e "${YELLOW}⚠${NC} psql command not found"
fi

echo ""
echo "Development scripts available:"
echo "  ${GREEN}pnpm dev${NC}       - Start all apps (API + Web)"
echo "  ${GREEN}pnpm dev:api${NC}   - Start API only (port 3001)"
echo "  ${GREEN}pnpm dev:web${NC}   - Start Web only (port 3000)"
echo ""
echo "For detailed guide, see: START_DEV.md"
echo ""
