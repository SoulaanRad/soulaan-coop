-- Seed default store categories
INSERT INTO "StoreCategoryConfig" ("id", "key", "label", "isAdminOnly", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('store_cat_food', 'FOOD_BEVERAGE', 'Food & Beverage', false, true, 1, NOW(), NOW()),
  ('store_cat_fashion', 'FASHION_APPAREL', 'Fashion & Apparel', false, true, 2, NOW(), NOW()),
  ('store_cat_beauty', 'BEAUTY_WELLNESS', 'Beauty & Wellness', false, true, 3, NOW(), NOW()),
  ('store_cat_home', 'HOME_GARDEN', 'Home & Garden', false, true, 4, NOW(), NOW()),
  ('store_cat_tech', 'TECH_ELECTRONICS', 'Tech & Electronics', false, true, 5, NOW(), NOW()),
  ('store_cat_arts', 'ARTS_CRAFTS', 'Arts & Crafts', false, true, 6, NOW(), NOW()),
  ('store_cat_services', 'SERVICES', 'Services', false, true, 7, NOW(), NOW()),
  ('store_cat_books', 'BOOKS_MEDIA', 'Books & Media', false, true, 8, NOW(), NOW()),
  ('store_cat_sports', 'SPORTS_FITNESS', 'Sports & Fitness', false, true, 9, NOW(), NOW()),
  ('store_cat_auto', 'AUTOMOTIVE', 'Automotive', false, true, 10, NOW(), NOW()),
  ('store_cat_pets', 'PETS', 'Pets', false, true, 11, NOW(), NOW()),
  ('store_cat_toys', 'TOYS_GAMES', 'Toys & Games', false, true, 12, NOW(), NOW()),
  ('store_cat_other', 'OTHER', 'Other', false, true, 99, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- Seed default product categories
INSERT INTO "ProductCategoryConfig" ("id", "key", "label", "isAdminOnly", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('prod_cat_food', 'FOOD', 'Food', false, true, 1, NOW(), NOW()),
  ('prod_cat_beverages', 'BEVERAGES', 'Beverages', false, true, 2, NOW(), NOW()),
  ('prod_cat_clothing', 'CLOTHING', 'Clothing', false, true, 3, NOW(), NOW()),
  ('prod_cat_accessories', 'ACCESSORIES', 'Accessories', false, true, 4, NOW(), NOW()),
  ('prod_cat_beauty', 'BEAUTY', 'Beauty Products', false, true, 5, NOW(), NOW()),
  ('prod_cat_health', 'HEALTH', 'Health & Wellness', false, true, 6, NOW(), NOW()),
  ('prod_cat_home', 'HOME_DECOR', 'Home Decor', false, true, 7, NOW(), NOW()),
  ('prod_cat_electronics', 'ELECTRONICS', 'Electronics', false, true, 8, NOW(), NOW()),
  ('prod_cat_books', 'BOOKS', 'Books', false, true, 9, NOW(), NOW()),
  ('prod_cat_art', 'ART', 'Art & Prints', false, true, 10, NOW(), NOW()),
  ('prod_cat_jewelry', 'JEWELRY', 'Jewelry', false, true, 11, NOW(), NOW()),
  ('prod_cat_sports', 'SPORTS', 'Sports Equipment', false, true, 12, NOW(), NOW()),
  ('prod_cat_toys', 'TOYS', 'Toys', false, true, 13, NOW(), NOW()),
  ('prod_cat_pet', 'PET_SUPPLIES', 'Pet Supplies', false, true, 14, NOW(), NOW()),
  ('prod_cat_auto', 'AUTOMOTIVE', 'Automotive', false, true, 15, NOW(), NOW()),
  ('prod_cat_digital', 'DIGITAL', 'Digital Products', false, true, 16, NOW(), NOW()),
  ('prod_cat_services', 'SERVICES', 'Services', false, true, 17, NOW(), NOW()),
  ('prod_cat_other', 'OTHER', 'Other', false, true, 99, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
