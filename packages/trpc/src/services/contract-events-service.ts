import { createPublicClient, http, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { db } from '@repo/db';

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
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @param fromBlock - Starting block number (optional)
 */
export async function getUnityCoinAddressChanges(coopId: string = '???', fromBlock?: bigint): Promise<AddressChangeEvent[]> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { ucTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.ucTokenAddress) {
    console.warn(`UC token address not configured for coop: ${coopId}`);
    return [];
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });

  try {
    const logs = await publicClient.getLogs({
      address: coopConfig.ucTokenAddress as Address,
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
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @param fromBlock - Starting block number (optional)
 */
export async function getUnityCoinRoleChanges(coopId: string = '???', fromBlock?: bigint): Promise<RoleChangeEvent[]> {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
    orderBy: { version: 'desc' },
    select: { ucTokenAddress: true, rpcUrl: true },
  });

  if (!coopConfig?.ucTokenAddress) {
    console.warn(`UC token address not configured for coop: ${coopId}`);
    return [];
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl || RPC_URL),
  });

  try {
    const [grantedLogs, revokedLogs] = await Promise.all([
      publicClient.getLogs({
        address: coopConfig.ucTokenAddress as Address,
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
        address: coopConfig.ucTokenAddress as Address,
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
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @param fromBlock - Starting block number (optional)
 */
export async function getAllPrivilegedChanges(coopId: string = '???', fromBlock?: bigint): Promise<{
  addressChanges: AddressChangeEvent[];
  roleChanges: RoleChangeEvent[];
}> {
  const [addressChanges, roleChanges] = await Promise.all([
    getUnityCoinAddressChanges(coopId, fromBlock),
    getUnityCoinRoleChanges(coopId, fromBlock),
  ]);

  return {
    addressChanges: addressChanges.sort((a, b) => Number(b.timestamp - a.timestamp)),
    roleChanges: roleChanges.sort((a, b) => Number(b.timestamp - a.timestamp)),
  };
}

/**
 * Get wealth fund address changes specifically
 * @param coopId - Coop ID to load contract addresses from CoopConfig
 * @param fromBlock - Starting block number (optional)
 */
export async function getWealthFundAddressChanges(coopId: string = '???', fromBlock?: bigint): Promise<AddressChangeEvent[]> {
  const allChanges = await getUnityCoinAddressChanges(coopId, fromBlock);
  return allChanges.filter(change => change.changeType === 'WEALTH_FUND');
}
