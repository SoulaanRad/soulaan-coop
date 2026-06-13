#!/bin/bash

# Cahootz Development Environment Setup

set -e

echo "Cahootz Development Setup"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check if we're in the right directory
if [[ ! -f "documents/cahootz-charter.md" ]]; then
    print_error "This script must be run from the Cahootz project root"
    exit 1
fi

print_info "Setting up Cahootz development environment..."
echo ""

# 1. Check Node.js version
print_info "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js >= 22.14.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="22.14.0"

if ! node -e "process.exit(process.version.slice(1) >= '$REQUIRED_VERSION' ? 0 : 1)"; then
    print_error "Node.js version $NODE_VERSION is too old. Required: >= $REQUIRED_VERSION"
    exit 1
fi

print_success "Node.js version $NODE_VERSION is compatible"

# 2. Check pnpm
print_info "Checking pnpm..."
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm not found. Installing pnpm..."
    npm install -g pnpm
fi

PNPM_VERSION=$(pnpm -v)
print_success "pnpm version $PNPM_VERSION is available"

# 3. Install dependencies
print_info "Installing dependencies..."
pnpm install
print_success "Dependencies installed"

# 4. Environment setup
print_info "Setting up environment variables..."

# Check if .env exists in packages/db
if [[ ! -f "packages/db/.env" ]]; then
    print_warning "Database .env file not found. Creating template..."
    
    cat > packages/db/.env << EOF
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/soulaancoop"
DIRECT_URL="postgresql://username:password@localhost:5432/soulaancoop"

# Authentication
AUTH_SECRET="your-auth-secret-change-this-in-production"
AUTH_REDIRECT_PROXY_URL="http://localhost:3000"

# Optional: Slack Integration
SLACK_WEBHOOK_URL=""

# Server Configuration
PORT=3001
EOF
    
    print_warning "Please update packages/db/.env with your actual database credentials"
else
    print_success "Environment file already exists"
fi

# 5. Database setup check
print_info "Checking database setup..."

# Check if PostgreSQL is running (basic check)
if command -v pg_isready &> /dev/null; then
    if pg_isready -q; then
        print_success "PostgreSQL appears to be running"
        
        # Try to generate Prisma client
        print_info "Generating Prisma client..."
        pnpm db:generate
        print_success "Prisma client generated"
        
        # Try to push schema
        print_info "Pushing database schema..."
        if pnpm db:push; then
            print_success "Database schema pushed successfully"
        else
            print_warning "Database schema push failed. Please check your DATABASE_URL in packages/db/.env"
        fi
    else
        print_warning "PostgreSQL is not running. Please start PostgreSQL and run 'pnpm db:push' manually"
    fi
else
    print_warning "PostgreSQL tools not found. Please install PostgreSQL and update packages/db/.env"
fi

# 6. Add charter validation to package.json if not present
print_info "Setting up charter compliance tools..."

# Check if charter:validate script exists
if ! grep -q "charter:validate" package.json; then
    print_info "Adding charter validation script to package.json..."
    
    # Use node to safely add the script
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.scripts['charter:validate'] = 'node scripts/validate-charter-compliance.js';
        pkg.scripts['setup:dev'] = 'bash scripts/setup-dev.sh';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    
    print_success "Charter validation script added"
else
    print_success "Charter validation script already exists"
fi

# 7. Make scripts executable
chmod +x scripts/validate-charter-compliance.js
chmod +x scripts/setup-dev.sh

# 8. Run initial charter validation
print_info "Running initial charter compliance check..."
if node scripts/validate-charter-compliance.js; then
    print_success "Charter compliance check passed"
else
    print_warning "Charter compliance check has suggestions. Review the output above."
fi

# 9. Test development servers
print_info "Testing development server startup..."

# Start development servers in background for a quick test
timeout 10s pnpm dev &> /dev/null &
DEV_PID=$!

sleep 5

# Check if processes are still running
if kill -0 $DEV_PID 2>/dev/null; then
    print_success "Development servers started successfully"
    kill $DEV_PID 2>/dev/null || true
else
    print_warning "Development servers may have issues. Check your configuration."
fi

# 10. Display governance reset reminders
echo ""
echo "Governance Reset Reminders:"
echo "================================"
echo "• Cahootz charter compliance is disabled for now"
echo "• Use documents/cahootz-charter.md as the current placeholder charter"
echo "• Keep governance behavior driven by explicit configuration"
echo "• Maintain transparency and security in all implementations"
echo ""

# 11. Final summary
echo "🎉 Development Environment Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update packages/db/.env with your database credentials"
echo "2. Run 'pnpm dev' to start development servers"
echo "3. Run the checks relevant to your change"
echo "4. Review the placeholder charter: documents/cahootz-charter.md"
echo ""
echo "Available commands:"
echo "• pnpm dev              - Start all development servers"
echo "• pnpm charter:validate - Disabled no-op charter check"
echo "• pnpm db:studio        - Open database admin interface"
echo "• pnpm lint             - Run code linting"
echo "• pnpm typecheck        - Run TypeScript checking"
echo ""
echo "Development servers will be available at:"
echo "• Frontend: http://localhost:3000"
echo "• API: http://localhost:3001"
echo ""

print_success "Ready to build Cahootz."
