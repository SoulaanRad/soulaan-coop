/**
 * Seed script for store and product categories
 *
 * Run with: npx ts-node scripts/seed-categories.ts
 * Or: pnpm tsx scripts/seed-categories.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STORE_CATEGORIES = [
  { key: "FOOD_BEVERAGE", label: "Food & Beverage", isAdminOnly: false, sortOrder: 1 },
  { key: "RETAIL", label: "Retail", isAdminOnly: false, sortOrder: 2 },
  { key: "SERVICES", label: "Services", isAdminOnly: false, sortOrder: 3 },
  { key: "HEALTH_WELLNESS", label: "Health & Wellness", isAdminOnly: false, sortOrder: 4 },
  { key: "ENTERTAINMENT", label: "Entertainment", isAdminOnly: false, sortOrder: 5 },
  { key: "EDUCATION", label: "Education", isAdminOnly: false, sortOrder: 6 },
  { key: "PROFESSIONAL", label: "Professional Services", isAdminOnly: false, sortOrder: 7 },
  { key: "HOME_GARDEN", label: "Home & Garden", isAdminOnly: false, sortOrder: 8 },
  { key: "AUTOMOTIVE", label: "Automotive", isAdminOnly: false, sortOrder: 9 },
  { key: "FOUNDER_PACKAGE", label: "Founder Package", isAdminOnly: true, sortOrder: 100 },
  { key: "OTHER", label: "Other", isAdminOnly: false, sortOrder: 99 },
];

const PRODUCT_CATEGORIES = [
  { key: "FOOD", label: "Food", isAdminOnly: false, sortOrder: 1 },
  { key: "BEVERAGES", label: "Beverages", isAdminOnly: false, sortOrder: 2 },
  { key: "CLOTHING", label: "Clothing", isAdminOnly: false, sortOrder: 3 },
  { key: "ELECTRONICS", label: "Electronics", isAdminOnly: false, sortOrder: 4 },
  { key: "HOME", label: "Home", isAdminOnly: false, sortOrder: 5 },
  { key: "BEAUTY", label: "Beauty", isAdminOnly: false, sortOrder: 6 },
  { key: "HEALTH", label: "Health", isAdminOnly: false, sortOrder: 7 },
  { key: "SPORTS", label: "Sports", isAdminOnly: false, sortOrder: 8 },
  { key: "TOYS", label: "Toys", isAdminOnly: false, sortOrder: 9 },
  { key: "BOOKS", label: "Books", isAdminOnly: false, sortOrder: 10 },
  { key: "SERVICES", label: "Services", isAdminOnly: false, sortOrder: 11 },
  { key: "FOUNDER_BADGES", label: "Founder Badges", isAdminOnly: true, sortOrder: 100 },
  { key: "OTHER", label: "Other", isAdminOnly: false, sortOrder: 99 },
];

async function seedCategories() {
  console.log("Seeding store categories...");

  for (const category of STORE_CATEGORIES) {
    await prisma.storeCategoryConfig.upsert({
      where: { key: category.key },
      update: {
        label: category.label,
        isAdminOnly: category.isAdminOnly,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        key: category.key,
        label: category.label,
        isAdminOnly: category.isAdminOnly,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
    console.log(`  ✓ ${category.key}${category.isAdminOnly ? " (admin only)" : ""}`);
  }

  console.log("\nSeeding product categories...");

  for (const category of PRODUCT_CATEGORIES) {
    await prisma.productCategoryConfig.upsert({
      where: { key: category.key },
      update: {
        label: category.label,
        isAdminOnly: category.isAdminOnly,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        key: category.key,
        label: category.label,
        isAdminOnly: category.isAdminOnly,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
    console.log(`  ✓ ${category.key}${category.isAdminOnly ? " (admin only)" : ""}`);
  }

  console.log("\n✅ Categories seeded successfully!");
}

seedCategories()
  .catch((e) => {
    console.error("Error seeding categories:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
