/**
 * Event Indexer Service
 * 
 * Indexes on-chain events from trustless contracts and syncs to database.
 * Provides observability and auditability for the trustless system.
 */

import { ethers } from "ethers";
import { PrismaClient, Prisma } from "@repo/db";

// Event interfaces
interface VerifiedStorePurchaseEvent {
  buyer: string;
  storeOwner: string;
  amount: bigint;
  purchaseId: string;
  orderRef: string;
  timestamp: bigint;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
}

interface RewardExecutedEvent {
  buyer: string;
  storeOwner: string;
  purchaseAmount: bigint;
  buyerReward: bigint;
  storeReward: bigint;
  policyKey: string;
  purchaseId: string;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
}

interface RewardSkippedEvent {
  buyer: string;
  storeOwner: string;
  purchaseAmount: bigint;
  reason: string;
  purchaseId: string;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
}

// Metadata type definitions for database storage
// Using Prisma.JsonObject compatible types
interface PurchaseEventMetadata extends Record<string, Prisma.JsonValue> {
  eventId: string;
  buyer: string;
  storeOwner: string;
  amount: string;
  purchaseId: string;
  orderRef: string;
  timestamp: string;
  blockNumber: number;
}

interface RewardEventMetadata extends Record<string, Prisma.JsonValue> {
  eventId: string;
  buyer: string;
  storeOwner: string;
  amount: string;
  purchaseId: string;
  orderRef: string;
  timestamp: string;
  blockNumber: number;
  rewardEventId: string;
  buyerReward: string;
  storeReward: string;
  policyKey: string;
  rewardBlockNumber: number;
}

interface NewRewardMetadata extends Record<string, Prisma.JsonValue> {
  rewardEventId: string;
  buyer: string;
  storeOwner: string;
  purchaseAmount: string;
  buyerReward: string;
  storeReward: string;
  policyKey: string;
  purchaseId: string;
  rewardBlockNumber: number;
}

// Contract ABIs for event parsing
const STORE_PAYMENT_ROUTER_ABI = [
  "event VerifiedStorePurchase(address indexed buyer, address indexed storeOwner, uint256 amount, bytes32 indexed purchaseId, string orderRef, uint256 timestamp)",
  "event PurchaseFailed(address indexed buyer, address indexed storeOwner, uint256 amount, bytes32 indexed purchaseId, string reason)",
];

const SC_REWARD_ENGINE_ABI = [
  "event RewardExecuted(address indexed buyer, address indexed storeOwner, uint256 purchaseAmount, uint256 buyerReward, uint256 storeReward, bytes32 indexed policyKey, bytes32 purchaseId)",
  "event RewardSkipped(address indexed buyer, address indexed storeOwner, uint256 purchaseAmount, string reason, bytes32 purchaseId)",
  "event GlobalPolicyUpdated(uint256 percentageBps, uint256 fixedAmount, uint256 minPurchase, uint256 maxRewardPerTx, address indexed updatedBy)",
  "event CategoryPolicySet(bytes32 indexed categoryKey, uint256 percentageBps, uint256 fixedAmount, uint256 minPurchase, uint256 maxRewardPerTx, address indexed updatedBy)",
  "event StorePolicySet(bytes32 indexed storeKey, uint256 percentageBps, uint256 fixedAmount, uint256 minPurchase, uint256 maxRewardPerTx, address indexed updatedBy)",
];

const VERIFIED_STORE_REGISTRY_ABI = [
  "event StoreVerified(address indexed storeOwner, bytes32 indexed categoryKey, bytes32 indexed storeKey, address verifiedBy, uint256 timestamp)",
  "event StoreUnverified(address indexed storeOwner, address unverifiedBy, uint256 timestamp)",
  "event StoreCategoryUpdated(address indexed storeOwner, bytes32 oldCategoryKey, bytes32 newCategoryKey, address updatedBy, uint256 timestamp)",
];

