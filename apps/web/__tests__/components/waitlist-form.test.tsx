import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WaitlistForm } from '@/components/waitlist-form'

// Mock fetch
global.fetch = jest.fn()

describe('WaitlistForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "You're on the list! We'll be in touch soon.",
      }),
    })
  })

  it('should render hero variant form correctly', () => {
    render(<WaitlistForm source="hero" variant="hero" />)
    
    expect(screen.getByPlaceholderText('Your Name (Optional)')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Your Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument()
  })

  it('should render card variant form correctly', () => {
    render(<WaitlistForm source="contact" variant="card" />)
    
    expect(screen.getByPlaceholderText('Your Name (Optional)')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Your Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument()
  })

  it('should submit form with valid data', async () => {
    render(<WaitlistForm source="hero" variant="hero" />)
    
    const nameInput = screen.getByPlaceholderText('Your Name (Optional)')
    const emailInput = screen.getByPlaceholderText('Your Email')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          source: 'hero',
        }),
      })
    })
  })

  it('should submit form without name (optional field)', async () => {
    render(<WaitlistForm source="contact" variant="card" />)
    
    const emailInput = screen.getByPlaceholderText('Your Email')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: '',
          source: 'contact',
        }),
      })
    })
  })

  it('should show loading state while submitting', async () => {
    // Make fetch take some time to resolve
    ;(global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, message: 'Success!' }),
      }), 100))
    )

    render(<WaitlistForm source="hero" variant="hero" />)
    
    const emailInput = screen.getByPlaceholderText('Your Email')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    // Should show loading state
    expect(screen.getByText('Joining...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.getByText('Join Waitlist')).toBeInTheDocument()
    })
  })

  it('should display success message after successful submission', async () => {
    render(<WaitlistForm source="hero" variant="hero" />)
    
    const emailInput = screen.getByPlaceholderText('Your Email')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText("You're on the list! We'll be in touch soon.")).toBeInTheDocument()
    })
  })

  it('should display error message after failed submission', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        message: 'Please enter a valid email address',
      }),
    })

    render(<WaitlistForm source="hero" variant="hero" />)
    
    const emailInput = screen.getByPlaceholderText('Your Email')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('should handle network errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<WaitlistForm source="hero" variant="hero" />)
    
    const emailInput = screen.getByPlaceholderText('Your Email')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    })
  })

  it('should reset form after successful submission', async () => {
    render(<WaitlistForm source="hero" variant="hero" />)
    
    const nameInput = screen.getByPlaceholderText('Your Name (Optional)') as HTMLInputElement
    const emailInput = screen.getByPlaceholderText('Your Email') as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText("You're on the list! We'll be in touch soon.")).toBeInTheDocument()
    })
    
    // Form should be reset
    expect(nameInput.value).toBe('')
    expect(emailInput.value).toBe('')
  })

  it('should require email field', () => {
    render(<WaitlistForm source="hero" variant="hero" />)
    
    const emailInput = screen.getByPlaceholderText('Your Email')
    expect(emailInput).toHaveAttribute('required')
  })

  it('should not require name field', () => {
    render(<WaitlistForm source="hero" variant="hero" />)
    
    const nameInput = screen.getByPlaceholderText('Your Name (Optional)')
    expect(nameInput).not.toHaveAttribute('required')
  })
})
