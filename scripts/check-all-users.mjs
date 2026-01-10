import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function checkUsers() {
  try {
    const users = await db.user.findMany({
      include: {
        application: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('\n📊 Total users in database:', users.length);

    if (users.length > 0) {
      users.forEach((user, i) => {
        console.log(`\n${i + 1}. ${user.name || user.email}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Phone: ${user.phone || 'N/A'}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Created: ${user.createdAt.toISOString()}`);
        console.log(`   Has Application: ${user.application ? 'Yes' : 'No'}`);
      });

      // Show stats
      const stats = {
        pending: users.filter(u => u.status === 'PENDING').length,
        active: users.filter(u => u.status === 'ACTIVE').length,
        rejected: users.filter(u => u.status === 'REJECTED').length,
        suspended: users.filter(u => u.status === 'SUSPENDED').length,
      };

      console.log('\n📈 Stats:');
      console.log(`   PENDING: ${stats.pending}`);
      console.log(`   ACTIVE: ${stats.active}`);
      console.log(`   REJECTED: ${stats.rejected}`);
      console.log(`   SUSPENDED: ${stats.suspended}`);
    } else {
      console.log('\n❌ No users found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkUsers();