// Environment configuration
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const STORE_PAYMENT_ROUTER_ADDRESS = process.env.STORE_PAYMENT_ROUTER_ADDRESS;
const SC_REWARD_ENGINE_ADDRESS = process.env.SC_REWARD_ENGINE_ADDRESS;
const VERIFIED_STORE_REGISTRY_ADDRESS = process.env.VERIFIED_STORE_REGISTRY_ADDRESS;
const CHAIN_ID = 84532; // Base Sepolia

let provider: ethers.JsonRpcProvider | null = null;
let routerContract: ethers.Contract | null = null;
let engineContract: ethers.Contract | null = null;
let registryContract: ethers.Contract | null = null;

function initializeContracts() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }

  if (!routerContract && STORE_PAYMENT_ROUTER_ADDRESS) {
    routerContract = new ethers.Contract(
      STORE_PAYMENT_ROUTER_ADDRESS,
      STORE_PAYMENT_ROUTER_ABI,
      provider
    );
  }

  if (!engineContract && SC_REWARD_ENGINE_ADDRESS) {
    engineContract = new ethers.Contract(
      SC_REWARD_ENGINE_ADDRESS,
      SC_REWARD_ENGINE_ABI,
      provider
    );
  }

  if (!registryContract && VERIFIED_STORE_REGISTRY_ADDRESS) {
    registryContract = new ethers.Contract(
      VERIFIED_STORE_REGISTRY_ADDRESS,
      VERIFIED_STORE_REGISTRY_ABI,
      provider
    );
  }
}

/**
 * Generate canonical event ID for deduplication
 */
function generateEventId(
  chainId: number,
  blockNumber: number,
  txHash: string,
  logIndex: number
): string {
  return `${chainId}:${blockNumber}:${txHash}:${logIndex}`;
}

/**
 * Index VerifiedStorePurchase events
 */
export async function indexPurchaseEvents(
  db: PrismaClient,
  fromBlock: number,
  toBlock: number
): Promise<number> {
  try {
    initializeContracts();

    if (!routerContract) {
      console.warn("⚠️  Router contract not initialized");
      return 0;
    }

    console.log(`📥 Indexing purchase events from block ${fromBlock} to ${toBlock}...`);

    const filter = routerContract.filters.VerifiedStorePurchase();
    const events = await routerContract.queryFilter(filter, fromBlock, toBlock);

    let indexed = 0;

    for (const event of events) {
      if (!('args' in event)) continue;
      const args = event.args;
      if (!args) continue;

      const eventId = generateEventId(
        CHAIN_ID,
        event.blockNumber,
        event.transactionHash,
        event.index
      );

      // Check if already indexed
      const existing = await db.sCRewardTransaction.findUnique({
        where: { txHash: event.transactionHash },
      });

      if (existing) {
        console.log(`   ⏭️  Already indexed: ${eventId}`);
        continue;
      }

      // Create or update SC reward transaction record
      await db.sCRewardTransaction.create({
        data: {
          userId: "", // Will be linked by wallet address lookup
          amountSC: parseFloat(ethers.formatEther(args.amount)),
          reason: "STORE_PURCHASE_REWARD",
          status: "PENDING", // Will be updated when reward event is indexed
          txHash: event.transactionHash,
          metadata: {
            eventId,
            buyer: args.buyer,
            storeOwner: args.storeOwner,
            amount: ethers.formatEther(args.amount),
            purchaseId: args.purchaseId,
            orderRef: args.orderRef,
            timestamp: args.timestamp.toString(),
            blockNumber: event.blockNumber,
          },
        },
      });

      indexed++;
      console.log(`   ✅ Indexed purchase: ${args.orderRef} (${ethers.formatEther(args.amount)} UC)`);
    }

    console.log(`✅ Indexed ${indexed} purchase events`);
    return indexed;
  } catch (error) {
    console.error("❌ Error indexing purchase events:", error);
    throw error;
  }
}

