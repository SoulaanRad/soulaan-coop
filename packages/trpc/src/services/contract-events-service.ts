import { createPublicClient, http, type Address } from "viem";
import { baseSepolia } from "viem/chains";

const UNITY_COIN_ADDRESS = process.env.UNITY_COIN_ADDRESS || '';
const SOULAANI_COIN_ADDRESS = process.env.SOULAANI_COIN_ADDRESS || '';
const REDEMPTION_VAULT_ADDRESS = process.env.REDEMPTION_VAULT_ADDRESS || '';
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

interface AddressChangeEvent {
  changeType: string;
  oldAddress: string;
  newAddress: string;
  changedBy: string;
  reason: string;
  timestamp: bigint;
  txHash: string;
  blockNumber: bigint;
  contractName: string;
}

interface RoleChangeEvent {
  role: string;
  account: string;
  sender: string;
  reason: string;
  timestamp: bigint;
  txHash: string;
  blockNumber: bigint;
  contractName: string;
  action: 'granted' | 'revoked';
}

/**
 * Get privileged address change events from UnityCoin contract
 */
export async function getUnityCoinAddressChanges(fromBlock?: bigint): Promise<AddressChangeEvent[]> {
  if (!UNITY_COIN_ADDRESS) {
    console.warn('UNITY_COIN_ADDRESS not configured');
    return [];
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  try {
    const logs = await publicClient.getLogs({
      address: UNITY_COIN_ADDRESS as Address,
      event: {
        type: 'event',
        name: 'PrivilegedAddressChanged',
        inputs: [
          { name: 'changeType', type: 'string', indexed: true },
          { name: 'oldAddress', type: 'address', indexed: true },
          { name: 'newAddress', type: 'address', indexed: true },
          { name: 'changedBy', type: 'address', indexed: false },
          { name: 'reason', type: 'string', indexed: false },
          { name: 'timestamp', type: 'uint256', indexed: false },
        ],
      },
      fromBlock: fromBlock || 'earliest',
      toBlock: 'latest',
    });

    return logs.map((log) => ({
      changeType: log.args.changeType as string,
      oldAddress: log.args.oldAddress as string,
      newAddress: log.args.newAddress as string,
      changedBy: log.args.changedBy as string,
      reason: log.args.reason as string,
      timestamp: log.args.timestamp as bigint,
      txHash: log.transactionHash as string,
      blockNumber: log.blockNumber,
      contractName: 'UnityCoin',
    }));
  } catch (error) {
    console.error('Error fetching UnityCoin address changes:', error);
    return [];
  }
}

/**
 * Get role change events from UnityCoin contract
 */
export async function getUnityCoinRoleChanges(fromBlock?: bigint): Promise<RoleChangeEvent[]> {
  if (!UNITY_COIN_ADDRESS) {
    console.warn('UNITY_COIN_ADDRESS not configured');
    return [];
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  try {
    const [grantedLogs, revokedLogs] = await Promise.all([
      publicClient.getLogs({
        address: UNITY_COIN_ADDRESS as Address,
        event: {
          type: 'event',
          name: 'RoleGranted',
          inputs: [
            { name: 'role', type: 'bytes32', indexed: true },
            { name: 'account', type: 'address', indexed: true },
            { name: 'sender', type: 'address', indexed: true },
            { name: 'reason', type: 'string', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
          ],
        },
        fromBlock: fromBlock || 'earliest',
        toBlock: 'latest',
      }),
      publicClient.getLogs({
        address: UNITY_COIN_ADDRESS as Address,
        event: {
          type: 'event',
          name: 'RoleRevoked',
          inputs: [
            { name: 'role', type: 'bytes32', indexed: true },
            { name: 'account', type: 'address', indexed: true },
            { name: 'sender', type: 'address', indexed: true },
            { name: 'reason', type: 'string', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
          ],
        },
        fromBlock: fromBlock || 'earliest',
        toBlock: 'latest',
      }),
    ]);

    const granted = grantedLogs.map((log) => ({
      role: log.args.role as string,
      account: log.args.account as string,
      sender: log.args.sender as string,
      reason: log.args.reason as string,
      timestamp: log.args.timestamp as bigint,
      txHash: log.transactionHash as string,
      blockNumber: log.blockNumber,
      contractName: 'UnityCoin',
      action: 'granted' as const,
    }));

    const revoked = revokedLogs.map((log) => ({
      role: log.args.role as string,
      account: log.args.account as string,
      sender: log.args.sender as string,
      reason: log.args.reason as string,
      timestamp: log.args.timestamp as bigint,
      txHash: log.transactionHash as string,
      blockNumber: log.blockNumber,
      contractName: 'UnityCoin',
      action: 'revoked' as const,
    }));

    return [...granted, ...revoked].sort((a, b) => Number(b.timestamp - a.timestamp));
  } catch (error) {
    console.error('Error fetching UnityCoin role changes:', error);
    return [];
  }
}

/**
 * Get all privileged changes (addresses + roles) from all contracts
 */
export async function getAllPrivilegedChanges(fromBlock?: bigint): Promise<{
  addressChanges: AddressChangeEvent[];
  roleChanges: RoleChangeEvent[];
}> {
  const [addressChanges, roleChanges] = await Promise.all([
    getUnityCoinAddressChanges(fromBlock),
    getUnityCoinRoleChanges(fromBlock),
  ]);

  return {
    addressChanges: addressChanges.sort((a, b) => Number(b.timestamp - a.timestamp)),
    roleChanges: roleChanges.sort((a, b) => Number(b.timestamp - a.timestamp)),
  };
}

/**
 * Get wealth fund address changes specifically
 */
export async function getWealthFundAddressChanges(fromBlock?: bigint): Promise<AddressChangeEvent[]> {
  const allChanges = await getUnityCoinAddressChanges(fromBlock);
  return allChanges.filter(change => change.changeType === 'WEALTH_FUND');
}
