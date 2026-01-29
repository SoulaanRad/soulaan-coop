import { createWalletClient, http, parseUnits, parseEther, formatEther, encodeFunctionData, createPublicClient, type Address } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { db } from '@repo/db';

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
  Object.keys(wallet).forEach(key => {
    if (key === 'privateKey') {
      (wallet as any)[key] = null;
    }
  });

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
