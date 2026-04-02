import { createPublicClient, createWalletClient, http, formatUnits, parseUnits, type Address, type PublicClient, type WalletClient, type Log } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

import { db } from '@repo/db';

// Environment configuration
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';

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
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
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
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'isMember',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'memberStatus',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'member', type: 'address' }],
    name: 'addMember',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'member', type: 'address' },
      { name: 'newStatus', type: 'uint8' },
    ],
    name: 'setMemberStatus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'member', type: 'address' }],
    name: 'suspendMember',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'member', type: 'address' }],
    name: 'reactivateMember',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'member', type: 'address' }],
    name: 'banMember',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Minting function for rewards
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'mintReward',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Transfer function
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
] as const;

// MemberStatus enum matching the contract
export enum MemberStatus {
  NotMember = 0,
  Active = 1,
  Suspended = 2,
  Banned = 3,
}

/**
 * Get total supply of UnityCoin (total UC in circulation)
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @returns Total supply in UC
 */
export async function getUCTotalSupply(coopId: string = '???'): Promise<{ totalSupply: bigint; formatted: string }> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { ucTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.ucTokenAddress) {
    throw new Error(`UC token address not configured for coop: ${coopId}`);
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });

  const totalSupply = await publicClient.readContract({
    address: coopConfig.ucTokenAddress as Address,
    abi: unityCoinAbi,
    functionName: 'totalSupply',
    args: [],
  });

  return {
    totalSupply,
    formatted: formatUnits(totalSupply, 18),
  };
}

/**
 * Get UnityCoin balance for an address
 * @param address - The address to check
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @returns Balance in UC (formatted as string)
 */
export async function getUCBalance(address: string, coopId: string = '???'): Promise<{ balance: bigint; formatted: string }> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { ucTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.ucTokenAddress) {
    throw new Error(`UC token address not configured for coop: ${coopId}`);
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });

  const balance = await publicClient.readContract({
    address: coopConfig.ucTokenAddress as Address,
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
 * Get SoulaaniCoin balance for an address
 * @param address - The address to check
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @returns Balance in SC (formatted as string)
 */
export async function getSCBalance(address: string, coopId: string = '???'): Promise<{ balance: bigint; formatted: string }> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { scTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.scTokenAddress) {
    throw new Error(`SC token address not configured for coop: ${coopId}`);
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });

  const balance = await publicClient.readContract({
    address: coopConfig.scTokenAddress as Address,
    abi: soulaaniCoinAbi,
    functionName: 'balanceOf',
    args: [address as Address],
  });

  const formatted = formatUnits(balance, 18);
  console.log(`💰 SC Balance for ${address}: ${balance} wei = ${formatted} SC`);

  return {
    balance,
    formatted,
  };
}

/**
 * Get ETH balance for an address
 * @param address - The address to check
 * @returns Balance in ETH (formatted as string)
 */
export async function getETHBalance(address: string): Promise<{ balance: bigint; formatted: string }> {
  const publicClient = getPublicClient();

  const balance = await publicClient.getBalance({
    address: address as Address,
  });

  return {
    balance,
    formatted: formatUnits(balance, 18),
  };
}

/**
 * Get comprehensive blockchain info for a user
 * @param address - The wallet address to check
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @returns All relevant blockchain data
 */
export async function getComprehensiveBlockchainInfo(address: string, coopId: string = '???'): Promise<{
  walletAddress: string;
  ethBalance: { balance: string; formatted: string };
  ucBalance: { balance: string; formatted: string };
  scBalance: { balance: string; formatted: string };
  memberStatus: MemberStatus;
  memberStatusLabel: string;
  isActiveMember: boolean;
  isMember: boolean;
}> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { scTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.scTokenAddress) {
    throw new Error(`SC token address not configured for coop: ${coopId}`);
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });

  // Fetch all data in parallel for efficiency
  const [ethBalance, ucBalance, scBalance, memberStatus, isActive, isMemberResult] = await Promise.all([
    getETHBalance(address),
    getUCBalance(address, coopId),
    getSCBalance(address, coopId),
    getMemberStatus(address, coopId),
    isActiveMember(address, coopId),
    publicClient.readContract({
      address: coopConfig.scTokenAddress as Address,
      abi: soulaaniCoinAbi,
      functionName: 'isMember',
      args: [address as Address],
    }),
  ]);

  return {
    walletAddress: address,
    ethBalance: {
      balance: ethBalance.balance.toString(),
      formatted: ethBalance.formatted,
    },
    ucBalance: {
      balance: ucBalance.balance.toString(),
      formatted: ucBalance.formatted,
    },
    scBalance: {
      balance: scBalance.balance.toString(),
      formatted: scBalance.formatted,
    },
    memberStatus,
    memberStatusLabel: MemberStatus[memberStatus],
    isActiveMember: isActive,
    isMember: isMemberResult as boolean,
  };
}

