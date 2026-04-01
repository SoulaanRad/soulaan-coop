import { createPublicClient, http, type Address, type Chain } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { recoverMessageAddress } from 'viem';

// Legacy fallback addresses (only used if CoopConfig not available)
const UNITY_COIN_ADDRESS = (process.env.UNITY_COIN_ADDRESS || '0xB52b287a83f3d370fdAC8c05f39da23522a51ec9') as Address;
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';

// AccessControl role hashes
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const TREASURER_MINT_ROLE = '0xa6e3e70ca7dbfd8f74c36ef0f84e6cd5f5b4b0c88b4f05f4f7e4e0e6b6e0e0a1'; // keccak256("TREASURER_MINT")
const PAUSER_ROLE = '0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a'; // keccak256("PAUSER")

// UnityCoin ABI (just the parts we need)
const unityCoinABI = [
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    name: 'hasRole',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'role', type: 'bytes32' }],
    name: 'getRoleMemberCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'index', type: 'uint256' }
    ],
    name: 'getRoleMember',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'isActiveMember',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Safe (Gnosis Safe) ABI for checking multisig owners
const safeABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'isOwner',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getOwners',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Create default public client for reading blockchain (Base Sepolia)
const defaultPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

/**
 * Check if an address is an owner of the Treasury Safe multisig
 */
export async function isTreasurySafeOwner(address: Address, treasurySafeAddress: Address, publicClient: any): Promise<boolean> {
  try {
    console.log(`🔍 Checking if ${address} is owner of Treasury Safe (${treasurySafeAddress})...`);

    const isOwner = await publicClient.readContract({
      address: treasurySafeAddress,
      abi: safeABI,
      functionName: 'isOwner',
      args: [address],
    });

    if (isOwner) {
      console.log(`✅ ${address} is Treasury Safe owner`);
      return true;
    }

    console.log(`❌ ${address} is not a Treasury Safe owner`);
    return false;
  } catch (error) {
    console.error('Error checking Treasury Safe owner status:', error);
    return false;
  }
}

/**
 * Check admin status with role details (for web app)
 * Loads contract addresses from CoopConfig and verifies admin has the coin
 */
export async function checkAdminStatusWithRole(address: Address, coopId: string): Promise<{ isAdmin: boolean; role?: string }> {
  try {
    console.log(`\n🔍 ========== ADMIN CHECK START (API SERVER) ==========`);
    console.log(`   Address: ${address}`);
    console.log(`   Coop ID: ${coopId}`);

    // Load coop config to get contract addresses
    const { db } = await import('@repo/db');
    const coopConfig = await db.coopConfig.findFirst({
      where: { coopId, isActive: true },
      orderBy: { version: 'desc' },
      select: { 
        scTokenAddress: true, 
        treasurySafeAddress: true,
        chainId: true,
        rpcUrl: true,
      },
    });

    if (!coopConfig?.scTokenAddress) {
      console.error(`❌ No SC token address configured for coop: ${coopId}`);
      console.log('🔍 ========== ADMIN CHECK END (NO CONFIG) ==========\n');
      return { isAdmin: false };
    }

    const scTokenAddress = coopConfig.scTokenAddress as Address;
    const treasurySafeAddress = coopConfig.treasurySafeAddress as Address | undefined;
    
    console.log(`   SC Token Address: ${scTokenAddress}`);
    console.log(`   Treasury Safe Address: ${treasurySafeAddress || 'not configured'}`);
    console.log(`   Chain ID: ${coopConfig.chainId}`);

    // Create appropriate client based on chain
    const client = coopConfig.chainId === 8453
      ? createPublicClient({ chain: base, transport: http(coopConfig.rpcUrl || base.rpcUrls.default.http[0]) })
      : defaultPublicClient;

    // PRIORITY 1: Check if address is owner of Treasury Safe multisig (most important!)
    if (treasurySafeAddress) {
      console.log('\n📋 PRIORITY 1: Treasury Safe Owner Check');

      const isSafeOwner = await isTreasurySafeOwner(address, treasurySafeAddress, client);
      if (isSafeOwner) {
        // Verify admin also has the coin
        const balance = await client.readContract({
          address: scTokenAddress,
          abi: unityCoinABI,
          functionName: 'balanceOf',
          args: [address],
        });

        if (balance > 0n) {
          console.log(`✅ ${address} is Treasury Safe owner AND has coin balance: ${balance.toString()}`);
          console.log('🔍 ========== ADMIN CHECK END (ADMIN FOUND) ==========\n');
          return { isAdmin: true, role: 'Treasury Safe Owner' };
        } else {
          console.log(`⚠️ ${address} is Treasury Safe owner but has NO coin balance`);
        }
      }
    }

    // PRIORITY 2: Check if address has DEFAULT_ADMIN_ROLE on Soulaani Coin
    console.log('\n📋 PRIORITY 2: Soulaani Coin Admin Check');

    const isDefaultAdminSoulaani = await client.readContract({
      address: scTokenAddress,
      abi: unityCoinABI,
      functionName: 'hasRole',
      args: [DEFAULT_ADMIN_ROLE as `0x${string}`, address],
    });

    if (isDefaultAdminSoulaani) {
      // Verify admin also has the coin
      const balance = await client.readContract({
        address: scTokenAddress,
        abi: unityCoinABI,
        functionName: 'balanceOf',
        args: [address],
      });

      if (balance > 0n) {
        console.log(`✅ ${address} is DEFAULT_ADMIN on Soulaani Coin AND has coin balance: ${balance.toString()}`);
        console.log('🔍 ========== ADMIN CHECK END (ADMIN FOUND) ==========\n');
        return { isAdmin: true, role: 'Soulaani Coin Admin' };
      } else {
        console.log(`⚠️ ${address} has DEFAULT_ADMIN_ROLE but NO coin balance`);
      }
    }

    console.log('\n❌ No admin roles found (or admin has no coin balance)');
    console.log('🔍 ========== ADMIN CHECK END (NOT ADMIN) ==========\n');
    return { isAdmin: false };
  } catch (error) {
    console.error('❌ Error checking admin status with role:', error);
    console.log('🔍 ========== ADMIN CHECK END (ERROR) ==========\n');
    return { isAdmin: false };
  }
}

