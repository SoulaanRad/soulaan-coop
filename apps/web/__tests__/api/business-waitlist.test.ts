import { POST } from '@/app/api/business-waitlist/route'
import { NextRequest } from 'next/server'

// Mock PrismaClient
const mockUpsert = jest.fn()
const mockPrismaClient = {
  businessWaitlist: {
    upsert: mockUpsert,
  },
  $disconnect: jest.fn(),
}

// Mock the PrismaClient constructor
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}))

// Mock fetch for Slack webhook
global.fetch = jest.fn()

describe('/api/business-waitlist', () => {
  const validBusinessData = {
    ownerName: 'John Doe',
    ownerEmail: 'john@business.com',
    businessName: 'Doe Enterprises',
    businessAddress: '123 Business St, City, State 12345',
    businessType: 'Retail',
    monthlyRevenue: '$10,000-$50,000',
    description: 'A local retail business',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue({
      id: 'test-id',
      ...validBusinessData,
      createdAt: new Date(),
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
    })
  })

  describe('POST', () => {
    it('should successfully create a business waitlist entry', async () => {
      const request = new NextRequest('http://localhost:3000/api/business-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBusinessData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe("Thanks for your interest! We'll contact you about partnership opportunities.")
      
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { ownerEmail: 'john@business.com' },
        update: {
          ownerName: 'John Doe',
          businessName: 'Doe Enterprises',
          businessAddress: '123 Business St, City, State 12345',
          businessType: 'Retail',
          monthlyRevenue: '$10,000-$50,000',
          description: 'A local retail business',
        },
        create: {
          ownerName: 'John Doe',
          ownerEmail: 'john@business.com',
          businessName: 'Doe Enterprises',
          businessAddress: '123 Business St, City, State 12345',
          businessType: 'Retail',
          monthlyRevenue: '$10,000-$50,000',
          description: 'A local retail business',
        },
      })
    })

    it('should handle missing required fields', async () => {
      const incompleteData = {
        ownerName: 'John Doe',
        ownerEmail: 'john@business.com',
        // Missing businessName and businessAddress
        businessType: 'Retail',
        monthlyRevenue: '$10,000',
      }

      const request = new NextRequest('http://localhost:3000/api/business-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Please fill in all required fields')
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('should handle invalid email', async () => {
      const invalidEmailData = {
        ...validBusinessData,
        ownerEmail: 'invalid-email',
      }

      const request = new NextRequest('http://localhost:3000/api/business-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidEmailData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Please enter a valid email address')
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('should work without optional description', async () => {
      const dataWithoutDescription = {
        ...validBusinessData,
        description: undefined,
      }

      const request = new NextRequest('http://localhost:3000/api/business-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithoutDescription),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            description: undefined,
          }),
          update: expect.objectContaining({
            description: undefined,
          }),
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockUpsert.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/business-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBusinessData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Business signup error. Please try again.')
    })

    it('should send Slack notification when webhook is configured', async () => {
      const request = new NextRequest('http://localhost:3000/api/business-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBusinessData),
      })

      await POST(request)

      expect(global.fetch).toHaveBeenCalledWith(
        process.env.SLACK_WEBHOOK_URL,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('New Business Partnership Interest'),
        })
      )
    })

    it('should handle Slack webhook failures gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Slack webhook failed'))

      const request = new NextRequest('http://localhost:3000/api/business-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBusinessData),
      })

      const response = await POST(request)
      const data = await response.json()

      // Should still succeed even if Slack fails
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockUpsert).toHaveBeenCalled()
    })

    it('should handle empty string description as undefined', async () => {
      const dataWithEmptyDescription = {
        ...validBusinessData,
        description: '',
      }

      const request = new NextRequest('http://localhost:3000/api/business-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithEmptyDescription),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            description: undefined,
          }),
          update: expect.objectContaining({
            description: undefined,
          }),
        })
      )
    })
  })
})