/**
 * Index RewardExecuted events
 */
export async function indexRewardEvents(
  db: PrismaClient,
  fromBlock: number,
  toBlock: number
): Promise<number> {
  try {
    initializeContracts();

    if (!engineContract) {
      console.warn("⚠️  Engine contract not initialized");
      return 0;
    }

    console.log(`📥 Indexing reward events from block ${fromBlock} to ${toBlock}...`);

    const filter = engineContract.filters.RewardExecuted();
    const events = await engineContract.queryFilter(filter, fromBlock, toBlock);

    let indexed = 0;

    for (const event of events) {
      if (!('args' in event)) continue;
      const args = event.args;
      if (!args) continue;

      const eventId = generateEventId(
        CHAIN_ID,
        event.blockNumber,
        event.transactionHash,
        event.index
      );

      // Find corresponding purchase record by purchaseId in metadata
      const purchaseRecord = await db.sCRewardTransaction.findFirst({
        where: {
          metadata: {
            path: ["purchaseId"],
            equals: args.purchaseId,
          },
        },
      });

      if (purchaseRecord) {
        // Update existing record with reward execution details
        const existingMetadata = (purchaseRecord.metadata as Prisma.JsonObject) || {};
        const updatedMetadata: Prisma.JsonObject = {
          ...existingMetadata,
          rewardEventId: eventId,
          buyerReward: ethers.formatEther(args.buyerReward),
          storeReward: ethers.formatEther(args.storeReward),
          policyKey: args.policyKey,
          rewardBlockNumber: event.blockNumber,
        };
        
        await db.sCRewardTransaction.update({
          where: { id: purchaseRecord.id },
          data: {
            status: "COMPLETED",
            amountSC: parseFloat(ethers.formatEther(args.buyerReward)),
            completedAt: new Date(),
            metadata: updatedMetadata,
          },
        });

        console.log(`   ✅ Updated reward: ${ethers.formatEther(args.buyerReward)} SC`);
      } else {
        // Create new record if purchase wasn't indexed yet
        const newMetadata: Prisma.JsonObject = {
          rewardEventId: eventId,
          buyer: args.buyer,
          storeOwner: args.storeOwner,
          purchaseAmount: ethers.formatEther(args.purchaseAmount),
          buyerReward: ethers.formatEther(args.buyerReward),
          storeReward: ethers.formatEther(args.storeReward),
          policyKey: args.policyKey,
          purchaseId: args.purchaseId,
          rewardBlockNumber: event.blockNumber,
        };
        
        await db.sCRewardTransaction.create({
          data: {
            userId: "", // Will be linked by wallet address lookup
            amountSC: parseFloat(ethers.formatEther(args.buyerReward)),
            reason: "STORE_PURCHASE_REWARD",
            status: "COMPLETED",
            txHash: event.transactionHash,
            completedAt: new Date(),
            metadata: newMetadata,
          },
        });

        console.log(`   ✅ Indexed reward (no purchase): ${ethers.formatEther(args.buyerReward)} SC`);
      }

      indexed++;
    }

    console.log(`✅ Indexed ${indexed} reward events`);
    return indexed;
  } catch (error) {
    console.error("❌ Error indexing reward events:", error);
    throw error;
  }
}

/**
 * Index RewardSkipped events
 */