/**
 * Check if an address has any admin role on the UnityCoin/Soulaani contract or is a Treasury Safe owner
 * @deprecated Use checkAdminStatusWithRole instead for coop-specific checks
 */
export async function isContractAdmin(address: Address, coopId: string = 'soulaan'): Promise<boolean> {
  try {
    console.log(`🔍 Checking if ${address} has admin privileges for coop ${coopId}...`);

    // Load coop config to get contract addresses
    const { db } = await import('@repo/db');
    const coopConfig = await db.coopConfig.findFirst({
      where: { coopId, isActive: true },
      orderBy: { version: 'desc' },
      select: { 
        scTokenAddress: true, 
        treasurySafeAddress: true,
        chainId: true,
        rpcUrl: true,
      },
    });

    if (!coopConfig?.scTokenAddress) {
      console.log(`❌ No SC token configured for coop: ${coopId}`);
      return false;
    }

    const scTokenAddress = coopConfig.scTokenAddress as Address;
    const treasurySafeAddress = coopConfig.treasurySafeAddress as Address | undefined;

    // Create appropriate client
    const client = coopConfig.chainId === 8453
      ? createPublicClient({ chain: base, transport: http(coopConfig.rpcUrl || base.rpcUrls.default.http[0]) })
      : defaultPublicClient;

    // PRIORITY 1: Check if address is owner of Treasury Safe multisig
    if (treasurySafeAddress) {
      const isSafeOwner = await isTreasurySafeOwner(address, treasurySafeAddress, client);
      if (isSafeOwner) {
        return true;
      }
    }

    // PRIORITY 2: Check DEFAULT_ADMIN_ROLE on Soulaani Coin contract
    const isDefaultAdminSoulaani = await client.readContract({
      address: scTokenAddress,
      abi: unityCoinABI,
      functionName: 'hasRole',
      args: [DEFAULT_ADMIN_ROLE as `0x${string}`, address],
    });

    if (isDefaultAdminSoulaani) {
      console.log(`✅ ${address} is DEFAULT_ADMIN on Soulaani Coin`);
      return true;
    }

    // PRIORITY 3: Check DEFAULT_ADMIN_ROLE on Unity Coin contract (legacy fallback)
    const isDefaultAdmin = await defaultPublicClient.readContract({
      address: UNITY_COIN_ADDRESS,
      abi: unityCoinABI,
      functionName: 'hasRole',
      args: [DEFAULT_ADMIN_ROLE as `0x${string}`, address],
    });

    if (isDefaultAdmin) {
      console.log(`✅ ${address} is DEFAULT_ADMIN on Unity Coin (legacy)`);
      return true;
    }

    console.log(`❌ ${address} has no admin roles`);
    return false;
  } catch (error) {
    console.error('Error checking contract admin status:', error);
    return false;
  }
}

/**
 * Get all admin addresses from Treasury Safe and coin contracts
 */
