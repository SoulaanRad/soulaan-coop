import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function checkLoginCodes() {
  try {
    const codes = await db.loginCode.findMany({
      where: {
        email: 'deon@appmunki.com',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    console.log('\n📋 Recent login codes for deon@appmunki.com:\n');

    if (codes.length === 0) {
      console.log('No codes found.');
    } else {
      const now = new Date();
      codes.forEach((code, index) => {
        const isExpired = code.expiresAt < now;
        const minutesUntilExpiry = Math.round((code.expiresAt - now) / 1000 / 60);

        console.log(`${index + 1}. Code: ${code.code}`);
        console.log(`   Created: ${code.createdAt.toISOString()}`);
        console.log(`   Expires: ${code.expiresAt.toISOString()}`);
        console.log(`   Used: ${code.used}`);
        console.log(`   Status: ${isExpired ? '❌ EXPIRED' : code.used ? '✅ USED' : `⏰ Valid (${minutesUntilExpiry} min left)`}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

checkLoginCodes();
