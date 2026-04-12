-- Add new ProductCategory enum values (already applied, documenting for migration history)
-- These commands use IF NOT EXISTS so they're safe to run multiple times
ALTER TYPE "public"."ProductCategory" ADD VALUE IF NOT EXISTS 'ACCESSORIES';
ALTER TYPE "public"."ProductCategory" ADD VALUE IF NOT EXISTS 'HOME_DECOR';
ALTER TYPE "public"."ProductCategory" ADD VALUE IF NOT EXISTS 'ART';
ALTER TYPE "public"."ProductCategory" ADD VALUE IF NOT EXISTS 'JEWELRY';
ALTER TYPE "public"."ProductCategory" ADD VALUE IF NOT EXISTS 'PET_SUPPLIES';
ALTER TYPE "public"."ProductCategory" ADD VALUE IF NOT EXISTS 'AUTOMOTIVE';
ALTER TYPE "public"."ProductCategory" ADD VALUE IF NOT EXISTS 'DIGITAL';

-- Add new StoreCategory enum values (already applied, documenting for migration history)
ALTER TYPE "public"."StoreCategory" ADD VALUE IF NOT EXISTS 'FASHION_APPAREL';
ALTER TYPE "public"."StoreCategory" ADD VALUE IF NOT EXISTS 'BEAUTY_WELLNESS';
ALTER TYPE "public"."StoreCategory" ADD VALUE IF NOT EXISTS 'TECH_ELECTRONICS';
ALTER TYPE "public"."StoreCategory" ADD VALUE IF NOT EXISTS 'ARTS_CRAFTS';
ALTER TYPE "public"."StoreCategory" ADD VALUE IF NOT EXISTS 'BOOKS_MEDIA';
ALTER TYPE "public"."StoreCategory" ADD VALUE IF NOT EXISTS 'SPORTS_FITNESS';
ALTER TYPE "public"."StoreCategory" ADD VALUE IF NOT EXISTS 'PETS';
ALTER TYPE "public"."StoreCategory" ADD VALUE IF NOT EXISTS 'TOYS_GAMES';