export async function indexSkippedRewardEvents(
  db: PrismaClient,
  fromBlock: number,
  toBlock: number
): Promise<number> {
  try {
    initializeContracts();

    if (!engineContract) {
      console.warn("⚠️  Engine contract not initialized");
      return 0;
    }

    console.log(`📥 Indexing skipped reward events from block ${fromBlock} to ${toBlock}...`);

    const filter = engineContract.filters.RewardSkipped();
    const events = await engineContract.queryFilter(filter, fromBlock, toBlock);

    let indexed = 0;

    for (const event of events) {
      if (!('args' in event)) continue;
      const args = event.args;
      if (!args) continue;

      // Find corresponding purchase record
      const purchaseRecord = await db.sCRewardTransaction.findFirst({
        where: {
          metadata: {
            path: ["purchaseId"],
            equals: args.purchaseId,
          },
        },
      });

      if (purchaseRecord) {
        // Update with skip reason
        const existingMetadata = (purchaseRecord.metadata as Prisma.JsonObject) || {};
        const updatedMetadata: Prisma.JsonObject = {
          ...existingMetadata,
          skipReason: args.reason,
          skipBlockNumber: event.blockNumber,
        };
        
        await db.sCRewardTransaction.update({
          where: { id: purchaseRecord.id },
          data: {
            status: "FAILED",
            failureReason: args.reason,
            failedAt: new Date(),
            metadata: updatedMetadata,
          },
        });

        console.log(`   ⏭️  Reward skipped: ${args.reason}`);
      }

      indexed++;
    }

    console.log(`✅ Indexed ${indexed} skipped reward events`);
    return indexed;
  } catch (error) {
    console.error("❌ Error indexing skipped reward events:", error);
    throw error;
  }
}

/**
 * Get last indexed block from database
 */
export async function getLastIndexedBlock(db: PrismaClient): Promise<number> {
  try {
    // Check for a system config table or use a default
    // For now, return a safe default (contract deployment block)
    const deploymentBlock = parseInt(process.env.TRUSTLESS_DEPLOYMENT_BLOCK || "0");
    
    // Query latest block from indexed events
    const latestEvent = await db.sCRewardTransaction.findFirst({
      where: {
        metadata: {
          not: Prisma.DbNull,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (latestEvent && latestEvent.metadata) {
      const metadata = latestEvent.metadata as Prisma.JsonObject;
      const blockNumber = metadata.blockNumber || metadata.rewardBlockNumber;
      if (typeof blockNumber === 'number') {
        return blockNumber;
      } else if (typeof blockNumber === 'string') {
        return parseInt(blockNumber, 10);
      }
    }

    return deploymentBlock;
  } catch (error) {
    console.error("❌ Error getting last indexed block:", error);
    return 0;
  }
}

/**
 * Run full indexing cycle
 */
export async function runIndexingCycle(db: PrismaClient): Promise<void> {
  try {
    initializeContracts();

    if (!provider) {
      throw new Error("Provider not initialized");
    }

    const currentBlock = await provider.getBlockNumber();
    const lastIndexed = await getLastIndexedBlock(db);
    const fromBlock = lastIndexed + 1;
    const toBlock = currentBlock;

    if (fromBlock > toBlock) {
      console.log("✅ Already up to date");
      return;
    }

    console.log(`\n🔄 Running indexing cycle: blocks ${fromBlock} to ${toBlock}`);

    // Index in order: purchases, rewards, skipped
    await indexPurchaseEvents(db, fromBlock, toBlock);
    await indexRewardEvents(db, fromBlock, toBlock);
    await indexSkippedRewardEvents(db, fromBlock, toBlock);

    console.log(`\n✅ Indexing cycle complete. Current block: ${currentBlock}\n`);
  } catch (error) {
    console.error("❌ Error running indexing cycle:", error);
    throw error;
  }
}

/**
 * Start continuous indexing (for background job)
 */
export async function startContinuousIndexing(
  db: PrismaClient,
  intervalMs: number = 60000 // Default: 1 minute
): Promise<void> {
  console.log(`🚀 Starting continuous event indexing (interval: ${intervalMs}ms)...`);

  // Run immediately
  await runIndexingCycle(db);

  // Then run on interval
  setInterval(async () => {
    try {
      await runIndexingCycle(db);
    } catch (error) {
      console.error("❌ Indexing cycle failed:", error);
      // Continue running despite errors
    }
  }, intervalMs);
}
