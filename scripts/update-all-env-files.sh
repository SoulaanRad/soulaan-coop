#!/bin/bash

# Update All .env Files with New Contract Addresses
# Run this after deploying fresh contracts

set -e

echo ""
echo "🔄 UPDATING ALL .ENV FILES WITH NEW CONTRACT ADDRESSES"
echo "======================================================================"
echo ""

# Get the new addresses from packages/contracts/.env
CONTRACTS_ENV="packages/contracts/.env"

if [ ! -f "$CONTRACTS_ENV" ]; then
  echo "❌ Error: $CONTRACTS_ENV not found"
  exit 1
fi

# Extract addresses
SC_ADDRESS=$(grep "^SOULAANI_COIN_ADDRESS=" "$CONTRACTS_ENV" | cut -d'=' -f2)
UC_ADDRESS=$(grep "^UNITY_COIN_ADDRESS=" "$CONTRACTS_ENV" | cut -d'=' -f2)
VAULT_ADDRESS=$(grep "^REDEMPTION_VAULT_ADDRESS=" "$CONTRACTS_ENV" | cut -d'=' -f2)
USDC_ADDRESS=$(grep "^MOCK_USDC_ADDRESS=" "$CONTRACTS_ENV" | cut -d'=' -f2)
REGISTRY_ADDRESS=$(grep "^VERIFIED_STORE_REGISTRY_ADDRESS=" "$CONTRACTS_ENV" | cut -d'=' -f2)
ENGINE_ADDRESS=$(grep "^SC_REWARD_ENGINE_ADDRESS=" "$CONTRACTS_ENV" | cut -d'=' -f2)
ROUTER_ADDRESS=$(grep "^STORE_PAYMENT_ROUTER_ADDRESS=" "$CONTRACTS_ENV" | cut -d'=' -f2)

echo "📋 New Contract Addresses:"
echo "   SC:       $SC_ADDRESS"
echo "   UC:       $UC_ADDRESS"
echo "   Vault:    $VAULT_ADDRESS"
echo "   USDC:     $USDC_ADDRESS"
echo "   Registry: $REGISTRY_ADDRESS"
echo "   Engine:   $ENGINE_ADDRESS"
echo "   Router:   $ROUTER_ADDRESS"
echo ""

# Function to update or add env variable
update_env() {
  local file=$1
  local key=$2
  local value=$3
  
  if [ ! -f "$file" ]; then
    echo "   ⚠️  File not found: $file (skipping)"
    return
  fi
  
  # Check if key exists
  if grep -q "^${key}=" "$file"; then
    # Update existing
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
    else
      # Linux
      sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    fi
    echo "   ✅ Updated $key in $file"
  else
    # Add new
    echo "${key}=${value}" >> "$file"
    echo "   ✅ Added $key to $file"
  fi
}

# Update root .env
echo "1️⃣  Updating root .env..."
update_env ".env" "SOULAANI_COIN_ADDRESS" "$SC_ADDRESS"
update_env ".env" "UNITY_COIN_ADDRESS" "$UC_ADDRESS"
update_env ".env" "REDEMPTION_VAULT_ADDRESS" "$VAULT_ADDRESS"
update_env ".env" "MOCK_USDC_ADDRESS" "$USDC_ADDRESS"
update_env ".env" "VERIFIED_STORE_REGISTRY_ADDRESS" "$REGISTRY_ADDRESS"
update_env ".env" "SC_REWARD_ENGINE_ADDRESS" "$ENGINE_ADDRESS"
update_env ".env" "STORE_PAYMENT_ROUTER_ADDRESS" "$ROUTER_ADDRESS"
echo ""

# Update apps/api/.env
echo "2️⃣  Updating apps/api/.env..."
update_env "apps/api/.env" "SOULAANI_COIN_ADDRESS" "$SC_ADDRESS"
update_env "apps/api/.env" "UNITY_COIN_ADDRESS" "$UC_ADDRESS"
update_env "apps/api/.env" "REDEMPTION_VAULT_ADDRESS" "$VAULT_ADDRESS"
update_env "apps/api/.env" "MOCK_USDC_ADDRESS" "$USDC_ADDRESS"
update_env "apps/api/.env" "VERIFIED_STORE_REGISTRY_ADDRESS" "$REGISTRY_ADDRESS"
update_env "apps/api/.env" "SC_REWARD_ENGINE_ADDRESS" "$ENGINE_ADDRESS"
update_env "apps/api/.env" "STORE_PAYMENT_ROUTER_ADDRESS" "$ROUTER_ADDRESS"
echo ""

# Update apps/web/.env (for Next.js public vars)
echo "3️⃣  Updating apps/web/.env..."
update_env "apps/web/.env" "NEXT_PUBLIC_SOULAANI_COIN_ADDRESS" "$SC_ADDRESS"
echo ""

# Update packages/trpc/.env if it exists
if [ -f "packages/trpc/.env" ]; then
  echo "4️⃣  Updating packages/trpc/.env..."
  update_env "packages/trpc/.env" "SOULAANI_COIN_ADDRESS" "$SC_ADDRESS"
  update_env "packages/trpc/.env" "UNITY_COIN_ADDRESS" "$UC_ADDRESS"
  update_env "packages/trpc/.env" "REDEMPTION_VAULT_ADDRESS" "$VAULT_ADDRESS"
  update_env "packages/trpc/.env" "VERIFIED_STORE_REGISTRY_ADDRESS" "$REGISTRY_ADDRESS"
  update_env "packages/trpc/.env" "SC_REWARD_ENGINE_ADDRESS" "$ENGINE_ADDRESS"
  update_env "packages/trpc/.env" "STORE_PAYMENT_ROUTER_ADDRESS" "$ROUTER_ADDRESS"
  echo ""
fi

echo "======================================================================"
echo "✅ ALL .ENV FILES UPDATED!"
echo "======================================================================"
echo ""
echo "📝 NEXT STEPS:"
echo "1. Restart your backend/API servers"
echo "2. Restart your web app"
echo "3. Run: pnpm test-flows:sepolia (to test)"
echo ""
