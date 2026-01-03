import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { blockchainConfig } from './config';

/**
 * Public client for reading from blockchain
 * Uses viem library for blockchain interactions
 */
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(blockchainConfig.rpcUrl),
});

/**
 * Helper to check if blockchain is configured
 */
export function isBlockchainConfigured(): boolean {
  return (
    blockchainConfig.contracts.soulaaniCoin !== '0x0000000000000000000000000000000000000000' &&
    blockchainConfig.contracts.unityCoin !== '0x0000000000000000000000000000000000000000'
  );
}
