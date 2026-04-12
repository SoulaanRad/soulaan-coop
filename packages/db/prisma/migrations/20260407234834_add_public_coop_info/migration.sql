-- CreateTable
CREATE TABLE "PublicCoopInfo" (
    "id" TEXT NOT NULL,
    "coopId" TEXT NOT NULL,
    "name" TEXT,
    "tagline" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroImageUrl" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "accentColor" TEXT NOT NULL DEFAULT '#ea580c',
    "backgroundColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "coverImageUrl" TEXT,
    "aboutTitle" TEXT DEFAULT 'About Us',
    "aboutBody" TEXT,
    "missionBody" TEXT,
    "eligibilityTitle" TEXT DEFAULT 'Who Can Join',
    "eligibilityBody" TEXT,
    "features" JSONB,
    "faqs" JSONB,
    "contactEmail" TEXT,
    "contactLinks" JSONB,
    "newsletterUrl" TEXT,
    "primaryCtaLabel" TEXT DEFAULT 'Join Now',
    "primaryCtaUrl" TEXT,
    "mobileAppUrl" TEXT,
    "previewMode" TEXT NOT NULL DEFAULT 'hybrid',
    "previewOverrides" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "primaryDomain" TEXT,
    "additionalDomains" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "PublicCoopInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicCoopInfo_coopId_key" ON "PublicCoopInfo"("coopId");

-- CreateIndex
CREATE INDEX "PublicCoopInfo_coopId_idx" ON "PublicCoopInfo"("coopId");

-- CreateIndex
CREATE INDEX "PublicCoopInfo_isPublished_idx" ON "PublicCoopInfo"("isPublished");

-- CreateIndex
CREATE INDEX "PublicCoopInfo_primaryDomain_idx" ON "PublicCoopInfo"("primaryDomain");
