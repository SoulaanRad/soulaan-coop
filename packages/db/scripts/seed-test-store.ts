/**
 * Seed script to create a test store with products for local development
 *
 * Usage: npx tsx scripts/seed-test-store.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test store and products...\n');

  // Find the first active user with a wallet to be the store owner
  // Or create a test user if none exists
  let storeOwner = await prisma.user.findFirst({
    where: {
      status: 'ACTIVE',
      walletAddress: { not: null },
    },
  });

  if (!storeOwner) {
    console.log('No active user found. Looking for any user with a wallet...');
    storeOwner = await prisma.user.findFirst({
      where: {
        walletAddress: { not: null },
      },
    });
  }

  if (!storeOwner) {
    console.log('❌ No user with a wallet found. Please create a user first.');
    console.log('   Run the app and complete registration to create a user.');
    return;
  }

  console.log(`👤 Using store owner: ${storeOwner.name || storeOwner.email}`);
  console.log(`   Wallet: ${storeOwner.walletAddress}\n`);

  // Check if test store already exists
  const existingStore = await prisma.store.findFirst({
    where: {
      name: "Soulaan Test Store",
      ownerId: storeOwner.id,
    },
  });

  if (existingStore) {
    console.log('✅ Test store already exists:', existingStore.name);
    console.log('   Store ID:', existingStore.id);

    // Check products
    const productCount = await prisma.product.count({
      where: { storeId: existingStore.id },
    });
    console.log(`   Products: ${productCount}`);
    return;
  }

  // Create test store
  const store = await prisma.store.create({
    data: {
      ownerId: storeOwner.id,
      name: "Soulaan Test Store",
      description: "A test store for development and testing purposes. All products are for testing only.",
      category: "RETAIL",
      imageUrl: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400",
      bannerUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
      shortCode: "TEST001",
      acceptsQuickPay: true,
      address: "123 Test Street",
      city: "Atlanta",
      state: "GA",
      zipCode: "30301",
      phone: "+14045551234",
      email: "test@soulaan.com",
      isScVerified: true,
      scVerifiedAt: new Date(),
      acceptsUC: true,
      ucDiscountPercent: 20,
      communityCommitmentPercent: 10,
      status: "APPROVED",
      isFeatured: true,
    },
  });

  console.log('🏪 Created test store:', store.name);
  console.log('   Store ID:', store.id);
  console.log('   Short Code:', store.shortCode);

  // Create test products
  const products = [
    {
      name: "Test Coffee Mug",
      description: "A beautiful ceramic mug for your morning coffee. Perfect for testing the checkout flow.",
      category: "HOME" as const,
      imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400",
      priceUSD: 15.99,
      quantity: 100,
      trackInventory: true,
      isActive: true,
      isFeatured: true,
    },
    {
      name: "Community T-Shirt",
      description: "Show your support for the community with this comfortable cotton t-shirt.",
      category: "CLOTHING" as const,
      imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
      priceUSD: 25.00,
      quantity: 50,
      trackInventory: true,
      isActive: true,
      isFeatured: true,
    },
    {
      name: "Organic Honey (16oz)",
      description: "Pure, raw organic honey sourced from local beekeepers.",
      category: "FOOD" as const,
      imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400",
      priceUSD: 12.50,
      quantity: 30,
      trackInventory: true,
      isActive: true,
      isFeatured: false,
    },
    {
      name: "Handmade Candle Set",
      description: "Set of 3 soy wax candles with natural fragrances. Burns for 40+ hours each.",
      category: "HOME" as const,
      imageUrl: "https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=400",
      priceUSD: 35.00,
      quantity: 25,
      trackInventory: true,
      isActive: true,
      isFeatured: false,
    },
    {
      name: "Test Item ($1)",
      description: "A $1 test item for quick checkout testing. Does not ship - for testing only.",
      category: "OTHER" as const,
      imageUrl: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400",
      priceUSD: 1.00,
      quantity: 999,
      trackInventory: false,
      isActive: true,
      isFeatured: true,
    },
  ];

  console.log('\n📦 Creating products...');

  for (const productData of products) {
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        ...productData,
      },
    });
    console.log(`   ✓ ${product.name} - $${product.priceUSD.toFixed(2)}`);
  }

  console.log('\n✅ Seed complete!');
  console.log('\n📋 Summary:');
  console.log(`   Store: ${store.name}`);
  console.log(`   Store ID: ${store.id}`);
  console.log(`   Short Code: ${store.shortCode}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Owner: ${storeOwner.name || storeOwner.email}`);
  console.log('\n🛒 You can now browse the store and test purchasing!');
}

main()
  .catch((e) => {
    console.error('Error seeding test store:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