export async function getAllAdmins(coopId: string = 'soulaan'): Promise<Address[]> {
  try {
    const admins = new Set<Address>();

    // Load coop config to get contract addresses
    const { db } = await import('@repo/db');
    const coopConfig = await db.coopConfig.findFirst({
      where: { coopId, isActive: true },
      orderBy: { version: 'desc' },
      select: { 
        scTokenAddress: true, 
        treasurySafeAddress: true,
        chainId: true,
        rpcUrl: true,
      },
    });

    if (!coopConfig?.scTokenAddress) {
      console.log(`❌ No SC token configured for coop: ${coopId}`);
      return [];
    }

    const scTokenAddress = coopConfig.scTokenAddress as Address;
    const treasurySafeAddress = coopConfig.treasurySafeAddress as Address | undefined;

    // Create appropriate client
    const client = coopConfig.chainId === 8453
      ? createPublicClient({ chain: base, transport: http(coopConfig.rpcUrl || base.rpcUrls.default.http[0]) })
      : defaultPublicClient;

    // PRIORITY 1: Get Treasury Safe owners (most important!)
    if (treasurySafeAddress) {
      try {
        const safeOwners = await client.readContract({
          address: treasurySafeAddress,
          abi: safeABI,
          functionName: 'getOwners',
        });

        for (const owner of safeOwners) {
          admins.add(owner as Address);
        }
        console.log(`✅ Found ${safeOwners.length} Treasury Safe owners`);
      } catch (error) {
        console.error('Error fetching Treasury Safe owners:', error);
      }
    }

    // PRIORITY 2: Get DEFAULT_ADMIN members from Soulaani Coin
    try {
      const defaultAdminCountSoulaani = await client.readContract({
        address: scTokenAddress,
        abi: unityCoinABI,
        functionName: 'getRoleMemberCount',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`],
      });

      for (let i = 0; i < Number(defaultAdminCountSoulaani); i++) {
        const member = await client.readContract({
          address: scTokenAddress,
          abi: unityCoinABI,
          functionName: 'getRoleMember',
          args: [DEFAULT_ADMIN_ROLE as `0x${string}`, BigInt(i)],
        });
        admins.add(member as Address);
      }
      console.log(`✅ Found ${defaultAdminCountSoulaani} Soulaani Coin admins`);
    } catch (error) {
      console.error('Error fetching Soulaani Coin admins:', error);
    }

    // PRIORITY 3: Get DEFAULT_ADMIN members from Unity Coin (legacy fallback)
    try {
      const defaultAdminCount = await defaultPublicClient.readContract({
        address: UNITY_COIN_ADDRESS,
        abi: unityCoinABI,
        functionName: 'getRoleMemberCount',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`],
      });

      for (let i = 0; i < Number(defaultAdminCount); i++) {
        const member = await defaultPublicClient.readContract({
          address: UNITY_COIN_ADDRESS,
          abi: unityCoinABI,
          functionName: 'getRoleMember',
          args: [DEFAULT_ADMIN_ROLE as `0x${string}`, BigInt(i)],
        });
        admins.add(member as Address);
      }
      console.log(`✅ Found ${defaultAdminCount} Unity Coin admins (legacy)`);
    } catch (error) {
      console.error('Error fetching Unity Coin admins:', error);
    }

    return Array.from(admins);
  } catch (error) {
    console.error('Error getting all admins:', error);
    return [];
  }
}

/**
 * Verify a wallet signature and check if the signer is an admin
 */
export async function verifyAdminSignature(
  message: string,
  signature: `0x${string}`,
  expectedAddress: Address,
  coopId: string = 'soulaan'
): Promise<{ valid: boolean; isAdmin: boolean; address?: Address }> {
  try {
    console.log(`🔐 Verifying signature for message: "${message}"`);

    // Recover the address from the signature
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature,
    });

    console.log(`📧 Recovered address: ${recoveredAddress}`);
    console.log(`📧 Expected address: ${expectedAddress}`);

    // Check if recovered address matches expected
    const addressMatches = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();

    if (!addressMatches) {
      console.log('❌ Address mismatch');
      return { valid: false, isAdmin: false };
    }

    // Check if address has admin role on contract
    const isAdmin = await isContractAdmin(recoveredAddress, coopId);

    return {
      valid: true,
      isAdmin,
      address: recoveredAddress,
    };
  } catch (error) {
    console.error('Error verifying admin signature:', error);
    return { valid: false, isAdmin: false };
  }
}

/**
 * Generate a challenge message for wallet authentication
 */
