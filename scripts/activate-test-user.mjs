import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function activateTestUser() {
  const email = 'deon@appmunki.com';
  const password = 'test123456';

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user to ACTIVE status with password
    const user = await db.user.update({
      where: { email },
      data: {
        status: 'ACTIVE',
        password: hashedPassword,
        phone: '+1234567890',
      },
    });

    console.log('\n✅ Test user activated successfully!');
    console.log({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    });

    console.log('\n📱 You can now login with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n🔑 Or use passwordless login:');
    console.log(`   Email: ${email}`);
    console.log('   1. Request a login code');
    console.log('   2. Check the API server logs for the 6-digit code');
    console.log('   3. Enter the code to login');

  } catch (error) {
    console.error('❌ Error activating test user:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

activateTestUser();
