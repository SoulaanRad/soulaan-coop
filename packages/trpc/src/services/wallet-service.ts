import { createWalletClient, http, parseUnits, formatUnits, parseEther, formatEther, encodeFunctionData, createPublicClient, decodeEventLog, parseAbiItem, type Address } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { db } from '@repo/db';
import { trackReserveFromTransaction } from './treasury-reserve-service.js';
import { getTreasuryReserveFromTransaction } from './uc-event-parser.js';

// Environment configuration
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const WALLET_ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;
const BACKEND_WALLET_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY;
const UNITY_COIN_ADDRESS = process.env.UNITY_COIN_ADDRESS || '0xB52b287a83f3d370fdAC8c05f39da23522a51ec9';

// Minimum ETH balance for gas (0.0001 ETH = 100+ transactions on Base L2)
const MIN_GAS_BALANCE = parseEther('0.0001');
// Amount to fund when wallet is low on gas (~$1 USD worth of ETH)
const GAS_FUNDING_AMOUNT = parseEther('0.0003');



/**
 * Generate a new Ethereum wallet (EOA)
 * Returns address and private key
 */
export function createWallet(): { address: string; privateKey: string } {
  // Generate a random private key (hex string starting with 0x)
  const privateKey = generatePrivateKey();

  // Create account from private key
  const account = privateKeyToAccount(privateKey);

  return {
    address: account.address,
    privateKey,
  };
}

/**
 * Encrypt private key using AES-256-GCM
 * @param privateKey - The private key to encrypt
 * @returns Encrypted private key in format: iv:authTag:encryptedData (hex encoded)
 */
export function encryptPrivateKey(privateKey: string): string {
  if (!WALLET_ENCRYPTION_KEY) {
    throw new Error('WALLET_ENCRYPTION_KEY environment variable is required');
  }

  // Generate random IV (12 bytes for GCM)
  const iv = randomBytes(12);

  // Create cipher
  const key = Buffer.from(WALLET_ENCRYPTION_KEY, 'hex');
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  // Encrypt
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:encryptedData (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt private key using AES-256-GCM
 * @param encryptedData - Encrypted private key in format: iv:authTag:encryptedData
 * @returns Decrypted private key
 */
export function decryptPrivateKey(encryptedData: string): string {
  if (!WALLET_ENCRYPTION_KEY) {
    throw new Error('WALLET_ENCRYPTION_KEY environment variable is required');
  }

  // Parse encrypted data
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }

  // Convert from hex
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // Create decipher
  const key = Buffer.from(WALLET_ENCRYPTION_KEY, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Create a wallet for a user and store in database
 * @param userId - The user ID to create wallet for
 * @returns The wallet address
 */
export async function createWalletForUser(userId: string): Promise<string> {
  // Check if user already has a wallet
  const existingUser = await db.user.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
  });

  if (existingUser?.walletAddress) {
    throw new Error('User already has a wallet');
  }

  // Generate new wallet
  const wallet = createWallet();

  // Encrypt private key
  const encryptedKey = encryptPrivateKey(wallet.privateKey);

  // Update user with wallet info
  await db.user.update({
    where: { id: userId },
    data: {
      walletAddress: wallet.address,
      encryptedPrivateKey: encryptedKey,
      walletCreatedAt: new Date(),
    },
  });

  console.log(`✅ Created wallet ${wallet.address} for user ${userId}`);

  return wallet.address;
}

/**
 * Check if a private key is valid (hex string starting with 0x, 66 characters)
 */
function isValidPrivateKey(key: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(key);
}

/**
 * Get a user's wallet for transaction signing
 * @param userId - The user ID
 * @returns Wallet address and decrypted private key
 */
export async function getUserWallet(userId: string): Promise<{ address: string; privateKey: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { walletAddress: true, encryptedPrivateKey: true },
  });

  if (!user?.walletAddress || !user?.encryptedPrivateKey) {
    throw new Error('User does not have a wallet');
  }

  // Decrypt private key
  const privateKey = decryptPrivateKey(user.encryptedPrivateKey);

  // Validate the private key format
  if (!isValidPrivateKey(privateKey)) {
    console.warn(`⚠️ Invalid private key for user ${userId}, regenerating wallet...`);

    // Generate a new valid wallet
    const newWallet = createWallet();
    const encryptedKey = encryptPrivateKey(newWallet.privateKey);

    // Update user with new wallet
    await db.user.update({
      where: { id: userId },
      data: {
        walletAddress: newWallet.address,
        encryptedPrivateKey: encryptedKey,
        walletCreatedAt: new Date(),
      },
    });

    console.log(`✅ Regenerated wallet ${newWallet.address} for user ${userId}`);

    return {
      address: newWallet.address,
      privateKey: newWallet.privateKey,
    };
  }

  return {
    address: user.walletAddress,
    privateKey,
  };
}

