/**
 * Backfill script for coop scoping migration
 * 
 * This script:
 * 1. Creates UserCoopMembership records for existing users with approved applications
 * 2. Ensures all existing data has coopId = 'soulaan' (default)
 * 3. Creates a default CoopChainConfig for 'soulaan' if not exists
 */

import { db } from '../index';

const DEFAULT_COOP_ID = 'soulaan';

async function backfillCoopScoping() {
  console.log('🚀 Starting coop scoping backfill...\n');

  try {
    // Step 1: Create default CoopChainConfig if not exists
    console.log('📝 Checking for default CoopChainConfig...');
    const existingConfig = await db.coopChainConfig.findUnique({
      where: { coopId: DEFAULT_COOP_ID },
    });

    if (!existingConfig) {
      console.log('⚠️  No CoopChainConfig found for soulaan, creating from env...');
      
      const scTokenAddress = process.env.SOULAANI_COIN_ADDRESS || '0x0000000000000000000000000000000000000000';
      const ucTokenAddress = process.env.UNITY_COIN_ADDRESS || '0x0000000000000000000000000000000000000000';
      const redemptionVaultAddress = process.env.REDEMPTION_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000';
      const treasurySafeAddress = process.env.TREASURY_SAFE_ADDRESS || '0x0000000000000000000000000000000000000000';
      const verifiedStoreRegistryAddress = process.env.VERIFIED_STORE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000';
      const storePaymentRouterAddress = process.env.STORE_PAYMENT_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000';
      const rewardEngineAddress = process.env.SC_REWARD_ENGINE_ADDRESS || '0x0000000000000000000000000000000000000000';

      if (scTokenAddress === '0x0000000000000000000000000000000000000000') {
        console.warn('⚠️  Warning: Using placeholder contract addresses. Update CoopChainConfig with real addresses.');
      }

      await db.coopChainConfig.create({
        data: {
          coopId: DEFAULT_COOP_ID,
          chainId: 84532, // Base Sepolia
          chainName: 'Base Sepolia',
          rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
          scTokenAddress,
          ucTokenAddress,
          redemptionVaultAddress,
          treasurySafeAddress,
          verifiedStoreRegistryAddress,
          storePaymentRouterAddress,
          rewardEngineAddress,
          scTokenSymbol: 'SC',
          scTokenName: 'SoulaaniCoin',
          isActive: true,
          createdBy: 'system-backfill',
        },
      });

      console.log('✅ Created default CoopChainConfig for soulaan');
    } else {
      console.log('✅ CoopChainConfig already exists for soulaan');
    }

    // Step 2: Create UserCoopMembership records for users with approved applications
    console.log('\n📝 Creating UserCoopMembership records...');
    
    const approvedApplications = await db.application.findMany({
      where: {
        status: 'APPROVED',
        coopId: DEFAULT_COOP_ID,
      },
      include: {
        user: true,
      },
    });

    console.log(`   Found ${approvedApplications.length} approved applications`);

    let created = 0;
    let skipped = 0;

    for (const application of approvedApplications) {
      // Check if membership already exists
      const existingMembership = await db.userCoopMembership.findUnique({
        where: {
          userId_coopId: {
            userId: application.userId,
            coopId: application.coopId,
          },
        },
      });

      if (existingMembership) {
        skipped++;
        continue;
      }

      // Create membership record
      await db.userCoopMembership.create({
        data: {
          userId: application.userId,
          coopId: application.coopId,
          status: 'ACTIVE',
          roles: application.user.roles,
          approvedBy: application.reviewedBy || 'system-backfill',
          approvedAt: application.reviewedAt || application.updatedAt,
          joinedAt: application.reviewedAt || application.updatedAt,
        },
      });

      created++;
    }

    console.log(`   ✅ Created ${created} membership records`);
    console.log(`   ⏭️  Skipped ${skipped} existing records`);

    // Step 3: Create membership records for rejected applications
    console.log('\n📝 Creating UserCoopMembership records for rejected applications...');
    
    const rejectedApplications = await db.application.findMany({
      where: {
        status: 'REJECTED',
        coopId: DEFAULT_COOP_ID,
      },
    });

    console.log(`   Found ${rejectedApplications.length} rejected applications`);

    let rejectedCreated = 0;
    let rejectedSkipped = 0;

    for (const application of rejectedApplications) {
      // Check if membership already exists
      const existingMembership = await db.userCoopMembership.findUnique({
        where: {
          userId_coopId: {
            userId: application.userId,
            coopId: application.coopId,
          },
        },
      });

      if (existingMembership) {
        rejectedSkipped++;
        continue;
      }

      // Create membership record
      await db.userCoopMembership.create({
        data: {
          userId: application.userId,
          coopId: application.coopId,
          status: 'REJECTED',
          rejectedBy: application.reviewedBy || 'system-backfill',
          rejectedAt: application.reviewedAt || application.updatedAt,
          rejectionReason: application.reviewNotes,
        },
      });

      rejectedCreated++;
    }

    console.log(`   ✅ Created ${rejectedCreated} rejected membership records`);
    console.log(`   ⏭️  Skipped ${rejectedSkipped} existing records`);

    // Step 4: Verify data integrity
    console.log('\n🔍 Verifying data integrity...');
    
    const totalApplications = await db.application.count();
    const totalMemberships = await db.userCoopMembership.count();

    console.log(`   Total applications: ${totalApplications}`);
    console.log(`   Total memberships: ${totalMemberships}`);

    console.log('\n✅ Backfill completed successfully!');
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    throw error;
  }
}

// Run the backfill
backfillCoopScoping()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
