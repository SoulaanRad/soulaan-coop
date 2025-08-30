/**
 * Integration tests for database operations
 * These tests use a real database connection (test database)
 * Run with: npm run test -- --testPathPattern=integration
 */

import { PrismaClient } from '@prisma/client'

// Test database client
const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
})

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Clean up test data before running tests
    await testDb.businessWaitlist.deleteMany({
      where: { ownerEmail: { contains: 'test-' } },
    })
    await testDb.waitlistEntry.deleteMany({
      where: { email: { contains: 'test-' } },
    })
  })

  afterAll(async () => {
    // Clean up test data after running tests
    await testDb.businessWaitlist.deleteMany({
      where: { ownerEmail: { contains: 'test-' } },
    })
    await testDb.waitlistEntry.deleteMany({
      where: { email: { contains: 'test-' } },
    })
    await testDb.$disconnect()
  })

  describe('WaitlistEntry Model', () => {
    it('should create a new waitlist entry', async () => {
      const testEmail = 'test-user@example.com'
      
      const entry = await testDb.waitlistEntry.create({
        data: {
          email: testEmail,
          name: 'Test User',
          type: 'user',
          source: 'hero',
        },
      })

      expect(entry).toMatchObject({
        email: testEmail,
        name: 'Test User',
        type: 'user',
        source: 'hero',
      })
      expect(entry.id).toBeDefined()
      expect(entry.createdAt).toBeInstanceOf(Date)
    })

    it('should upsert a waitlist entry (create)', async () => {
      const testEmail = 'test-upsert-create@example.com'
      
      const entry = await testDb.waitlistEntry.upsert({
        where: { email: testEmail },
        update: {
          name: 'Updated Name',
          source: 'contact',
        },
        create: {
          email: testEmail,
          name: 'New User',
          type: 'user',
          source: 'hero',
        },
      })

      expect(entry).toMatchObject({
        email: testEmail,
        name: 'New User',
        type: 'user',
        source: 'hero',
      })
    })

    it('should upsert a waitlist entry (update)', async () => {
      const testEmail = 'test-upsert-update@example.com'
      
      // First create an entry
      await testDb.waitlistEntry.create({
        data: {
          email: testEmail,
          name: 'Original Name',
          type: 'user',
          source: 'hero',
        },
      })

      // Then upsert (should update)
      const entry = await testDb.waitlistEntry.upsert({
        where: { email: testEmail },
        update: {
          name: 'Updated Name',
          source: 'contact',
        },
        create: {
          email: testEmail,
          name: 'New User',
          type: 'user',
          source: 'hero',
        },
      })

      expect(entry).toMatchObject({
        email: testEmail,
        name: 'Updated Name',
        type: 'user',
        source: 'contact',
      })
    })

    it('should handle null name field', async () => {
      const testEmail = 'test-null-name@example.com'
      
      const entry = await testDb.waitlistEntry.create({
        data: {
          email: testEmail,
          name: null,
          type: 'user',
          source: 'hero',
        },
      })

      expect(entry.name).toBeNull()
      expect(entry.email).toBe(testEmail)
    })

    it('should enforce unique email constraint', async () => {
      const testEmail = 'test-unique@example.com'
      
      // First entry should succeed
      await testDb.waitlistEntry.create({
        data: {
          email: testEmail,
          name: 'First User',
          type: 'user',
          source: 'hero',
        },
      })

      // Second entry with same email should fail
      await expect(
        testDb.waitlistEntry.create({
          data: {
            email: testEmail,
            name: 'Second User',
            type: 'user',
            source: 'contact',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('BusinessWaitlist Model', () => {
    it('should create a new business waitlist entry', async () => {
      const testEmail = 'test-business@example.com'
      
      const entry = await testDb.businessWaitlist.create({
        data: {
          ownerName: 'Test Owner',
          ownerEmail: testEmail,
          businessName: 'Test Business',
          businessAddress: '123 Test St',
          businessType: 'Retail',
          monthlyRevenue: '$10,000',
          description: 'Test business description',
        },
      })

      expect(entry).toMatchObject({
        ownerName: 'Test Owner',
        ownerEmail: testEmail,
        businessName: 'Test Business',
        businessAddress: '123 Test St',
        businessType: 'Retail',
        monthlyRevenue: '$10,000',
        description: 'Test business description',
      })
      expect(entry.id).toBeDefined()
      expect(entry.createdAt).toBeInstanceOf(Date)
    })

    it('should upsert a business waitlist entry', async () => {
      const testEmail = 'test-business-upsert@example.com'
      
      const entry = await testDb.businessWaitlist.upsert({
        where: { ownerEmail: testEmail },
        update: {
          businessName: 'Updated Business Name',
          monthlyRevenue: '$20,000',
        },
        create: {
          ownerName: 'Test Owner',
          ownerEmail: testEmail,
          businessName: 'Test Business',
          businessAddress: '123 Test St',
          businessType: 'Retail',
          monthlyRevenue: '$10,000',
          description: 'Test business description',
        },
      })

      expect(entry).toMatchObject({
        ownerName: 'Test Owner',
        ownerEmail: testEmail,
        businessName: 'Test Business',
        businessAddress: '123 Test St',
        businessType: 'Retail',
        monthlyRevenue: '$10,000',
        description: 'Test business description',
      })
    })

    it('should handle null description field', async () => {
      const testEmail = 'test-business-null-desc@example.com'
      
      const entry = await testDb.businessWaitlist.create({
        data: {
          ownerName: 'Test Owner',
          ownerEmail: testEmail,
          businessName: 'Test Business',
          businessAddress: '123 Test St',
          businessType: 'Retail',
          monthlyRevenue: '$10,000',
          description: null,
        },
      })

      expect(entry.description).toBeNull()
      expect(entry.ownerEmail).toBe(testEmail)
    })

    it('should enforce unique ownerEmail constraint', async () => {
      const testEmail = 'test-business-unique@example.com'
      
      // First entry should succeed
      await testDb.businessWaitlist.create({
        data: {
          ownerName: 'Test Owner',
          ownerEmail: testEmail,
          businessName: 'First Business',
          businessAddress: '123 Test St',
          businessType: 'Retail',
          monthlyRevenue: '$10,000',
        },
      })

      // Second entry with same email should fail
      await expect(
        testDb.businessWaitlist.create({
          data: {
            ownerName: 'Another Owner',
            ownerEmail: testEmail,
            businessName: 'Second Business',
            businessAddress: '456 Test Ave',
            businessType: 'Service',
            monthlyRevenue: '$20,000',
          },
        })
      ).rejects.toThrow()
    })
  })
})
