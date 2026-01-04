import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function createTestUser() {
  const email = 'deon@appmunki.com';

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('✅ User already exists:', {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        status: existingUser.status,
      });
      return;
    }

    // Hash password
    const password = 'test123456';
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create test user
    const user = await db.user.create({
      data: {
        email,
        name: 'Deon Robinson',
        role: 'member',
        status: 'ACTIVE',
        password: hashedPassword,
        phone: '+1234567890',
      },
    });

    console.log('\n✅ Test user created successfully!');
    console.log({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      password: password, // Show plaintext for testing
    });

    console.log('\n📱 You can now login with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n🔑 Or use passwordless login:');
    console.log(`   Email: ${email}`);
    console.log('   Then enter the 6-digit code sent to your email');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

createTestUser();