/**
 * Send a transaction from a user's wallet
 * @param userId - The user ID
 * @param to - Recipient address
 * @param data - Transaction data (encoded function call)
 * @param value - Amount of ETH to send (optional)
 * @returns Transaction hash
 */
export async function sendTransaction(
  userId: string,
  to: Address,
  data: `0x${string}`,
  value?: bigint
): Promise<string> {
  // Get user's wallet
  const wallet = await getUserWallet(userId);

  // Create wallet client
  const account = privateKeyToAccount(wallet.privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  // Send transaction
  const txHash = await walletClient.sendTransaction({
    to,
    data,
    value: value ?? 0n,
  });

  console.log(`✅ Transaction sent: ${txHash}`);

  // Clear decrypted private key from memory (security best practice)
  // Note: This doesn't guarantee immediate garbage collection but helps
  const mutableWallet = wallet as { -readonly [K in keyof typeof wallet]: (typeof wallet)[K] | null };
  mutableWallet.privateKey = null;

  return txHash;
}

/**
 * Get a public client for blockchain queries
 */
export function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

/**
 * Get the ETH balance of a wallet address
 */
export async function getEthBalance(address: string): Promise<bigint> {
  const publicClient = getPublicClient();
  return publicClient.getBalance({ address: address as Address });
}

/**
 * Check if a wallet has enough ETH for gas
 */
export async function hasEnoughGas(address: string): Promise<boolean> {
  const balance = await getEthBalance(address);
  return balance >= MIN_GAS_BALANCE;
}

/**
 * Fund a wallet with ETH for gas from the backend wallet
 * @param toAddress - The wallet address to fund
 * @returns Transaction hash
 */
export async function fundWalletWithGas(toAddress: string): Promise<string> {
  // Debug: Log the key format (masked for security)
  const keyPreview = BACKEND_WALLET_PRIVATE_KEY
    ? `${BACKEND_WALLET_PRIVATE_KEY.slice(0, 6)}...${BACKEND_WALLET_PRIVATE_KEY.slice(-4)} (length: ${BACKEND_WALLET_PRIVATE_KEY.length})`
    : 'NOT SET';
  console.log(`🔑 BACKEND_WALLET_PRIVATE_KEY: ${keyPreview}`);

  if (!BACKEND_WALLET_PRIVATE_KEY) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
  }

  // Validate backend private key format
  if (!isValidPrivateKey(BACKEND_WALLET_PRIVATE_KEY)) {
    console.error(`❌ Invalid key format. Expected: 0x + 64 hex chars. Got: starts with "${BACKEND_WALLET_PRIVATE_KEY}", length ${BACKEND_WALLET_PRIVATE_KEY.length}`);
    throw new Error('BACKEND_WALLET_PRIVATE_KEY is invalid. Must be a hex string starting with 0x followed by 64 hex characters (e.g., 0x1234...abcd)');
  }

  console.log(`⛽ Funding wallet ${toAddress} with ${formatEther(GAS_FUNDING_AMOUNT)} ETH for gas...`);

  // Create backend wallet client
  const backendAccount = privateKeyToAccount(BACKEND_WALLET_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account: backendAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  // Send ETH to user's wallet
  const txHash = await walletClient.sendTransaction({
    to: toAddress as Address,
    value: GAS_FUNDING_AMOUNT,
  });

  console.log(`✅ Gas funding transaction sent: ${txHash}`);

  // Wait for confirmation
  const publicClient = getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  console.log(`✅ Gas funding confirmed for ${toAddress}`);

  return txHash;
}

/**
 * Ensure a wallet has enough gas, funding it if necessary
 * @param address - The wallet address to check/fund
 * @returns true if wallet now has gas, false if funding failed
 */
export async function ensureWalletHasGas(address: string): Promise<boolean> {
  const hasGas = await hasEnoughGas(address);

  if (hasGas) {
    return true;
  }

  try {
    await fundWalletWithGas(address);
    return true;
  } catch (error) {
    console.error(`❌ Failed to fund wallet ${address} with gas:`, error);
    return false;
  }
}

/**
 * Mint UnityCoin to a user's wallet (used for fiat onramp)
 * @param userId - The user ID to mint UC for
 * @param amountUC - Amount of UC to mint (in UC, not wei)
 * @returns Transaction hash
 */
export async function mintUCToUser(userId: string, amountUC: number): Promise<string> {
  // Debug: Log the key format (masked for security)
  const keyPreview = BACKEND_WALLET_PRIVATE_KEY
    ? `${BACKEND_WALLET_PRIVATE_KEY.slice(0, 6)}...${BACKEND_WALLET_PRIVATE_KEY.slice(-4)} (length: ${BACKEND_WALLET_PRIVATE_KEY.length})`
    : 'NOT SET';
  console.log(`🔑 BACKEND_WALLET_PRIVATE_KEY: ${keyPreview}`);

  if (!BACKEND_WALLET_PRIVATE_KEY) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
  }

  // Validate backend private key format
  if (!isValidPrivateKey(BACKEND_WALLET_PRIVATE_KEY)) {
    console.error(`❌ Invalid key format. Expected: 0x + 64 hex chars. Got: starts with "${BACKEND_WALLET_PRIVATE_KEY}", length ${BACKEND_WALLET_PRIVATE_KEY.length}`);
    throw new Error('BACKEND_WALLET_PRIVATE_KEY is invalid. Must be a hex string starting with 0x followed by 64 hex characters (e.g., 0x1234...abcd)');
  }

  // Get user's wallet address
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
  });

  if (!user?.walletAddress) {
    throw new Error('User does not have a wallet');
  }

  // Create backend wallet client (has BACKEND role for minting)
  const backendAccount = privateKeyToAccount(BACKEND_WALLET_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account: backendAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  // Encode mintOnramp function call
  // UnityCoin has 18 decimals
  const amountInWei = parseUnits(amountUC.toString(), 18);

  const txData = encodeFunctionData({
    abi: [
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
    ],
    functionName: 'mintOnramp',
    args: [user.walletAddress as Address, amountInWei],
  });

  // Send mint transaction
  const txHash = await walletClient.sendTransaction({
    to: UNITY_COIN_ADDRESS as Address,
    data: txData,
  });

  console.log(`✅ Minted ${amountUC} UC to ${user.walletAddress}, tx: ${txHash}`);

  // Wait for transaction confirmation
  const publicClient = getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  console.log(`✅ Mint transaction confirmed: ${txHash}`);

  return txHash;
}

