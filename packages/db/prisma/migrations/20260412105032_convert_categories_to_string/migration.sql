-- AlterTable: Convert Store.category from enum to string
-- Step 1: Add a temporary column to store the converted values
ALTER TABLE "public"."Store" ADD COLUMN "category_temp" TEXT;

-- Step 2: Copy the enum values as strings to the temporary column
UPDATE "public"."Store" SET "category_temp" = "category"::TEXT;

-- Step 3: Drop the old enum column
ALTER TABLE "public"."Store" DROP COLUMN "category";

-- Step 4: Rename the temporary column to category
ALTER TABLE "public"."Store" RENAME COLUMN "category_temp" TO "category";

-- AlterTable: Convert Product.category from enum to string (already nullable)
-- Step 1: Add a temporary column
ALTER TABLE "public"."Product" ADD COLUMN "category_temp" TEXT;

-- Step 2: Copy the enum values as strings (handling nulls)
UPDATE "public"."Product" SET "category_temp" = "category"::TEXT WHERE "category" IS NOT NULL;

-- Step 3: Drop the old enum column
ALTER TABLE "public"."Product" DROP COLUMN "category";

-- Step 4: Rename the temporary column to category
ALTER TABLE "public"."Product" RENAME COLUMN "category_temp" TO "category";

-- Create indexes
CREATE INDEX IF NOT EXISTS "Store_category_idx" ON "public"."Store"("category");
CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "public"."Product"("category");