/**
 * Check if an address is an active SoulaaniCoin member
 * @param address - The address to check
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @returns Boolean indicating active membership
 */
export async function isActiveMember(address: string, coopId: string = '???'): Promise<boolean> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { scTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.scTokenAddress) {
    throw new Error(`SC token address not configured for coop: ${coopId}`);
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });

  const isActive = await publicClient.readContract({
    address: coopConfig.scTokenAddress as Address,
    abi: soulaaniCoinAbi,
    functionName: 'isActiveMember',
    args: [address as Address],
  });

  return isActive;
}

/**
 * Get member status from SoulaaniCoin contract
 * @param address - The address to check
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @returns MemberStatus enum value
 */
export async function getMemberStatus(address: string, coopId: string = '???'): Promise<MemberStatus> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { scTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.scTokenAddress) {
    throw new Error(`SC token address not configured for coop: ${coopId}`);
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });

  const status = await publicClient.readContract({
    address: coopConfig.scTokenAddress as Address,
    abi: soulaaniCoinAbi,
    functionName: 'memberStatus',
    args: [address as Address],
  });

  return status as MemberStatus;
}

/**
 * Add a member to the SoulaaniCoin contract
 * @param memberAddress - The address to add as a member
 * @param adminPrivateKey - Private key of an account with MEMBER_MANAGER role
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @returns Transaction hash
 */
export async function addMemberToContract(
  memberAddress: string,
  adminPrivateKey: string,
  coopId: string = '???'
): Promise<string> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { scTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.scTokenAddress) {
    throw new Error(`SC token address not configured for coop: ${coopId}`);
  }

  const account = privateKeyToAccount(adminPrivateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });

  console.log(`📝 Adding member ${memberAddress} to SoulaaniCoin contract...`);

  const hash = await walletClient.writeContract({
    address: coopConfig.scTokenAddress as Address,
    abi: soulaaniCoinAbi,
    functionName: 'addMember',
    args: [memberAddress as Address],
    account,
    chain: baseSepolia,
  });

  console.log(`✅ Member added, tx: ${hash}`);

  // Wait for confirmation
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });
  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}

/**
 * Set member status on the SoulaaniCoin contract
 * @param memberAddress - The address to update
 * @param status - The new MemberStatus
 * @param adminPrivateKey - Private key of an account with MEMBER_MANAGER role
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @returns Transaction hash
 */
export async function setMemberStatusOnContract(
  memberAddress: string,
  status: MemberStatus,
  adminPrivateKey: string,
  coopId: string = '???'
): Promise<string> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { scTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.scTokenAddress) {
    throw new Error(`SC token address not configured for coop: ${coopId}`);
  }

  const account = privateKeyToAccount(adminPrivateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });

  console.log(`📝 Setting member ${memberAddress} status to ${MemberStatus[status]}...`);

  const hash = await walletClient.writeContract({
    address: coopConfig.scTokenAddress as Address,
    abi: soulaaniCoinAbi,
    functionName: 'setMemberStatus',
    args: [memberAddress as Address, status],
    account,
    chain: baseSepolia,
  });

  console.log(`✅ Member status updated, tx: ${hash}`);

  // Wait for confirmation
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });
  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}

/**
 * Sync a user's membership status from DB to contract
 * @param walletAddress - The user's wallet address
 * @param dbStatus - The user's status from the database
 * @param adminPrivateKey - Private key of an account with MEMBER_MANAGER role
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @returns Object with sync result
 */
