#!/bin/bash

# Update contract artifacts for web app
# Run this after recompiling contracts

set -e

echo "📦 Updating contract artifacts for web app..."

CONTRACTS_DIR="packages/contracts/artifacts/contracts"
WEB_CONTRACTS_DIR="apps/web/lib/contracts"

# Ensure destination directory exists
mkdir -p "$WEB_CONTRACTS_DIR"

# Copy contract artifacts
echo "  Copying SoulaaniCoin..."
cp "$CONTRACTS_DIR/SoulaaniCoin.sol/SoulaaniCoin.json" "$WEB_CONTRACTS_DIR/"

echo "  Copying AllyCoin..."
cp "$CONTRACTS_DIR/AllyCoin.sol/AllyCoin.json" "$WEB_CONTRACTS_DIR/"

echo "  Copying UnityCoin..."
cp "$CONTRACTS_DIR/UnityCoin.sol/UnityCoin.json" "$WEB_CONTRACTS_DIR/"

echo "  Copying RedemptionVault..."
cp "$CONTRACTS_DIR/RedemptionVault.sol/RedemptionVault.json" "$WEB_CONTRACTS_DIR/"

echo "  Copying VerifiedStoreRegistry..."
cp "$CONTRACTS_DIR/VerifiedStoreRegistry.sol/VerifiedStoreRegistry.json" "$WEB_CONTRACTS_DIR/"

echo "  Copying SCRewardEngine..."
cp "$CONTRACTS_DIR/SCRewardEngine.sol/SCRewardEngine.json" "$WEB_CONTRACTS_DIR/"

echo "  Copying StorePaymentRouter..."
cp "$CONTRACTS_DIR/StorePaymentRouter.sol/StorePaymentRouter.json" "$WEB_CONTRACTS_DIR/"

echo "✅ Contract artifacts updated successfully!"
echo ""
echo "📊 Artifact sizes:"
ls -lh "$WEB_CONTRACTS_DIR"
