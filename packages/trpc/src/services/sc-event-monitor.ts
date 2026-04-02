/**
 * SC Event Monitor - Real-time monitoring of SC minting events
 * This acts like Sentry for your smart contracts
 * 
 * NOTE: This service is currently unused and would need to be refactored
 * to accept coopId and use CoopConfig for contract addresses before use.
 */

import { createPublicClient, http, parseAbiItem, Log } from 'viem';
import { baseSepolia } from 'viem/chains';
import { db } from '@repo/db';

const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';

// Event ABIs
const AWARDED_EVENT = parseAbiItem('event Awarded(address indexed recipient, uint256 amount, bytes32 indexed reason, address indexed awarder)');
const DIMINISHING_RATE_EVENT = parseAbiItem('event DiminishingRateApplied(address indexed recipient, uint256 requestedAmount, uint256 actualAmount, uint256 currentBalancePercent)');
const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

// Event arg types
interface AwardedEventArgs {
  recipient: string;
  amount: bigint;
  reason: string;
  awarder: string;
}

interface DiminishingRateAppliedEventArgs {
  recipient: string;
  requestedAmount: bigint;
  actualAmount: bigint;
  currentBalancePercent: bigint;
}

interface MintAttempt {
  txHash: string;
  recipient: string;
  requestedAmount: number;
  actualAmount: number;
  reason: string;
  awarder: string;
  diminished: boolean;
  balancePercent?: number;
  timestamp: Date;
}

/**
 * Monitor SC minting events in real-time
 * Call this function to start monitoring
 */
export async function startSCEventMonitor(coopId: string = '???') {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
  });

  if (!coopConfig || !coopConfig.scTokenAddress || !coopConfig.rpcUrl) {
    throw new Error(`CoopConfig or SC token address not found for coopId: ${coopId}`);
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl),
  });

  console.log('🔍 Starting SC Event Monitor...');
  console.log(`📍 Monitoring contract: ${coopConfig.scTokenAddress}`);
  
  // Watch for Awarded events
  const unwatch = publicClient.watchEvent({
    address: coopConfig.scTokenAddress as `0x${string}`,
    event: AWARDED_EVENT,
    onLogs: async (logs) => {
      for (const log of logs) {
        await handleAwardedEvent(log);
      }
    },
  });

  // Watch for DiminishingRateApplied events
  publicClient.watchEvent({
    address: coopConfig.scTokenAddress as `0x${string}`,
    event: DIMINISHING_RATE_EVENT,
    onLogs: async (logs) => {
      for (const log of logs) {
        await handleDiminishingRateEvent(log);
      }
    },
  });

  console.log('✅ SC Event Monitor started!');
  
  return unwatch;
}

/**
 * Handle Awarded event
 */
async function handleAwardedEvent(log: Log) {
  if (!('args' in log)) return;
  const args = log.args as unknown as AwardedEventArgs;
  const { recipient, amount, reason, awarder } = args;
  
  const mintAttempt: Partial<MintAttempt> = {
    txHash: log.transactionHash!,
    recipient,
    actualAmount: parseFloat((amount / BigInt(10 ** 18)).toString()),
    reason: reason.toString(),
    awarder,
    timestamp: new Date(),
  };

  // Check if amount is 0 - this is a problem!
  if (amount === 0n) {
    console.error('🚨 ALERT: SC Mint awarded 0 tokens!');
    console.error('  Recipient:', recipient);
    console.error('  Reason:', reason);
    console.error('  Tx:', log.transactionHash);
    
    // TODO: Send to Sentry/monitoring service
    await sendAlert({
      level: 'error',
      message: 'SC Mint awarded 0 tokens',
      data: mintAttempt,
    });
  } else {
    console.log('✅ SC Minted:', mintAttempt.actualAmount, 'to', recipient);
  }
}

/**
 * Handle DiminishingRateApplied event
 */
