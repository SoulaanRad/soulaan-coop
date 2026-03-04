-- Add unique constraint for idempotent SC reward creation
-- Prevents duplicate mints for the same source UC transaction + user + reason
CREATE UNIQUE INDEX IF NOT EXISTS "SCRewardTransaction_sourceUcTxHash_userId_reason_key"
  ON "public"."SCRewardTransaction"("sourceUcTxHash", "userId", "reason")
  WHERE "sourceUcTxHash" IS NOT NULL;
