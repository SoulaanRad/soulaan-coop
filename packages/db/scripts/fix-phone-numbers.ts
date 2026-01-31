/**
 * Script to fix phone numbers in the database:
 * 1. Format all phone numbers to E.164 format (+1XXXXXXXXXX)
 * 2. Find duplicates and assign random phone numbers to extras
 *
 * Run with: npx tsx scripts/fix-phone-numbers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Convert a phone number to E.164 format
 * Assumes US numbers if no country code provided
 */
function toE164(phone: string | null): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If it starts with +, keep it
  if (cleaned.startsWith('+')) {
    // Already has country code, just ensure it's valid
    return cleaned;
  }

  // Remove leading 1 if present (US country code without +)
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  // If it's 10 digits, assume US and add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // If it's 11 digits starting with 1, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // Otherwise return with + prefix (assume international)
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }

  return cleaned;
}

/**
 * Generate a random US phone number in E.164 format
 */
function generateRandomPhone(): string {
  // Generate random 10-digit US number
  // Area code: 200-999 (first digit can't be 0 or 1)
  const areaCode = Math.floor(Math.random() * 800) + 200;
  // Exchange: 200-999
  const exchange = Math.floor(Math.random() * 800) + 200;
  // Subscriber: 0000-9999
  const subscriber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  return `+1${areaCode}${exchange}${subscriber}`;
}

async function main() {
  console.log('Starting phone number fix...\n');

  // Step 1: Get all users with phone numbers
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
    },
  });

  console.log(`Found ${users.length} users total\n`);

  // Step 2: Format all phone numbers to E.164
  console.log('Step 1: Formatting phone numbers to E.164...');
  let formattedCount = 0;

  for (const user of users) {
    if (user.phone) {
      const formatted = toE164(user.phone);
      if (formatted !== user.phone) {
        await prisma.user.update({
          where: { id: user.id },
          data: { phone: formatted },
        });
        console.log(`  ${user.email}: "${user.phone}" -> "${formatted}"`);
        formattedCount++;
      }
    }
  }

  console.log(`Formatted ${formattedCount} phone numbers\n`);

  // Step 3: Find duplicates
  console.log('Step 2: Finding duplicate phone numbers...');

  // Re-fetch users after formatting
  const updatedUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc', // Keep the oldest one with the original number
    },
  });

  // Group by phone number
  const phoneGroups = new Map<string, typeof updatedUsers>();

  for (const user of updatedUsers) {
    if (user.phone) {
      const existing = phoneGroups.get(user.phone) || [];
      existing.push(user);
      phoneGroups.set(user.phone, existing);
    }
  }

  // Find groups with more than 1 user (duplicates)
  const duplicates: Array<{ phone: string; users: typeof updatedUsers }> = [];

  for (const [phone, usersWithPhone] of phoneGroups) {
    if (usersWithPhone.length > 1) {
      duplicates.push({ phone, users: usersWithPhone });
    }
  }

  console.log(`Found ${duplicates.length} duplicate phone numbers\n`);

  // Step 4: Fix duplicates by assigning random numbers to all but the first (oldest)
  if (duplicates.length > 0) {
    console.log('Step 3: Fixing duplicates...');

    // Collect all existing phone numbers to avoid generating duplicates
    const existingPhones = new Set<string>();
    for (const user of updatedUsers) {
      if (user.phone) {
        existingPhones.add(user.phone);
      }
    }

    for (const { phone, users: usersWithPhone } of duplicates) {
      console.log(`\n  Duplicate phone: ${phone} (${usersWithPhone.length} users)`);

      // Keep the first (oldest) user's phone number
      const [keeper, ...others] = usersWithPhone;
      console.log(`    Keeping: ${keeper.email}`);

      // Assign random phone numbers to the others
      for (const user of others) {
        let newPhone: string;
        do {
          newPhone = generateRandomPhone();
        } while (existingPhones.has(newPhone));

        existingPhones.add(newPhone);

        await prisma.user.update({
          where: { id: user.id },
          data: { phone: newPhone },
        });

        console.log(`    Changed: ${user.email} -> ${newPhone}`);
      }
    }
  }

  // Step 5: Also fix UserProfile phone numbers
  console.log('\nStep 4: Formatting UserProfile phone numbers...');

  const profiles = await prisma.userProfile.findMany({
    select: {
      id: true,
      walletAddress: true,
      phoneNumber: true,
    },
  });

  let profilesFormatted = 0;
  for (const profile of profiles) {
    const formatted = toE164(profile.phoneNumber);
    if (formatted && formatted !== profile.phoneNumber) {
      await prisma.userProfile.update({
        where: { id: profile.id },
        data: { phoneNumber: formatted },
      });
      console.log(`  ${profile.walletAddress}: "${profile.phoneNumber}" -> "${formatted}"`);
      profilesFormatted++;
    }
  }

  console.log(`Formatted ${profilesFormatted} UserProfile phone numbers\n`);

  // Final summary
  console.log('='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total users: ${users.length}`);
  console.log(`Phone numbers formatted: ${formattedCount}`);
  console.log(`Duplicate groups fixed: ${duplicates.length}`);
  console.log(`UserProfile phones formatted: ${profilesFormatted}`);
  console.log('\nDone! You can now add @unique constraint to the phone field.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
