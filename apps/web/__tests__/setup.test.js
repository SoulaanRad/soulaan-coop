// Simple test to verify Jest setup is working
describe('Test Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have access to environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('should mock fetch', () => {
    expect(typeof global.fetch).toBe('function')
  })
})
