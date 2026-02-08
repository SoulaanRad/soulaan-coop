/**
 * Seed script to populate category configuration tables
 * with the existing enum values
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STORE_CATEGORIES = [
  { key: 'FOUNDER_PACKAGE', label: 'Founder Package', isAdminOnly: true, sortOrder: 0 },
  { key: 'FOOD_BEVERAGE', label: 'Food & Beverage', sortOrder: 1 },
  { key: 'RETAIL', label: 'Retail', sortOrder: 2 },
  { key: 'SERVICES', label: 'Services', sortOrder: 3 },
  { key: 'HEALTH_WELLNESS', label: 'Health & Wellness', sortOrder: 4 },
  { key: 'ENTERTAINMENT', label: 'Entertainment', sortOrder: 5 },
  { key: 'EDUCATION', label: 'Education', sortOrder: 6 },
  { key: 'PROFESSIONAL', label: 'Professional', sortOrder: 7 },
  { key: 'HOME_GARDEN', label: 'Home & Garden', sortOrder: 8 },
  { key: 'AUTOMOTIVE', label: 'Automotive', sortOrder: 9 },
  { key: 'OTHER', label: 'Other', sortOrder: 99 },
];

const PRODUCT_CATEGORIES = [
  { key: 'FOOD', label: 'Food', sortOrder: 1 },
  { key: 'BEVERAGES', label: 'Beverages', sortOrder: 2 },
  { key: 'CLOTHING', label: 'Clothing', sortOrder: 3 },
  { key: 'ELECTRONICS', label: 'Electronics', sortOrder: 4 },
  { key: 'HOME', label: 'Home', sortOrder: 5 },
  { key: 'BEAUTY', label: 'Beauty', sortOrder: 6 },
  { key: 'HEALTH', label: 'Health', sortOrder: 7 },
  { key: 'SPORTS', label: 'Sports', sortOrder: 8 },
  { key: 'TOYS', label: 'Toys', sortOrder: 9 },
  { key: 'BOOKS', label: 'Books', sortOrder: 10 },
  { key: 'SERVICES', label: 'Services', sortOrder: 11 },
  { key: 'FOUNDER_BADGES', label: 'Founder Badges', isAdminOnly: true, sortOrder: 100 },
  { key: 'OTHER', label: 'Other', sortOrder: 99 },
];

async function main() {
  console.log('🚀 Seeding category configurations...\n');

  // Seed store categories
  console.log('🏪 Seeding store categories...');
  for (const cat of STORE_CATEGORIES) {
    await prisma.storeCategoryConfig.upsert({
      where: { key: cat.key },
      update: {
        label: cat.label,
        sortOrder: cat.sortOrder,
        isAdminOnly: cat.isAdminOnly || false,
      },
      create: {
        key: cat.key,
        label: cat.label,
        isAdminOnly: cat.isAdminOnly || false,
        isActive: true,
        sortOrder: cat.sortOrder,
      },
    });
    console.log(`   ✅ ${cat.label}${cat.isAdminOnly ? ' (Admin Only)' : ''}`);
  }

  // Seed product categories
  console.log('\n📦 Seeding product categories...');
  for (const cat of PRODUCT_CATEGORIES) {
    await prisma.productCategoryConfig.upsert({
      where: { key: cat.key },
      update: {
        label: cat.label,
        sortOrder: cat.sortOrder,
        isAdminOnly: cat.isAdminOnly || false,
      },
      create: {
        key: cat.key,
        label: cat.label,
        isAdminOnly: cat.isAdminOnly || false,
        isActive: true,
        sortOrder: cat.sortOrder,
      },
    });
    console.log(`   ✅ ${cat.label}${cat.isAdminOnly ? ' (Admin Only)' : ''}`);
  }

  console.log('\n🎉 Category seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