export async function syncMembershipToContract(
  walletAddress: string,
  dbStatus: string,
  adminPrivateKey: string,
  coopId: string = '???'
): Promise<{ success: boolean; action: string; txHash?: string; error?: string }> {
  try {
    const currentContractStatus = await getMemberStatus(walletAddress, coopId);

    console.log(`🔄 Syncing membership for ${walletAddress}`);
    console.log(`   DB status: ${dbStatus}`);
    console.log(`   Contract status: ${MemberStatus[currentContractStatus]}`);

    // Map DB status to contract MemberStatus
    let targetStatus: MemberStatus;
    switch (dbStatus.toUpperCase()) {
      case 'ACTIVE':
        targetStatus = MemberStatus.Active;
        break;
      case 'SUSPENDED':
        targetStatus = MemberStatus.Suspended;
        break;
      case 'BANNED':
        targetStatus = MemberStatus.Banned;
        break;
      default:
        targetStatus = MemberStatus.NotMember;
    }

    // If already matching, no action needed
    if (currentContractStatus === targetStatus) {
      console.log(`   ✅ Already in sync`);
      return { success: true, action: 'already_synced' };
    }

    // If user is NotMember on contract and should be Active, use addMember
    if (currentContractStatus === MemberStatus.NotMember && targetStatus === MemberStatus.Active) {
      const txHash = await addMemberToContract(walletAddress, adminPrivateKey, coopId);
      return { success: true, action: 'added_member', txHash };
    }

    // Otherwise use setMemberStatus
    const txHash = await setMemberStatusOnContract(walletAddress, targetStatus, adminPrivateKey, coopId);
    return { success: true, action: 'status_updated', txHash };

  } catch (error) {
    console.error(`❌ Failed to sync membership:`, error);
    return {
      success: false,
      action: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
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
 * @param rpcUrl - RPC URL to use for fetching block data
 * @returns Array of formatted transfer events
 */
export async function parseTransferEvents(logs: Log[], rpcUrl?: string): Promise<TransferEvent[]> {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl || RPC_URL),
  });
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
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @param fromBlock - Starting block number (optional)
 * @param toBlock - Ending block number (optional, defaults to 'latest')
 * @returns Array of transfer events
 */
export async function getTransferEvents(
  address: string,
  coopId: string = '???',
  fromBlock?: bigint,
  toBlock?: bigint | 'latest'
): Promise<TransferEvent[]> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { ucTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.ucTokenAddress) {
    throw new Error(`UC token address not configured for coop: ${coopId}`);
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });

  // Get events where address is sender
  const sentLogs = await publicClient.getLogs({
    address: coopConfig.ucTokenAddress as Address,
    event: unityCoinAbi.find(item => item.type === 'event' && item.name === 'Transfer')!,
    args: {
      from: address as Address,
    },
    fromBlock: fromBlock || 0n,
    toBlock: toBlock || 'latest',
  });

  // Get events where address is receiver
  const receivedLogs = await publicClient.getLogs({
    address: coopConfig.ucTokenAddress as Address,
    event: unityCoinAbi.find(item => item.type === 'event' && item.name === 'Transfer')!,
    args: {
      to: address as Address,
    },
    fromBlock: fromBlock || 0n,
    toBlock: toBlock || 'latest',
  });

  // Combine and parse
  const allLogs = [...sentLogs, ...receivedLogs];
  const transfers = await parseTransferEvents(allLogs, coopConfig.rpcUrl || RPC_URL);

  // Sort by block number (descending)
  transfers.sort((a, b) => Number(b.blockNumber - a.blockNumber));

  return transfers;
}

/**
 * Get all Transfer events (admin use)
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @param fromBlock - Starting block number (optional)
 * @param toBlock - Ending block number (optional, defaults to 'latest')
 * @param limit - Maximum number of events to return
 * @returns Array of transfer events
 */
export async function getAllTransferEvents(
  coopId: string = '???',
  fromBlock?: bigint,
  toBlock?: bigint | 'latest',
  limit?: number
): Promise<TransferEvent[]> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { ucTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.ucTokenAddress) {
    throw new Error(`UC token address not configured for coop: ${coopId}`);
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });

  const logs = await publicClient.getLogs({
    address: coopConfig.ucTokenAddress as Address,
    event: unityCoinAbi.find(item => item.type === 'event' && item.name === 'Transfer')!,
    fromBlock: fromBlock || 0n,
    toBlock: toBlock || 'latest',
  });

  const transfers = await parseTransferEvents(logs, coopConfig.rpcUrl || RPC_URL);

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

