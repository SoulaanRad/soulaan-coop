import { describe, it, expect } from 'vitest';
import { healthRouter } from '../routers/health.js';

// Mock context for health router (doesn't need db)
const mockContext = {
  db: {} as any,
  req: {} as any,
  res: {} as any
};

describe('Health Router', () => {
  it('should return pong response', async () => {
    const caller = healthRouter.createCaller(mockContext);
    
    const result = await caller.ping();
    
    expect(result.status).toBe('ok');
    expect(result.message).toBe('pong');
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  });

  it('should return current timestamp', async () => {
    const caller = healthRouter.createCaller(mockContext);
    
    const before = new Date();
    const result = await caller.ping();
    const after = new Date();
    
    const timestamp = new Date(result.timestamp);
    
    expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