export function generateAuthChallenge(nonce: string): string {
  const timestamp = new Date().toISOString();
  return `Sign this message to authenticate as admin:\n\nNonce: ${nonce}\nTimestamp: ${timestamp}\n\nI verify that I am an administrator of the Soulaan Co-op.`;
}

/**
 * Check if a wallet has portal access (admin OR has Soulaani Coin)
 * This is the main function used by the web app for authentication
 */
export async function checkPortalAccess(address: Address, coopId: string = 'soulaan'): Promise<{ hasAccess: boolean; isAdmin: boolean; role?: string }> {
  try {
    console.log(`\n🔍 ========== PORTAL ACCESS CHECK (API SERVER) ==========`);
    console.log(`   Address: ${address}`);
    console.log(`   Coop ID: ${coopId}`);

    // FIRST: Check if user is an admin (loads config internally and verifies coin balance)
    const adminStatus = await checkAdminStatusWithRole(address, coopId);
    if (adminStatus.isAdmin) {
      console.log(`✅ Portal access granted via ADMIN status: ${adminStatus.role}`);
      console.log('🔍 ========== PORTAL ACCESS CHECK END ==========\n');
      return { hasAccess: true, isAdmin: true, role: adminStatus.role };
    }

    // SECOND: Check SoulaaniCoin balance for regular members
    console.log('\n📋 Checking Soulaani Coin balance for regular member access...');
    
    // Get coop-specific contract address from database
    const { db } = await import('@repo/db');
    const coopConfig = await db.coopConfig.findFirst({
      where: { coopId, isActive: true },
      orderBy: { version: 'desc' },
      select: { scTokenAddress: true, chainId: true, rpcUrl: true },
    });

    if (!coopConfig?.scTokenAddress) {
      console.error(`❌ No SC token address configured for coop: ${coopId}`);
      console.log('🔍 ========== PORTAL ACCESS CHECK END ==========\n');
      return { hasAccess: false, isAdmin: false };
    }

    const scTokenAddress = coopConfig.scTokenAddress as Address;
    console.log(`   Soulaani Coin Address (from CoopConfig): ${scTokenAddress}`);
    console.log(`   Chain ID: ${coopConfig.chainId}`);
    console.log(`   RPC URL: ${coopConfig.rpcUrl || 'default'}`);

    // Create a dynamic client for the coop's network based on chainId
    const getCoopPublicClient = () => {
      if (!coopConfig.chainId || coopConfig.chainId === baseSepolia.id) {
        return defaultPublicClient;
      }
      
      if (coopConfig.chainId === 8453) {
        // Base Mainnet
        const rpcUrl = coopConfig.rpcUrl || base.rpcUrls.default.http[0];
        console.log(`   Creating dynamic client for Base Mainnet (8453)`);
        return createPublicClient({
          chain: base,
          transport: http(rpcUrl),
        });
      }
      
      // Default to Base Sepolia for unknown chains
      const rpcUrl = coopConfig.rpcUrl || baseSepolia.rpcUrls.default.http[0];
      console.log(`   Creating dynamic client for chain ${coopConfig.chainId}`);
      return createPublicClient({
        chain: baseSepolia,
        transport: http(rpcUrl),
      });
    };
    
    const coopPublicClient = getCoopPublicClient();

    try {
      // Read balance from contract using the coop-specific client
      const balance = await coopPublicClient.readContract({
        address: scTokenAddress,
        abi: unityCoinABI,
        functionName: 'balanceOf',
        args: [address],
      });

      // Check if user is an active member
      const isActive = await coopPublicClient.readContract({
        address: scTokenAddress,
        abi: unityCoinABI,
        functionName: 'isActiveMember',
        args: [address],
      });

      const hasCoinAccess = balance > 0n && isActive;

      if (hasCoinAccess) {
        console.log(`✅ Portal access granted via Soulaani Coin balance: ${balance.toString()}`);
        console.log('🔍 ========== PORTAL ACCESS CHECK END ==========\n');
        return { hasAccess: true, isAdmin: false };
      } else {
        console.log(`❌ No Soulaani Coin access: balance=${balance.toString()}, isActive=${isActive}`);
      }
    } catch (error) {
      console.error('❌ Error checking Soulaani Coin balance:', error);
    }

    console.log('\n❌ Portal access DENIED - No admin role and no Soulaani Coin');
    console.log('🔍 ========== PORTAL ACCESS CHECK END ==========\n');
    return { hasAccess: false, isAdmin: false };
  } catch (error) {
    console.error('❌ FATAL ERROR in checkPortalAccess:', error);
    console.log('🔍 ========== PORTAL ACCESS CHECK END (ERROR) ==========\n');
    return { hasAccess: false, isAdmin: false };
  }
}
