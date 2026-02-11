# Portal Store/Product Categories Implementation

## Summary

Successfully implemented backend-managed store and product categories with admin-only visibility flags, full mobile and web portal parity for store/product management, and seeded the Soulaan Official Store with Founder Badge products.

## Changes Made

### 1. Database Schema (`packages/db/prisma/schema.prisma`)

Added two new tables for category management:

- **StoreCategoryConfig**: Manages store categories with admin-only flags
- **ProductCategoryConfig**: Manages product categories with admin-only flags
- Added `FOUNDER_BADGES` to the ProductCategory enum

Both tables include:
- `key`: Unique identifier (e.g., "FOOD_BEVERAGE", "FOUNDER_BADGES")
- `label`: Display name (e.g., "Food & Beverage", "Founder Badges")
- `isAdminOnly`: Boolean flag for admin-restricted categories
- `isActive`: Enable/disable categories
- `sortOrder`: Control display order

### 2. Backend API (`packages/trpc/src/routers/`)

#### New Categories Router (`categories.ts`)
- `getStoreCategories`: Public endpoint with optional `includeAdminOnly` parameter
- `getProductCategories`: Public endpoint with optional `includeAdminOnly` parameter
- `createStoreCategory`: Admin-only category creation
- `createProductCategory`: Admin-only category creation
- `updateStoreCategory`: Admin-only category updates
- `updateProductCategory`: Admin-only category updates

#### Updated Store Router (`store.ts`)
- Modified `addProduct` to check for admin-only categories and block non-admin users
- Added `createStoreAdmin`: Admin-only store creation (bypasses application process)
- Added `addProductAdmin`: Admin-only product creation (can use admin-only categories)

### 3. Mobile App (`apps/mobile/`)

Updated all mobile screens to use dynamic backend categories:

- **apply-store.tsx**: Fetches store categories from API (excludes admin-only)
- **add-product.tsx**: Fetches product categories from API (excludes admin-only for creation, includes for viewing)
- **store-detail.tsx**: Uses dynamic categories for product filtering
- **my-store.tsx**: Uses dynamic categories for display
- **lib/api.ts**: Added `getStoreCategories()` and `getProductCategories()` API calls

### 4. Web Portal (`apps/web/`)

Added full store and product management capabilities:

#### New Components
- **create-store-dialog.tsx**: Dialog for creating stores (admin only)
  - Fetches categories from backend with admin-only options
  - Creates stores directly in APPROVED status
  
- **create-product-dialog.tsx**: Dialog for adding products to stores (admin only)
  - Fetches all product categories including admin-only
  - Can create products in any category including Founder Badges

#### Updated Portal Stores Page
- Added "Create Store" button in header
- Added "Add Product" button in each store's product panel
- Both use the new admin-only tRPC endpoints

### 5. Seed Scripts (`scripts/`)

#### seed-founder-badges.ts
Creates:
1. Backend wallet user (if doesn't exist)
2. Soulaan Official Store (owned by backend wallet user)
3. Founder Badge category configuration (admin-only)
4. Six Founder Badge products:
   - Seed Founder Badge: $500
   - Growth Founder Badge: $1,000
   - Builder Founder Badge: $5,000
   - Pillar Founder Badge: $25,000
   - Cornerstone Founder Badge: $100,000
   - Legacy Founder Badge: $500,000

#### seed-categories.ts
Populates all category configuration tables with existing enum values:
- 10 store categories
- 13 product categories (including Founder Badges as admin-only)

## Key Features

### Admin-Only Categories
- **Founder Badges** is marked as admin-only in the product category config
- Mobile users can VIEW products in admin-only categories but cannot CREATE them
- Web portal admins can create products in any category including admin-only ones
- The restriction is enforced at the API level in the `addProduct` procedure

### Category Management
- All categories are now managed in the database rather than hardcoded
- Categories can be enabled/disabled without code changes
- New categories can be added via admin API endpoints
- Sort order is configurable

### Store/Product Creation Parity
- Mobile: Users can apply for stores and add products (non-admin categories only)
- Web Portal: Admins can create stores directly and add products in any category
- Both use the same backend category source of truth

## Database Changes Applied

```bash
# Schema changes pushed to database
pnpm prisma db push --accept-data-loss

# Prisma client regenerated
pnpm prisma generate

# Categories seeded
npx tsx scripts/seed-categories.ts

# Founder badges seeded
npx tsx scripts/seed-founder-badges.ts
```

## Verification

- ✅ All TypeScript compilation successful
- ✅ No linting errors
- ✅ Database schema updated
- ✅ Seed scripts executed successfully
- ✅ Soulaan Official Store created with 6 Founder Badge products
- ✅ All category configurations populated

## Usage

### For Mobile Users
- Categories are fetched dynamically from the backend
- Admin-only categories are hidden from creation dropdowns
- Admin-only products (Founder Badges) are visible in stores and filters

### For Portal Admins
- Use "Create Store" button to create stores directly
- Use "Add Product" button in store panels to add products
- Can select any category including "Founder Badges (Admin Only)"
- Stores created via portal are auto-approved

### Backend Wallet
- Address: `0x89590b9173d8166fccc3d77ca133a295c4d5b6cd`
- User ID: Created by seed script
- Email: `backend@soulaan.coop`
- Owns: Soulaan Official Store

## Future Enhancements

- Add category icons/images
- Add category descriptions
- Implement category-based permissions (beyond just admin-only)
- Add analytics per category
- Allow multiple admin-only flags (e.g., "verified_only", "premium_only")