// Soulaani Coin (SC) reward configuration
const SOULAANI_COIN_ADDRESS = process.env.SOULAANI_COIN_ADDRESS || '';
// 10 SC per $1 spent — with 100,000 SC seeded at deploy, 2% cap = ~2,000 SC per user.
// Tier thresholds: full rate until 500 SC, slowing at 1,000 SC, capped at 2,000 SC.
const SC_REWARD_RATE = 10; // 10 SC per USD

// SC Reward Reason Constants
export const SC_REWARD_REASONS = {
  STORE_PURCHASE: 'STORE_PURCHASE_REWARD',
  STORE_SALE: 'STORE_SALE_REWARD',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
  RENT_PAYMENT: 'RENT_PAYMENT_REWARD',
  COMMUNITY_SERVICE: 'COMMUNITY_SERVICE_REWARD',
  GENERAL: 'GENERAL_REWARD',
} as const;

/**
 * Calculate SC reward for a transaction
 * @param amountUSD - Transaction amount in USD
 * @returns SC reward amount (10 SC per $1 spent)
 */
export function calculateSCReward(amountUSD: number): number {
  return Math.round(amountUSD * SC_REWARD_RATE); // whole number SC
}

/**
 * Mint Soulaani Coin (SC) to a user's wallet as a reward
 * Called for qualifying transactions (e.g., store payments)
 * @param userId - The user ID to mint SC for
 * @param amountSC - Amount of SC to mint
 * @param reason - Reason for the reward (for logging)
 * @param sourceUcTxHash - Optional source UC transaction hash that triggered this reward
 * @returns Transaction hash
 */
