import { createPublicClient, createWalletClient, http, formatUnits, parseUnits, type Address, type PublicClient, type WalletClient, type Log } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// Environment configuration
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const UNITY_COIN_ADDRESS = process.env.UNITY_COIN_ADDRESS || '0xB52b287a83f3d370fdAC8c05f39da23522a51ec9';
const SOULAANI_COIN_ADDRESS = process.env.SOULAANI_COIN_ADDRESS || '0x7E59d1F33F4efF9563544B2cc90B9Cc7516E2542';

/**
 * Create a public client for reading from the blockchain
 */
export function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

/**
 * Create a wallet client for sending transactions
 * @param privateKey - The private key to use for signing
 */
export function getWalletClient(privateKey: string): WalletClient {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

// ABI for UnityCoin contract
export const unityCoinAbi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'mintOnramp',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'treasury', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'FeeCollected',
    type: 'event',
  },
] as const;

// ABI for SoulaaniCoin contract
export const soulaaniCoinAbi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'isActiveMember',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Get UnityCoin balance for an address
 * @param address - The address to check
 * @returns Balance in UC (formatted as string)
 */
export async function getUCBalance(address: string): Promise<{ balance: bigint; formatted: string }> {
  const publicClient = getPublicClient();

  const balance = await publicClient.readContract({
    address: UNITY_COIN_ADDRESS as Address,
    abi: unityCoinAbi,
    functionName: 'balanceOf',
    args: [address as Address],
  });

  return {
    balance,
    formatted: formatUnits(balance, 18),
  };
}

/**
 * Check if an address is an active SoulaaniCoin member
 * @param address - The address to check
 * @returns Boolean indicating active membership
 */
export async function isActiveMember(address: string): Promise<boolean> {
  const publicClient = getPublicClient();

  const isActive = await publicClient.readContract({
    address: SOULAANI_COIN_ADDRESS as Address,
    abi: soulaaniCoinAbi,
    functionName: 'isActiveMember',
    args: [address as Address],
  });

  return isActive;
}

/**
 * Transfer event interface
 */
export interface TransferEvent {
  from: string;
  to: string;
  value: bigint;
  valueFormatted: string;
  blockNumber: bigint;
  transactionHash: string;
  timestamp: number;
}

/**
 * Parse Transfer events from logs
 * @param logs - The event logs to parse
 * @returns Array of formatted transfer events
 */
export async function parseTransferEvents(logs: Log[]): Promise<TransferEvent[]> {
  const publicClient = getPublicClient();
  const transfers: TransferEvent[] = [];

  for (const log of logs) {
    try {
      // Get block to get timestamp
      const block = await publicClient.getBlock({ blockNumber: log.blockNumber! });

      // Parse event data
      const topics = log.topics;
      const from = topics[1] ? `0x${topics[1].slice(26)}` : '0x0';
      const to = topics[2] ? `0x${topics[2].slice(26)}` : '0x0';
      const value = BigInt(log.data);

      transfers.push({
        from,
        to,
        value,
        valueFormatted: formatUnits(value, 18),
        blockNumber: log.blockNumber!,
        transactionHash: log.transactionHash!,
        timestamp: Number(block.timestamp),
      });
    } catch (error) {
      console.error('Error parsing transfer event:', error);
      // Continue processing other events
    }
  }

  return transfers;
}

/**
 * Get Transfer events for an address
 * @param address - The address to get transfers for
 * @param fromBlock - Starting block number (optional)
 * @param toBlock - Ending block number (optional, defaults to 'latest')
 * @returns Array of transfer events
 */
export async function getTransferEvents(
  address: string,
  fromBlock?: bigint,
  toBlock?: bigint | 'latest'
): Promise<TransferEvent[]> {
  const publicClient = getPublicClient();

  // Get events where address is sender
  const sentLogs = await publicClient.getLogs({
    address: UNITY_COIN_ADDRESS as Address,
    event: unityCoinAbi.find(item => item.type === 'event' && item.name === 'Transfer')!,
    args: {
      from: address as Address,
    },
    fromBlock: fromBlock || 0n,
    toBlock: toBlock || 'latest',
  });

  // Get events where address is receiver
  const receivedLogs = await publicClient.getLogs({
    address: UNITY_COIN_ADDRESS as Address,
    event: unityCoinAbi.find(item => item.type === 'event' && item.name === 'Transfer')!,
    args: {
      to: address as Address,
    },
    fromBlock: fromBlock || 0n,
    toBlock: toBlock || 'latest',
  });

  // Combine and parse
  const allLogs = [...sentLogs, ...receivedLogs];
  const transfers = await parseTransferEvents(allLogs);

  // Sort by block number (descending)
  transfers.sort((a, b) => Number(b.blockNumber - a.blockNumber));

  return transfers;
}

/**
 * Get all Transfer events (admin use)
 * @param fromBlock - Starting block number (optional)
 * @param toBlock - Ending block number (optional, defaults to 'latest')
 * @param limit - Maximum number of events to return
 * @returns Array of transfer events
 */
export async function getAllTransferEvents(
  fromBlock?: bigint,
  toBlock?: bigint | 'latest',
  limit?: number
): Promise<TransferEvent[]> {
  const publicClient = getPublicClient();

  const logs = await publicClient.getLogs({
    address: UNITY_COIN_ADDRESS as Address,
    event: unityCoinAbi.find(item => item.type === 'event' && item.name === 'Transfer')!,
    fromBlock: fromBlock || 0n,
    toBlock: toBlock || 'latest',
  });

  const transfers = await parseTransferEvents(logs);

  // Sort by block number (descending)
  transfers.sort((a, b) => Number(b.blockNumber - a.blockNumber));

  // Limit results if specified
  if (limit && transfers.length > limit) {
    return transfers.slice(0, limit);
  }

  return transfers;
}

/**
 * Format UC amount from wei
 * @param amount - Amount in wei (bigint)
 * @returns Formatted amount as string
 */
export function formatUCAmount(amount: bigint): string {
  const formatted = formatUnits(amount, 18);
  const asNumber = parseFloat(formatted);
  return asNumber.toFixed(2);
}

/**
 * Parse UC amount to wei
 * @param amount - Amount in UC (string or number)
 * @returns Amount in wei (bigint)
 */
export function parseUCAmount(amount: string | number): bigint {
  return parseUnits(amount.toString(), 18);
}

/**
 * Estimate gas for a transaction
 * @param from - Sender address
 * @param to - Recipient address
 * @param data - Transaction data
 * @returns Gas estimate in wei
 */
export async function estimateGas(
  from: string,
  to: string,
  data: `0x${string}`
): Promise<bigint> {
  const publicClient = getPublicClient();

  const gasEstimate = await publicClient.estimateGas({
    account: from as Address,
    to: to as Address,
    data,
  });

  return gasEstimate;
}

/**
 * Get current gas price
 * @returns Gas price in wei
 */
export async function getGasPrice(): Promise<bigint> {
  const publicClient = getPublicClient();
  const gasPrice = await publicClient.getGasPrice();
  return gasPrice;
}

/**
 * Contract addresses
 */
export const contracts = {
  unityCoin: UNITY_COIN_ADDRESS as Address,
  soulaaniCoin: SOULAANI_COIN_ADDRESS as Address,
};
