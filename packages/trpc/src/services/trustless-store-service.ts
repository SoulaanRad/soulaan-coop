/**
 * Trustless Store Payment Service
 * 
 * Handles verified store purchases through the StorePaymentRouter contract.
 * This service replaces the off-chain SC reward logic with on-chain execution.
 */

import { ethers } from "ethers";
import { TRPCError } from "@trpc/server";

// Typed contract method interfaces (for type-safe contract calls)
interface UnityCoinMethods {
  balanceOf(account: string): Promise<bigint>;
  allowance(owner: string, spender: string): Promise<bigint>;
  approve(spender: string, amount: bigint): Promise<ethers.ContractTransactionResponse>;
  transfer(to: string, amount: bigint): Promise<ethers.ContractTransactionResponse>;
}

interface StorePaymentRouterMethods {
  payVerifiedStore(storeOwner: string, amount: bigint, orderRef: string): Promise<ethers.ContractTransactionResponse>;
}

// Contract ABIs (minimal interfaces)
const STORE_PAYMENT_ROUTER_ABI = [
  "function payVerifiedStore(address storeOwner, uint256 amount, string calldata orderRef) external",
  "event VerifiedStorePurchase(address indexed buyer, address indexed storeOwner, uint256 amount, bytes32 indexed purchaseId, string orderRef, uint256 timestamp)",
  "event PurchaseFailed(address indexed buyer, address indexed storeOwner, uint256 amount, bytes32 indexed purchaseId, string reason)",
];

const UNITY_COIN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
];

const VERIFIED_STORE_REGISTRY_ABI = [
  "function isVerified(address storeOwner) external view returns (bool)",
  "function getStoreInfo(address storeOwner) external view returns (bool isVerified, bytes32 categoryKey, bytes32 storeKey, uint256 verifiedAt, uint256 updatedAt)",
];

const SC_REWARD_ENGINE_ABI = [
  "function calculateReward(address storeOwner, uint256 purchaseAmount) external view returns (uint256 reward, bytes32 policyKey)",
  "function globalPolicy() external view returns (uint256 percentageBps, uint256 fixedAmount, uint256 minPurchase, uint256 maxRewardPerTx, bool isActive)",
];

// Environment configuration
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const UNITY_COIN_ADDRESS = process.env.UNITY_COIN_ADDRESS;
const STORE_PAYMENT_ROUTER_ADDRESS = process.env.STORE_PAYMENT_ROUTER_ADDRESS;
const VERIFIED_STORE_REGISTRY_ADDRESS = process.env.VERIFIED_STORE_REGISTRY_ADDRESS;
const SC_REWARD_ENGINE_ADDRESS = process.env.SC_REWARD_ENGINE_ADDRESS;
const GOVERNANCE_BOT_PRIVATE_KEY = process.env.GOVERNANCE_BOT_PRIVATE_KEY;

if (!UNITY_COIN_ADDRESS || !STORE_PAYMENT_ROUTER_ADDRESS || !VERIFIED_STORE_REGISTRY_ADDRESS || !SC_REWARD_ENGINE_ADDRESS) {
  console.warn("⚠️  Trustless store contracts not configured. Set environment variables:");
  console.warn("   - UNITY_COIN_ADDRESS");
  console.warn("   - STORE_PAYMENT_ROUTER_ADDRESS");
  console.warn("   - VERIFIED_STORE_REGISTRY_ADDRESS");
  console.warn("   - SC_REWARD_ENGINE_ADDRESS");
}

// Initialize provider and contracts
let provider: ethers.JsonRpcProvider | null = null;
let signer: ethers.Wallet | null = null;
let routerContract: ethers.Contract | null = null;
let ucContract: ethers.Contract | null = null;
let registryContract: ethers.Contract | null = null;
let engineContract: ethers.Contract | null = null;