export async function mintSCToUser(
  userId: string, 
  amountSC: number, 
  reason: string = 'transaction_reward', 
  sourceUcTxHash?: string,
  treasuryReserveAmountUC?: number
): Promise<{ txHash: string; actualAmountSC: number }> {
  const keyPreview = BACKEND_WALLET_PRIVATE_KEY
    ? `${BACKEND_WALLET_PRIVATE_KEY.slice(0, 6)}...${BACKEND_WALLET_PRIVATE_KEY.slice(-4)} (length: ${BACKEND_WALLET_PRIVATE_KEY.length})`
    : 'NOT SET';
  console.log(`🪙 SC Mint - BACKEND_WALLET_PRIVATE_KEY: ${keyPreview}`);

  if (!BACKEND_WALLET_PRIVATE_KEY) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
  }

  if (!isValidPrivateKey(BACKEND_WALLET_PRIVATE_KEY)) {
    console.error(`❌ Invalid key format for SC mint`);
    throw new Error('BACKEND_WALLET_PRIVATE_KEY is invalid');
  }

  // Get user's wallet address
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
  });

  if (!user?.walletAddress) {
    throw new Error('User does not have a wallet');
  }

  // Create backend wallet client (has BACKEND role for minting)
  const backendAccount = privateKeyToAccount(BACKEND_WALLET_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account: backendAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const publicClient = getPublicClient();

  // Check backend wallet has enough ETH for gas
  const backendBalance = await publicClient.getBalance({ address: backendAccount.address });
  const minGasBalance = parseEther('0.0001'); // Minimum 0.0001 ETH for gas
  
  console.log(`⛽ Backend wallet ETH balance: ${formatEther(backendBalance)} ETH`);
  
  if (backendBalance < minGasBalance) {
    throw new Error(`Backend wallet has insufficient ETH for gas. Balance: ${formatEther(backendBalance)} ETH. Please fund the wallet at ${backendAccount.address}`);
  }

  console.log(`🔍 Checking if ${user.walletAddress} is an active member...`);
  
  // Check if user is an active member
  const isActiveMember = await publicClient.readContract({
    address: SOULAANI_COIN_ADDRESS as Address,
    abi: [
      {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'isActiveMember',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'isActiveMember',
    args: [user.walletAddress as Address],
  });

  console.log(`👤 User ${user.walletAddress} active member status: ${isActiveMember}`);

  // If not an active member, throw an error - they need to be approved first
  if (!isActiveMember) {
    throw new Error(`User ${user.walletAddress} is not an active member. SC can only be minted to approved members.`);
  }

  // Encode mintReward function call
  // SoulaaniCoin has 18 decimals
  const amountInWei = parseUnits(amountSC.toString(), 18);
  
  // Convert reason string to bytes32 hash
  const reasonHash = `0x${Buffer.from(reason.toUpperCase().replace(/[^A-Z0-9_]/g, '_')).toString('hex').padEnd(64, '0')}` as `0x${string}`;

  console.log(`🔍 Reason hash: ${reasonHash}`);
  
  // Always require source UC tx for transaction-based rewards
  if (!sourceUcTxHash) {
    console.warn(`⚠️ No source UC tx provided for SC mint to ${user.walletAddress}. Using fallback mintReward.`);
  }
  
  // Convert source UC tx hash (0x-prefixed hex string) to bytes32
  const sourceUcTxHashBytes32 = sourceUcTxHash
    ? (sourceUcTxHash.startsWith('0x') 
        ? (sourceUcTxHash.padEnd(66, '0') as `0x${string}`)
        : (`0x${sourceUcTxHash}`.padEnd(66, '0') as `0x${string}`))
    : ('0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`);
  
  if (sourceUcTxHash) {
    console.log(`🔗 Source UC tx: ${sourceUcTxHashBytes32}`);
  }
  
  // Convert treasury reserve amount to wei (18 decimals)
  const treasuryReserveInWei = treasuryReserveAmountUC 
    ? parseUnits(treasuryReserveAmountUC.toString(), 18)
    : BigInt(0);
  
  if (treasuryReserveAmountUC && treasuryReserveAmountUC > 0) {
    console.log(`💰 Treasury reserve: ${treasuryReserveAmountUC} UC (${treasuryReserveInWei.toString()} wei)`);
  }
  
  // Always use mintRewardWithSource (pass zero hash if no source for manual/legacy cases)
  const txData = encodeFunctionData({
    abi: [
      {
        inputs: [
          { name: 'recipient', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'reason', type: 'bytes32' },
          { name: 'sourceUcTxHash', type: 'bytes32' },
          { name: 'treasuryReserveAmount', type: 'uint256' },
        ],
        name: 'mintRewardWithSource',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ],
    functionName: 'mintRewardWithSource',
    args: [user.walletAddress as Address, amountInWei, reasonHash, sourceUcTxHashBytes32, treasuryReserveInWei],
  });

  console.log(`🪙 Minting ${amountSC} SC (${amountInWei.toString()} wei) to ${user.walletAddress}...`);

  // Send mint transaction
  const txHash = await walletClient.sendTransaction({
    to: SOULAANI_COIN_ADDRESS as Address,
    data: txData,
  });

  console.log(`📝 Mint tx submitted: ${txHash}`);

  // Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  if (receipt.status === 'reverted') {
    throw new Error(`Transaction reverted: ${txHash}`);
  }

  console.log(`✅ SC Mint confirmed: ${txHash}`);

  // Parse the actual minted amount from the DiminishingRateApplied event.
  // The contract may mint less than requested when the pool balance ratio is high.
  let actualAmountSC = amountSC; // default to requested if event not found
  try {
    const DIMINISHING_RATE_EVENT = parseAbiItem(
      'event DiminishingRateApplied(address indexed recipient, uint256 requestedAmount, uint256 actualAmount, uint256 currentBalancePercent)'
    );
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: [DIMINISHING_RATE_EVENT], data: log.data, topics: log.topics });
        if (decoded.eventName === 'DiminishingRateApplied') {
          const args = decoded.args as { recipient: string; requestedAmount: bigint; actualAmount: bigint; currentBalancePercent: bigint };
          actualAmountSC = Number(formatUnits(args.actualAmount, 18));
          console.log(`📉 DiminishingRateApplied: requested ${amountSC} SC → actual ${actualAmountSC} SC (pool ratio: ${args.currentBalancePercent}%)`);
          break;
        }
      } catch {
        continue;
      }
    }
  } catch (parseErr) {
    console.warn('Could not parse DiminishingRateApplied event:', parseErr);
  }

  return { txHash, actualAmountSC };
}

