-- Add chain configuration fields to CoopConfig
ALTER TABLE "CoopConfig" ADD COLUMN "chainId" INTEGER;
ALTER TABLE "CoopConfig" ADD COLUMN "chainName" TEXT;
ALTER TABLE "CoopConfig" ADD COLUMN "rpcUrl" TEXT;
ALTER TABLE "CoopConfig" ADD COLUMN "scTokenAddress" TEXT;
ALTER TABLE "CoopConfig" ADD COLUMN "ucTokenAddress" TEXT;
ALTER TABLE "CoopConfig" ADD COLUMN "redemptionVaultAddress" TEXT;
ALTER TABLE "CoopConfig" ADD COLUMN "treasurySafeAddress" TEXT;
ALTER TABLE "CoopConfig" ADD COLUMN "verifiedStoreRegistryAddress" TEXT;
ALTER TABLE "CoopConfig" ADD COLUMN "storePaymentRouterAddress" TEXT;
ALTER TABLE "CoopConfig" ADD COLUMN "rewardEngineAddress" TEXT;
ALTER TABLE "CoopConfig" ADD COLUMN "scTokenSymbol" TEXT DEFAULT 'SC';
ALTER TABLE "CoopConfig" ADD COLUMN "scTokenName" TEXT DEFAULT 'SoulaaniCoin';

-- Migrate data from CoopChainConfig to CoopConfig
-- Match by coopId and update the active CoopConfig version with chain data
UPDATE "CoopConfig" cc
SET 
  "chainId" = ccc."chainId",
  "chainName" = ccc."chainName",
  "rpcUrl" = ccc."rpcUrl",
  "scTokenAddress" = ccc."scTokenAddress",
  "ucTokenAddress" = ccc."ucTokenAddress",
  "redemptionVaultAddress" = ccc."redemptionVaultAddress",
  "treasurySafeAddress" = ccc."treasurySafeAddress",
  "verifiedStoreRegistryAddress" = ccc."verifiedStoreRegistryAddress",
  "storePaymentRouterAddress" = ccc."storePaymentRouterAddress",
  "rewardEngineAddress" = ccc."rewardEngineAddress",
  "scTokenSymbol" = ccc."scTokenSymbol",
  "scTokenName" = ccc."scTokenName"
FROM "CoopChainConfig" ccc
WHERE cc."coopId" = ccc."coopId" AND cc."isActive" = true;

-- Drop the CoopChainConfig table
DROP TABLE "CoopChainConfig";
