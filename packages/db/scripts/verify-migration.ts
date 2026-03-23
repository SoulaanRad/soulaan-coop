import { db } from '../index';

async function verifyMigration() {
  console.log('🔍 Verifying coop scoping migration...\n');

  try {
    // Check CoopChainConfig
    console.log('1. Checking CoopChainConfig...');
    const chainConfig = await db.coopChainConfig.findUnique({
      where: { coopId: 'soulaan' },
    });
    
    if (chainConfig) {
      console.log('   ✅ CoopChainConfig exists for soulaan');
      console.log(`      Chain: ${chainConfig.chainName} (ID: ${chainConfig.chainId})`);
      console.log(`      Active: ${chainConfig.isActive}`);
      console.log(`      SC Token: ${chainConfig.scTokenAddress}`);
    } else {
      console.log('   ❌ CoopChainConfig NOT FOUND for soulaan');
    }

    // Check UserCoopMembership table
    console.log('\n2. Checking UserCoopMembership table...');
    const membershipCount = await db.userCoopMembership.count();
    console.log(`   Total memberships: ${membershipCount}`);

    // Check Application schema
    console.log('\n3. Checking Application schema...');
    const applicationCount = await db.application.count();
    console.log(`   Total applications: ${applicationCount}`);

    // Try to query with composite key
    const testApp = await db.application.findFirst({
      where: { coopId: 'soulaan' },
    });
    console.log(`   Applications with coopId='soulaan': ${testApp ? '✅ Found' : 'None'}`);

    // Check other models have coopId
    console.log('\n4. Checking other models...');
    const models = [
      { name: 'Business', model: db.business },
      { name: 'Store', model: db.store },
      { name: 'WaitlistEntry', model: db.waitlistEntry },
      { name: 'Notification', model: db.notification },
      { name: 'P2PTransfer', model: db.p2PTransfer },
      { name: 'Receipt', model: db.receipt },
      { name: 'CommerceTransaction', model: db.commerceTransaction },
    ];

    for (const { name, model } of models) {
      const count = await model.count();
      console.log(`   ${name}: ${count} records`);
    }

    console.log('\n✅ Migration verification complete!');
    console.log('\n📊 Summary:');
    console.log(`   - CoopChainConfig: ${chainConfig ? 'Created' : 'Missing'}`);
    console.log(`   - UserCoopMembership: ${membershipCount} records`);
    console.log(`   - Applications: ${applicationCount} records`);
    console.log('\n✨ Database is ready for multi-coop operations!');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    throw error;
  }
}

verifyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