function initializeContracts() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }

  if (!signer && GOVERNANCE_BOT_PRIVATE_KEY) {
    signer = new ethers.Wallet(GOVERNANCE_BOT_PRIVATE_KEY, provider);
  }

  if (!routerContract && STORE_PAYMENT_ROUTER_ADDRESS) {
    routerContract = new ethers.Contract(
      STORE_PAYMENT_ROUTER_ADDRESS,
      STORE_PAYMENT_ROUTER_ABI,
      signer || provider
    );
  }

  if (!ucContract && UNITY_COIN_ADDRESS) {
    ucContract = new ethers.Contract(
      UNITY_COIN_ADDRESS,
      UNITY_COIN_ABI,
      signer || provider
    );
  }

  if (!registryContract && VERIFIED_STORE_REGISTRY_ADDRESS) {
    registryContract = new ethers.Contract(
      VERIFIED_STORE_REGISTRY_ADDRESS,
      VERIFIED_STORE_REGISTRY_ABI,
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
}

/**
 * Check if a store is verified on-chain
 */
export async function isStoreVerifiedOnChain(storeOwnerWallet: string): Promise<boolean> {
  try {
    initializeContracts();
    
    if (!registryContract) {
      console.warn("⚠️  Registry contract not initialized");
      return false;
    }

    const isVerified = await registryContract.isVerified(storeOwnerWallet);
    return isVerified;
  } catch (error) {
    console.error("❌ Error checking store verification:", error);
    return false;
  }
}

/**
 * Get store info from on-chain registry
 */
export async function getStoreInfoOnChain(storeOwnerWallet: string) {
  try {
    initializeContracts();
    
    if (!registryContract) {
      throw new Error("Registry contract not initialized");
    }

    const info = await registryContract.getStoreInfo(storeOwnerWallet);
    return {
      isVerified: info[0],
      categoryKey: info[1],
      storeKey: info[2],
      verifiedAt: info[3],
      updatedAt: info[4],
    };
  } catch (error) {
    console.error("❌ Error getting store info:", error);
    throw error;
  }
}

/**
 * Calculate expected SC reward for a purchase (preview)
 */
export async function calculateExpectedReward(
  storeOwnerWallet: string,
  amountUC: string
): Promise<{ reward: string; policyKey: string }> {
  try {
    initializeContracts();
    
    if (!engineContract) {
      throw new Error("Reward engine contract not initialized");
    }

    const amountWei = ethers.parseEther(amountUC);
    const result = await engineContract.calculateReward(storeOwnerWallet, amountWei);
    
    return {
      reward: ethers.formatEther(result[0]),
      policyKey: result[1],
    };
  } catch (error) {
    console.error("❌ Error calculating reward:", error);
    throw error;
  }
}

/**
 * Pay a verified store through the StorePaymentRouter
 * This is the canonical path for store purchases that trigger SC rewards
 * 
 * @param buyerWallet - Buyer's wallet address
 * @param storeOwnerWallet - Store owner's wallet address
 * @param amountUC - Amount in UC (as string, e.g., "10.5")
 * @param orderRef - External order reference (database order ID)
 * @param buyerPrivateKey - Buyer's private key for signing transaction
 * @returns Transaction hash and purchase ID
 */
export async function payVerifiedStore({
  buyerWallet,
  storeOwnerWallet,
  amountUC,
  orderRef,
  buyerPrivateKey,
}: {
  buyerWallet: string;
  storeOwnerWallet: string;
  amountUC: string;
  orderRef: string;
  buyerPrivateKey: string;
}): Promise<{
  transactionHash: string;
  purchaseId: string;
  blockNumber: number;
}> {
  try {
    initializeContracts();

    if (!provider || !routerContract || !ucContract || !STORE_PAYMENT_ROUTER_ADDRESS) {
      throw new Error("Contracts not initialized. Check environment variables.");
    }

    // Create buyer signer
    const buyerSigner = new ethers.Wallet(buyerPrivateKey, provider);

    // Convert amount to wei
    const amountWei = ethers.parseEther(amountUC);

    console.log("🏪 Paying verified store:");
    console.log("   Buyer:", buyerWallet);
    console.log("   Store:", storeOwnerWallet);
    console.log("   Amount:", amountUC, "UC");
    console.log("   Order Ref:", orderRef);

    // Check if store is verified
    const isVerified = await isStoreVerifiedOnChain(storeOwnerWallet);
    if (!isVerified) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Store is not verified on-chain for SC rewards",
      });
    }

    // Check buyer's UC balance
    const ucContractWithBuyer = ucContract.connect(buyerSigner) as unknown as UnityCoinMethods;
    const balance = await ucContractWithBuyer.balanceOf(buyerWallet);
    
    if (balance < amountWei) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Insufficient UC balance. Have: ${ethers.formatEther(balance)}, Need: ${amountUC}`,
      });
    }

    // Check and approve router if needed
    const currentAllowance = await ucContractWithBuyer.allowance(buyerWallet, STORE_PAYMENT_ROUTER_ADDRESS);
    
    if (currentAllowance < amountWei) {
      console.log("   Approving router to spend UC...");
      const approveTx = await ucContractWithBuyer.approve(STORE_PAYMENT_ROUTER_ADDRESS, amountWei);
      await approveTx.wait();
      console.log("   ✅ Approval complete");
    }

    // Execute payment through router
    console.log("   Executing payment through router...");
    const routerWithBuyer = routerContract.connect(buyerSigner) as unknown as StorePaymentRouterMethods;
    const tx = await routerWithBuyer.payVerifiedStore(storeOwnerWallet, amountWei, orderRef);
    
    console.log("   ⏳ Waiting for transaction confirmation...");
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Transaction receipt not available",
      });
    }

    console.log("   ✅ Payment complete!");
    console.log("   Tx Hash:", receipt.hash);
    console.log("   Block:", receipt.blockNumber);

    // Extract purchase ID from event
    let purchaseId = "";
    for (const log of receipt.logs) {
      try {
        const parsed = routerContract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === "VerifiedStorePurchase") {
          purchaseId = parsed.args.purchaseId;
          console.log("   Purchase ID:", purchaseId);
          break;
        }
      } catch (e) {
        // Not our event, skip
      }
    }

    return {
      transactionHash: receipt.hash,
      purchaseId,
      blockNumber: receipt.blockNumber,
    };
  } catch (error: any) {
    console.error("❌ Error paying verified store:", error);
    
    if (error instanceof TRPCError) {
      throw error;
    }
    
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message || "Failed to process store payment",
    });
  }
}

/**
 * Execute a personal UC transfer (not through router, no SC rewards)
 * This is for user-to-user transfers that should NOT trigger store rewards
 * 
 * @param senderWallet - Sender's wallet address
 * @param recipientWallet - Recipient's wallet address
 * @param amountUC - Amount in UC (as string)
 * @param senderPrivateKey - Sender's private key for signing
 * @returns Transaction hash
 */
export async function transferUCPersonal({
  senderWallet,
  recipientWallet,
  amountUC,
  senderPrivateKey,
}: {
  senderWallet: string;
  recipientWallet: string;
  amountUC: string;
  senderPrivateKey: string;
}): Promise<{
  transactionHash: string;
  blockNumber: number;
}> {
  try {
    initializeContracts();

    if (!provider || !ucContract) {
      throw new Error("Contracts not initialized. Check environment variables.");
    }

    if (!STORE_PAYMENT_ROUTER_ADDRESS) {
      throw new Error("STORE_PAYMENT_ROUTER_ADDRESS not configured");
    }

    // Create sender signer
    const senderSigner = new ethers.Wallet(senderPrivateKey, provider);
    const ucContractWithSender = ucContract.connect(senderSigner) as unknown as UnityCoinMethods;

    // Convert amount to wei
    const amountWei = ethers.parseEther(amountUC);

    console.log("💸 Personal UC transfer:");
    console.log("   From:", senderWallet);
    console.log("   To:", recipientWallet);
    console.log("   Amount:", amountUC, "UC");

    // Check balance
    const balance = await ucContractWithSender.balanceOf(senderWallet);
    if (balance < amountWei) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Insufficient UC balance. Have: ${ethers.formatEther(balance)}, Need: ${amountUC}`,
      });
    }

    // Execute transfer
    const tx = await ucContractWithSender.transfer(recipientWallet, amountWei);
    const receipt = await tx.wait();

    if (!receipt) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Transaction receipt not available",
      });
    }

    console.log("   ✅ Transfer complete!");
    console.log("   Tx Hash:", receipt.hash);

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error: any) {
    console.error("❌ Error executing personal transfer:", error);
    
    if (error instanceof TRPCError) {
      throw error;
    }
    
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message || "Failed to process transfer",
    });
  }
}

/**
 * Get global reward policy from on-chain engine
 */
export async function getGlobalRewardPolicy() {
  try {
    initializeContracts();
    
    if (!engineContract) {
      throw new Error("Reward engine contract not initialized");
    }

    const policy = await engineContract.globalPolicy();
    
    return {
      percentageBps: policy[0].toString(),
      percentageDisplay: (Number(policy[0]) / 100).toFixed(2) + "%",
      fixedAmount: ethers.formatEther(policy[1]),
      minPurchase: ethers.formatEther(policy[2]),
      maxRewardPerTx: policy[3] === 0n ? "unlimited" : ethers.formatEther(policy[3]),
      isActive: policy[4],
    };
  } catch (error) {
    console.error("❌ Error getting global policy:", error);
    throw error;
  }
}