async function handleDiminishingRateEvent(log: Log) {
  if (!('args' in log)) return;
  const args = log.args as unknown as DiminishingRateAppliedEventArgs;
  const { recipient, requestedAmount, actualAmount, currentBalancePercent } = args;
  
  const reduction = BigInt(requestedAmount) - BigInt(actualAmount);
  const reductionPercent = Number(reduction * BigInt(10000) / BigInt(requestedAmount)) / 100;
  
  console.warn('⚠️  Diminishing Returns Applied:');
  console.warn('  Recipient:', recipient);
  console.warn('  Requested:', (requestedAmount / BigInt(10 ** 18)).toString(), 'SC');
  console.warn('  Actual:', (actualAmount / BigInt(10 ** 18)).toString(), 'SC');
  console.warn('  Reduction:', reductionPercent.toFixed(2), '%');
  console.warn('  Balance %:', (Number(currentBalancePercent) / 100).toFixed(2), '%');
  console.warn('  Tx:', log.transactionHash);
  
  // Alert if reduction is > 50%
  if (reductionPercent > 50) {
    await sendAlert({
      level: 'warning',
      message: `High diminishing returns: ${reductionPercent.toFixed(2)}% reduction`,
      data: {
        recipient,
        requestedAmount: (requestedAmount / BigInt(10 ** 18)).toString(),
        actualAmount: (actualAmount / BigInt(10 ** 18)).toString(),
        reductionPercent,
        txHash: log.transactionHash,
      },
    });
  }
}

/**
 * Send alert to monitoring service
 * Integrate with Sentry, Slack, Discord, etc.
 */
async function sendAlert(alert: {
  level: 'error' | 'warning' | 'info';
  message: string;
  data: any;
}) {
  // TODO: Integrate with your monitoring service
  
  // Example: Sentry
  // Sentry.captureMessage(alert.message, {
  //   level: alert.level,
  //   extra: alert.data,
  // });
  
  // Example: Slack webhook
  // await fetch(process.env.SLACK_WEBHOOK_URL, {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     text: `🚨 ${alert.message}`,
  //     attachments: [{
  //       color: alert.level === 'error' ? 'danger' : 'warning',
  //       fields: Object.entries(alert.data).map(([key, value]) => ({
  //         title: key,
  //         value: String(value),
  //         short: true,
  //       })),
  //     }],
  //   }),
  // });
  
  console.log('📢 Alert sent:', alert.message);
}

/**
 * Get historical mint attempts (for debugging past issues)
 */
export async function getHistoricalMintAttempts(fromBlock: bigint, toBlock: bigint, coopId: string = '???') {
  const coopConfig = await db.coopConfig.findFirst({
    where: { coopId, isActive: true },
  });

  if (!coopConfig || !coopConfig.scTokenAddress || !coopConfig.rpcUrl) {
    throw new Error(`CoopConfig or SC token address not found for coopId: ${coopId}`);
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(coopConfig.rpcUrl),
  });

  console.log(`📊 Fetching historical mint attempts from block ${fromBlock} to ${toBlock}...`);
  
  const awardedLogs = await publicClient.getLogs({
    address: coopConfig.scTokenAddress as `0x${string}`,
    event: AWARDED_EVENT,
    fromBlock,
    toBlock,
  });
  
  const diminishingLogs = await publicClient.getLogs({
    address: coopConfig.scTokenAddress as `0x${string}`,
    event: DIMINISHING_RATE_EVENT,
    fromBlock,
    toBlock,
  });
  
  console.log(`  Found ${awardedLogs.length} Awarded events`);
  console.log(`  Found ${diminishingLogs.length} DiminishingRate events`);
  
  // Analyze
  const zeroAmountMints = awardedLogs.filter(log => {
    if (!('args' in log)) return false;
    const args = log.args as unknown as AwardedEventArgs;
    return args.amount === 0n;
  });
  console.log(`  🚨 ${zeroAmountMints.length} mints awarded 0 tokens`);
  
  return {
    totalMints: awardedLogs.length,
    zeroAmountMints: zeroAmountMints.length,
    diminishedMints: diminishingLogs.length,
    awardedLogs,
    diminishingLogs,
  };
}
