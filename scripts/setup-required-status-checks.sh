#!/bin/bash

# Script to set up Charter Compliance as a required status check
# This will prevent PRs from being merged until the charter check passes

echo "🔐 Setting up Charter Compliance as a required status check..."

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   https://cli.github.com/"
    exit 1
fi

# Check if user is logged in
if ! gh auth status &> /dev/null; then
    echo "❌ You need to be logged in to GitHub CLI. Run: gh auth login"
    exit 1
fi

echo "📋 Current branch protection settings:"
gh api repos/:owner/:repo/branches/main/protection 2>/dev/null || echo "No branch protection currently enabled"

echo ""
echo "🛡️  Setting up branch protection with required status checks..."

# Enable branch protection with required status checks
gh api \
  --method PUT \
  repos/:owner/:repo/branches/main/protection \
  --field required_status_checks='{"strict":true,"contexts":["Charter Compliance Check"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":false}' \
  --field restrictions=null

if [ $? -eq 0 ]; then
    echo "✅ Branch protection enabled successfully!"
    echo ""
    echo "📊 New protection settings:"
    echo "  ✅ Charter Compliance Check is now REQUIRED"
    echo "  ✅ PRs require at least 1 approval"
    echo "  ✅ Status checks must pass before merge"
    echo "  ✅ Status checks must be up-to-date with main branch"
    echo ""
    echo "🚀 All PRs to 'main' will now be blocked until:"
    echo "   1. Charter Compliance Check passes"
    echo "   2. At least 1 reviewer approves"
    echo ""
    echo "💡 To modify these settings later, visit:"
    echo "   https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/settings/branches"
else
    echo "❌ Failed to set up branch protection. You might need admin access to this repository."
    echo ""
    echo "🔧 Manual setup instructions:"
    echo "   1. Go to: https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/settings/branches"
    echo "   2. Click 'Add rule' for main branch"
    echo "   3. Check 'Require status checks to pass'"
    echo "   4. Search and select 'Charter Compliance Check'"
    echo "   5. Check 'Require branches to be up to date'"
    echo "   6. Save the protection rule"
fi