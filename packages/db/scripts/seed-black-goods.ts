/**
 * Seed script: Create Black Goods store + products on production
 *
 * Usage (local .env pointing to prod DB):
 *   pnpm --filter @repo/db with-env ts-node --transpile-only scripts/seed-black-goods.ts
 *
 * Or with an explicit DATABASE_URL:
 *   DATABASE_URL="postgresql://..." ts-node --transpile-only scripts/seed-black-goods.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const COOP_ID = 'soulaan';

// Set to the email of the store owner's account in prod.
// If null, the script will use the first admin/active user it finds.
const OWNER_EMAIL: string | null = null;

const STORE = {
  name: 'Black Goods',
  description: 'Quality goods from Black-owned producers, curated for the Soulaan community.',
  category: 'RETAIL',
  shortCode: 'BLACK-GOODS',
  imageUrl: '',         // paste a store logo URL here
  bannerUrl: '',        // paste a banner URL here
  address: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  email: '',
  website: '',
  acceptsQuickPay: true,
  acceptsUC: true,
  ucDiscountPercent: 20,
  isScVerified: false,
  status: 'APPROVED' as const,
  isFeatured: true,
};

// Fill in the actual products. Each entry maps directly to the Product model.
// priceUSD is required. All other fields are optional.
const PRODUCTS: Array<{
  name: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  images?: string[];
  priceUSD: number;
  compareAtPrice?: number;
  sku?: string;
  quantity: number;
  trackInventory: boolean;
  isActive: boolean;
  isFeatured: boolean;
  sourceUrl?: string; // URL this product was imported from
}> = [
  // ── Add your products here ──────────────────────────────────────────────
  // Example:
  // {
  //   name: 'Product Name',
  //   description: 'Product description',
  //   category: 'FOOD',       // any string label works
  //   imageUrl: 'https://...',
  //   priceUSD: 12.99,
  //   compareAtPrice: 16.99,  // optional "was" price
  //   sku: 'BG-001',
  //   quantity: 50,
  //   trackInventory: true,
  //   isActive: true,
  //   isFeatured: true,
  //   sourceUrl: 'https://blackgoods.com/products/product-name',
  // },
];

// ─────────────────────────────────────────────────────────────────────────────

async function findOwner() {
  if (OWNER_EMAIL) {
    const user = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
    if (!user) throw new Error(`No user found with email: ${OWNER_EMAIL}`);
    return user;
  }

  // Fall back: first active user with a wallet
  const user = await prisma.user.findFirst({
    where: { status: 'ACTIVE', walletAddress: { not: null } },
    orderBy: { createdAt: 'asc' },
  });

  if (!user) throw new Error('No active user with a wallet found. Set OWNER_EMAIL at the top of this script.');
  return user;
}

async function main() {
  console.log('🌱 Seeding Black Goods store...\n');
  console.log(`📡 DB: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}\n`);

  if (PRODUCTS.length === 0) {
    console.warn('⚠️  PRODUCTS array is empty. Fill it in at the top of this script before running.');
    console.warn('   The store will still be created, but with no products.\n');
  }

  const owner = await findOwner();
  console.log(`👤 Store owner: ${owner.name ?? owner.email} (${owner.id})`);

  // ── Create or find the store ─────────────────────────────────────────────
  const existingStore = await prisma.store.findFirst({
    where: { coopId: COOP_ID, name: STORE.name },
    include: { products: { select: { id: true } } },
  });

  let storeId: string;

  if (existingStore) {
    storeId = existingStore.id;
    console.log(`\n✅ Store already exists: ${existingStore.name} (${existingStore.id})`);
    console.log(`   Products in DB: ${existingStore.products.length}`);
  } else {
    const store = await prisma.store.create({
      data: {
        ownerId: owner.id,
        coopId: COOP_ID,
        ...STORE,
      },
    });
    storeId = store.id;
    console.log(`\n🏪 Created store: ${store.name}`);
    console.log(`   ID: ${store.id}`);
    console.log(`   Short Code: ${store.shortCode}`);
  }

  // ── Upsert products (match by SKU if provided, else by name) ─────────────
  if (PRODUCTS.length > 0) {
    console.log(`\n📦 Upserting ${PRODUCTS.length} product(s)...`);

    for (const p of PRODUCTS) {
      const where = p.sku
        ? { storeId_sku: { storeId, sku: p.sku } }
        : undefined;

      const existing = where
        ? await prisma.product.findUnique({ where })
        : await prisma.product.findFirst({ where: { storeId, name: p.name } });

      if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data: p });
        console.log(`   ↻ Updated: ${p.name} — $${p.priceUSD.toFixed(2)}`);
      } else {
        await prisma.product.create({ data: { storeId, ...p } });
        console.log(`   ✓ Created: ${p.name} — $${p.priceUSD.toFixed(2)}`);
      }
    }
  }

  const totalProducts = await prisma.product.count({ where: { storeId } });

  console.log('\n✅ Done!');
  console.log('─'.repeat(50));
  console.log(`Store:    ${STORE.name}`);
  console.log(`Store ID: ${storeId}`);
  console.log(`Coop:     ${COOP_ID}`);
  console.log(`Products: ${totalProducts}`);
  console.log(`Status:   ${STORE.status}`);
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
