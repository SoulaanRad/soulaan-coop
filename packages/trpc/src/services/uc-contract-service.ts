import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { encodeFunctionData } from "viem";

const BACKEND_WALLET_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY || '';
const UNITY_COIN_ADDRESS = process.env.UNITY_COIN_ADDRESS || '';
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

/**
 * Get treasury address from UnityCoin contract
 */
export async function getTreasuryAddress(): Promise<string | null> {
  try {
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const wealthFundAddress = await publicClient.readContract({
      address: UNITY_COIN_ADDRESS as Address,
      abi: [
        {
          inputs: [],
          name: 'wealthFundAddress',
          outputs: [{ name: '', type: 'address' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'wealthFundAddress',
    });

    // Return null if zero address (not configured)
    if (!wealthFundAddress || wealthFundAddress === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    return wealthFundAddress as string;
  } catch (error) {
    console.warn('⚠️ Wealth fund address not available (contract may need upgrade):', error);
    return null;
  }
}

/**
 * Set wealth fund address in UnityCoin contract
 */
export async function setTreasuryAddress(newTreasuryAddress: string, reason?: string): Promise<string> {
  if (!BACKEND_WALLET_PRIVATE_KEY) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
  }

  if (!UNITY_COIN_ADDRESS) {
    throw new Error('UNITY_COIN_ADDRESS environment variable is required');
  }

  const backendAccount = privateKeyToAccount(BACKEND_WALLET_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account: backendAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const txData = encodeFunctionData({
    abi: [
      {
        inputs: [
          { name: 'newAddress', type: 'address' },
          { name: 'reason', type: 'string' }
        ],
        name: 'setWealthFundAddress',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ],
    functionName: 'setWealthFundAddress',
    args: [newTreasuryAddress as Address, reason || "Address update"],
  });

  const txHash = await walletClient.sendTransaction({
    to: UNITY_COIN_ADDRESS as Address,
    data: txData,
  });

  console.log(`💰 Wealth fund address updated to ${newTreasuryAddress} (tx: ${txHash})`);
  return txHash;
}

/**
 * Get the UC balance held at the wealth fund address (on-chain source of truth)
 */
export async function getWealthFundBalance(): Promise<number> {
  try {
    const wealthFundAddress = await getTreasuryAddress();
    if (!wealthFundAddress) return 0;

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const balanceWei = await publicClient.readContract({
      address: UNITY_COIN_ADDRESS as Address,
      abi: [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'balanceOf',
      args: [wealthFundAddress as Address],
    });

    return Number(balanceWei) / 1e18;
  } catch (error) {
    console.warn('⚠️ Could not fetch wealth fund balance:', error);
    return 0;
  }
}

/**
 * Get default reserve rate from UnityCoin contract
 */
export async function getDefaultReserveRate(): Promise<number | null> {
  try {
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const reserveBps = await publicClient.readContract({
      address: UNITY_COIN_ADDRESS as Address,
      abi: [
        {
          inputs: [],
          name: 'defaultReserveBps',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'defaultReserveBps',
    });

    return Number(reserveBps);
  } catch (error) {
    console.warn('⚠️ Default reserve rate not available (contract may need upgrade):', error);
    return null;
  }
}

/**
 * Set default reserve rate in UnityCoin contract
 */
export async function setDefaultReserveRate(newBps: number): Promise<string> {
  if (!BACKEND_WALLET_PRIVATE_KEY) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
  }

  if (!UNITY_COIN_ADDRESS) {
    throw new Error('UNITY_COIN_ADDRESS environment variable is required');
  }

  if (newBps > 2000) {
    throw new Error('Reserve rate cannot exceed 20% (2000 bps)');
  }

  const backendAccount = privateKeyToAccount(BACKEND_WALLET_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account: backendAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const txData = encodeFunctionData({
    abi: [
      {
        inputs: [{ name: 'newBps', type: 'uint256' }],
        name: 'setDefaultReserveRate',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ],
    functionName: 'setDefaultReserveRate',
    args: [BigInt(newBps)],
  });

  const txHash = await walletClient.sendTransaction({
    to: UNITY_COIN_ADDRESS as Address,
    data: txData,
  });

  console.log(`💰 Reserve rate updated to ${newBps / 100}% (tx: ${txHash})`);
  return txHash;
}
