-- DropIndex
DROP INDEX "auth"."UserProfile_username_key";

-- DropIndex
DROP INDEX "auth"."UserProfile_walletAddress_key";

-- DropIndex
DROP INDEX "AdminRole_userId_role_key";

-- DropIndex
DROP INDEX "Application_userId_key";

-- DropIndex
DROP INDEX "BusinessWaitlist_ownerEmail_key";

-- DropIndex
DROP INDEX "ExpertAssignment_walletAddress_domain_key";

-- DropIndex
DROP INDEX "Store_shortCode_idx";

-- DropIndex
DROP INDEX "Store_shortCode_key";

-- DropIndex
DROP INDEX "WaitlistEntry_email_key";

-- AlterTable
ALTER TABLE "CoopConfig" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT 'bg-gold-600',
ADD COLUMN     "applicationQuestions" JSONB,
ADD COLUMN     "bgColor" TEXT NOT NULL DEFAULT 'bg-red-700',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "displayFeatures" JSONB,
ADD COLUMN     "displayMission" TEXT,
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "eligibility" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "tagline" TEXT;
