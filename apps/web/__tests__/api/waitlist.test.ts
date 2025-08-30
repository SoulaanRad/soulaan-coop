import { POST } from '@/app/api/waitlist/route'
import { NextRequest } from 'next/server'

// Mock PrismaClient
const mockUpsert = jest.fn()
const mockPrismaClient = {
  waitlistEntry: {
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

describe('/api/waitlist', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue({
      id: 'test-id',
      email: 'test@example.com',
      name: 'Test User',
      type: 'user',
      source: 'hero',
      createdAt: new Date(),
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
    })
  })

  describe('POST', () => {
    it('should successfully create a waitlist entry', async () => {
      const request = new NextRequest('http://localhost:3000/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          source: 'hero',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe("You're on the list! We'll be in touch soon.")
      
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        update: {
          name: 'Test User',
          source: 'hero',
        },
        create: {
          email: 'test@example.com',
          name: 'Test User',
          type: 'user',
          source: 'hero',
        },
      })
    })

    it('should handle missing email', async () => {
      const request = new NextRequest('http://localhost:3000/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          source: 'hero',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Please enter a valid email address')
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('should handle invalid email', async () => {
      const request = new NextRequest('http://localhost:3000/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          name: 'Test User',
          source: 'hero',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Please enter a valid email address')
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('should handle invalid source', async () => {
      const request = new NextRequest('http://localhost:3000/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          source: 'invalid',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Invalid source')
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('should work without name (optional field)', async () => {
      const request = new NextRequest('http://localhost:3000/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          source: 'contact',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        update: {
          name: undefined,
          source: 'contact',
        },
        create: {
          email: 'test@example.com',
          name: undefined,
          type: 'user',
          source: 'contact',
        },
      })
    })

    it('should handle database errors gracefully', async () => {
      mockUpsert.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          source: 'hero',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Waitlist signup error. Please try again.')
    })

    it('should send Slack notification when webhook is configured', async () => {
      const request = new NextRequest('http://localhost:3000/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          source: 'hero',
        }),
      })

      await POST(request)

      expect(global.fetch).toHaveBeenCalledWith(
        process.env.SLACK_WEBHOOK_URL,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('New Soulaan Waitlist Signup'),
        })
      )
    })

    it('should handle Slack webhook failures gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Slack webhook failed'))

      const request = new NextRequest('http://localhost:3000/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          source: 'hero',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Should still succeed even if Slack fails
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockUpsert).toHaveBeenCalled()
    })
  })
})