/**
 * Award SC reward for a store payment transaction
 * Mints SC to both the customer (for shopping) and optionally the store owner (for being SC-verified)
 * @param customerId - The customer who made the payment
 * @param storeOwnerId - The store owner who received payment
 * @param amountUSD - Transaction amount in USD
 * @param storeIsScVerified - Whether the store is SC-verified
 * @param coopId - The coop ID for this transaction
 * @param orderId - Optional order ID for linking
 * @param storeId - Optional store ID for linking
 * @param sourceUcTxHash - Optional source UC transaction hash that triggered this reward
 * @param sourceType - Optional source type ('STORE_ORDER' | 'P2P_TRANSFER')
 * @param sourceRecordId - Optional source record ID (order.id or transfer.id)
 */
export async function awardStoreTransactionReward(
  customerId: string,
  storeOwnerId: string,
  amountUSD: number,
  storeIsScVerified: boolean,
  coopId: string,
  orderId?: string,
  storeId?: string,
  sourceUcTxHash?: string,
  sourceType?: string,
  sourceRecordId?: string
): Promise<{ 
  customerReward: number; 
  storeReward: number; 
  customerTxHash?: string; 
  storeTxHash?: string;
  customerRecordId?: string;
  storeRecordId?: string;
}> {
  const result: { 
    customerReward: number; 
    storeReward: number; 
    customerTxHash?: string; 
    storeTxHash?: string;
    customerRecordId?: string;
    storeRecordId?: string;
  } = {
    customerReward: 0,
    storeReward: 0,
  };

  // Only award SC for SC-verified stores
  if (!storeIsScVerified) {
    console.log(`🪙 Store not SC-verified, skipping SC reward`);
    return result;
  }

  const scReward = calculateSCReward(amountUSD);

  // Minimum reward threshold (avoid minting dust)
  if (scReward < 1) {
    console.log(`🪙 SC reward too small (${scReward}), skipping`);
    return result;
  }

  // Parse treasury reserve amount from UC transaction event (set aside automatically by UC contract)
  let treasuryReserveAmount = 0;
  if (sourceUcTxHash) {
    try {
      const reserveData = await getTreasuryReserveFromTransaction(sourceUcTxHash);
      if (reserveData) {
        treasuryReserveAmount = reserveData.reserveAmount;
        console.log(`💰 Treasury reserve from UC tx: ${treasuryReserveAmount} UC (${reserveData.reserveBps / 100}%)`);
      }
    } catch (error) {
      console.error(`⚠️ Failed to parse treasury reserve from UC tx (non-critical):`, error);
      // Continue without reserve amount - SC mint will still work
    }
  }

  // Pre-create PENDING records so failures are always tracked and retryable.
  // Use findFirst + create to honour the partial unique index on (sourceUcTxHash, userId, reason).
  const existingCustomer = sourceUcTxHash
    ? await db.sCRewardTransaction.findFirst({
        where: { sourceUcTxHash, userId: customerId, reason: SC_REWARD_REASONS.STORE_PURCHASE },
      })
    : null;

  let customerRecord = existingCustomer ?? await db.sCRewardTransaction.create({
    data: {
      userId: customerId,
      coopId,
      amountSC: scReward,
      reason: SC_REWARD_REASONS.STORE_PURCHASE,
      status: 'PENDING',
      relatedOrderId: orderId,
      relatedStoreId: storeId,
      sourceUcTxHash: sourceUcTxHash,
      sourceType: sourceType,
      sourceRecordId: sourceRecordId,
    },
  });

  const existingStore = sourceUcTxHash
    ? await db.sCRewardTransaction.findFirst({
        where: { sourceUcTxHash, userId: storeOwnerId, reason: SC_REWARD_REASONS.STORE_SALE },
      })
    : null;

  let storeOwnerRecord = existingStore ?? await db.sCRewardTransaction.create({
    data: {
      userId: storeOwnerId,
      coopId,
      amountSC: scReward,
      reason: SC_REWARD_REASONS.STORE_SALE,
      status: 'PENDING',
      relatedOrderId: orderId,
      relatedStoreId: storeId,
      sourceUcTxHash: sourceUcTxHash,
      sourceType: sourceType,
      sourceRecordId: sourceRecordId,
    },
  });

  result.customerRecordId = customerRecord.id;
  result.storeRecordId = storeOwnerRecord.id;

  // Mint SC for customer — update record to COMPLETED or FAILED
  if (customerRecord.status !== 'COMPLETED') {
    try {
      const { txHash: customerTxHash, actualAmountSC: customerActual } = await mintSCToUser(
        customerId,
        scReward,
        SC_REWARD_REASONS.STORE_PURCHASE,
        sourceUcTxHash,
        treasuryReserveAmount
      );
      result.customerReward = customerActual;
      result.customerTxHash = customerTxHash;
      customerRecord = await db.sCRewardTransaction.update({
        where: { id: customerRecord.id },
        data: {
          status: 'COMPLETED',
          txHash: customerTxHash,
          amountSC: customerActual, // store actual minted amount, not requested
          completedAt: new Date(),
          failureReason: null,
        },
      });
      console.log(`✅ Minted ${customerActual} SC (requested ${scReward}) to customer ${customerId} (record ${customerRecord.id})`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to mint SC for customer ${customerId}:`, msg);
      await db.sCRewardTransaction.update({
        where: { id: customerRecord.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: msg,
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
        },
      });
    }
  }

  // Mint SC for store owner — update record to COMPLETED or FAILED
  if (storeOwnerRecord.status !== 'COMPLETED') {
    try {
      const { txHash: storeTxHash, actualAmountSC: storeActual } = await mintSCToUser(
        storeOwnerId,
        scReward,
        SC_REWARD_REASONS.STORE_SALE,
        sourceUcTxHash,
        treasuryReserveAmount
      );
      result.storeReward = storeActual;
      result.storeTxHash = storeTxHash;
      storeOwnerRecord = await db.sCRewardTransaction.update({
        where: { id: storeOwnerRecord.id },
        data: {
          status: 'COMPLETED',
          txHash: storeTxHash,
          amountSC: storeActual, // store actual minted amount, not requested
          completedAt: new Date(),
          failureReason: null,
        },
      });
      console.log(`✅ Minted ${storeActual} SC (requested ${scReward}) to store owner ${storeOwnerId} (record ${storeOwnerRecord.id})`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to mint SC for store owner ${storeOwnerId}:`, msg);
      await db.sCRewardTransaction.update({
        where: { id: storeOwnerRecord.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: msg,
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
        },
      });
    }
  }

  // Track treasury reserve — always attempt if we have the source tx, idempotent
  if (sourceUcTxHash && sourceType && sourceRecordId) {
    try {
      const scRewardIds = [customerRecord.id, storeOwnerRecord.id];
      const reserveResult = await trackReserveFromTransaction({
        coopId,
        sourceType,
        sourceRecordId,
        sourceUcTxHash,
        transactionAmountUC: amountUSD,
        relatedScRewardIds: scRewardIds,
      });
      if (reserveResult) {
        console.log(`💰 Treasury reserve tracked: ${reserveResult.reserveAmountUC} UC from tx ${sourceUcTxHash}`);
      }
    } catch (error) {
      console.error(`❌ Failed to track treasury reserve (will retry automatically):`, error);
    }
  }

  return result;
}
