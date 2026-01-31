import { describe, it, expect } from 'vitest';
import {
  getPublicClient,
  formatUCAmount,
  parseUCAmount,
} from '../services/blockchain.js';
import { parseUnits, formatUnits, isAddress } from 'viem';

describe('Blockchain Service', () => {
  describe('getPublicClient', () => {
    it('should create a valid viem public client', () => {
      const client = getPublicClient();

      expect(client).toBeDefined();
      expect(client.chain).toBeDefined();
      expect(client.transport).toBeDefined();
    });

    it('should be configured for Base Sepolia', () => {
      const client = getPublicClient();

      // Base Sepolia chain ID is 84532
      expect(client.chain?.id).toBe(84532);
    });
  });

  describe('formatUCAmount', () => {
    it('should format small amounts correctly', () => {
      const amount = parseUnits('1', 18);
      const formatted = formatUCAmount(amount);
      expect(formatted).toBe('1.00');
    });

    it('should format large amounts correctly', () => {
      const amount = parseUnits('1000000', 18);
      const formatted = formatUCAmount(amount);
      expect(formatted).toBe('1000000.00');
    });

    it('should format decimal amounts correctly', () => {
      const amount = parseUnits('123.456789', 18);
      const formatted = formatUCAmount(amount);
      expect(formatted).toBe('123.46'); // Rounded to 2 decimals
    });

    it('should format zero correctly', () => {
      const amount = 0n;
      const formatted = formatUCAmount(amount);
      expect(formatted).toBe('0.00');
    });

    it('should handle very small fractional amounts', () => {
      const amount = parseUnits('0.001', 18);
      const formatted = formatUCAmount(amount);
      expect(formatted).toBe('0.00'); // Rounds down
    });

    it('should handle amounts with many decimals', () => {
      const amount = parseUnits('99.999999999', 18);
      const formatted = formatUCAmount(amount);
      expect(formatted).toBe('100.00'); // Rounds up
    });
  });

  describe('parseUCAmount', () => {
    it('should parse integer amounts correctly', () => {
      const amount = parseUCAmount('100');
      expect(amount).toBe(parseUnits('100', 18));
    });

    it('should parse decimal amounts correctly', () => {
      const amount = parseUCAmount('123.45');
      expect(amount).toBe(parseUnits('123.45', 18));
    });

    it('should parse string numbers correctly', () => {
      const amount = parseUCAmount('999.99');
      expect(amount).toBe(parseUnits('999.99', 18));
    });

    it('should parse numeric input correctly', () => {
      const amount = parseUCAmount(50);
      expect(amount).toBe(parseUnits('50', 18));
    });

    it('should handle zero', () => {
      const amount = parseUCAmount('0');
      expect(amount).toBe(0n);
    });

    it('should handle very large amounts', () => {
      const amount = parseUCAmount('1000000000');
      expect(amount).toBe(parseUnits('1000000000', 18));
    });
  });

  describe('formatUCAmount and parseUCAmount round-trip', () => {
    it('should preserve amounts through format->parse->format', () => {
      const testAmounts = ['1', '10', '100', '1000', '0.5', '123.45'];

      testAmounts.forEach((original) => {
        const parsed = parseUCAmount(original);
        const formatted = formatUCAmount(parsed);
        const reparsed = parseUCAmount(formatted);

        expect(reparsed).toBe(parsed);
      });
    });
  });

  describe('Ethereum address validation (viem)', () => {
    it('should validate Ethereum addresses using viem', () => {
      const validAddresses = [
        '0x0000000000000000000000000000000000000000',
        '0xB52b287a83f3d370fdAC8c05f39da23522a51ec9',
        '0x7E59d1F33F4efF9563544B2cc90B9Cc7516E2542',
      ];

      validAddresses.forEach((address) => {
        expect(isAddress(address)).toBe(true);
      });
    });

    it('should reject invalid addresses', () => {
      const invalidAddresses = [
        '0x0',
        'not-an-address',
        '0x123',
        'B52b287a83f3d370fdAC8c05f39da23522a51ec9', // Missing 0x
      ];

      invalidAddresses.forEach((address) => {
        expect(isAddress(address)).toBe(false);
      });
    });
  });
});
