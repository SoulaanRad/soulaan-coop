import { createPublicClient, http, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { recoverMessageAddress } from 'viem';

// Contract addresses
const UNITY_COIN_ADDRESS = (process.env.UNITY_COIN_ADDRESS || '0xB52b287a83f3d370fdAC8c05f39da23522a51ec9') as Address;
const SOULAANI_COIN_ADDRESS = (process.env.SOULAANI_COIN_ADDRESS || '0x7E59d1F33F4efF9563544B2cc90B9Cc7516E2542') as Address;
const TREASURY_SAFE_ADDRESS = (process.env.TREASURY_SAFE_ADDRESS || '0x89590b9173d8166fccc3d77ca133a295c4d5b6cd') as Address;
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

// Create public client for reading blockchain
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

/**
 * Check if an address is an owner of the Treasury Safe multisig
 */
export async function isTreasurySafeOwner(address: Address): Promise<boolean> {
  try {
    console.log(`🔍 Checking if ${address} is owner of Treasury Safe...`);

    const isOwner = await publicClient.readContract({
      address: TREASURY_SAFE_ADDRESS,
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
 */
export async function checkAdminStatusWithRole(address: Address): Promise<{ isAdmin: boolean; role?: string }> {
  try {
    console.log(`\n🔍 ========== ADMIN CHECK START (API SERVER) ==========`);
    console.log(`   Address: ${address}`);

    // PRIORITY 1: Check if address is owner of Treasury Safe multisig (most important!)
    console.log('\n📋 PRIORITY 1: Treasury Safe Owner Check');
    console.log(`   Treasury Safe Address: ${TREASURY_SAFE_ADDRESS}`);

    const isSafeOwner = await isTreasurySafeOwner(address);
    if (isSafeOwner) {
      console.log(`✅ ${address} is Treasury Safe owner (ADMIN)`);
      console.log('🔍 ========== ADMIN CHECK END (ADMIN FOUND) ==========\n');
      return { isAdmin: true, role: 'Treasury Safe Owner' };
    }

    // PRIORITY 2: Check if address has DEFAULT_ADMIN_ROLE on Soulaani Coin
    console.log('\n📋 PRIORITY 2: Soulaani Coin Admin Check');
    console.log(`   Soulaani Coin Address: ${SOULAANI_COIN_ADDRESS}`);

    const isDefaultAdminSoulaani = await publicClient.readContract({
      address: SOULAANI_COIN_ADDRESS,
      abi: unityCoinABI,
      functionName: 'hasRole',
      args: [DEFAULT_ADMIN_ROLE as `0x${string}`, address],
    });

    if (isDefaultAdminSoulaani) {
      console.log(`✅ ${address} is DEFAULT_ADMIN on Soulaani Coin`);
      console.log('🔍 ========== ADMIN CHECK END (ADMIN FOUND) ==========\n');
      return { isAdmin: true, role: 'Soulaani Coin Admin' };
    }

    console.log('\n❌ No admin roles found for this address');
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
 */
export async function isContractAdmin(address: Address): Promise<boolean> {
  try {
    console.log(`🔍 Checking if ${address} has admin privileges...`);

    // PRIORITY 1: Check if address is owner of Treasury Safe multisig (most important!)
    const isSafeOwner = await isTreasurySafeOwner(address);
    if (isSafeOwner) {
      return true;
    }

    // PRIORITY 2: Check DEFAULT_ADMIN_ROLE on Soulaani Coin contract
    const isDefaultAdminSoulaani = await publicClient.readContract({
      address: SOULAANI_COIN_ADDRESS,
      abi: unityCoinABI,
      functionName: 'hasRole',
      args: [DEFAULT_ADMIN_ROLE as `0x${string}`, address],
    });

    if (isDefaultAdminSoulaani) {
      console.log(`✅ ${address} is DEFAULT_ADMIN on Soulaani Coin`);
      return true;
    }

    // PRIORITY 3: Check DEFAULT_ADMIN_ROLE on Unity Coin contract (fallback)
    const isDefaultAdmin = await publicClient.readContract({
      address: UNITY_COIN_ADDRESS,
      abi: unityCoinABI,
      functionName: 'hasRole',
      args: [DEFAULT_ADMIN_ROLE as `0x${string}`, address],
    });

    if (isDefaultAdmin) {
      console.log(`✅ ${address} is DEFAULT_ADMIN on Unity Coin`);
      return true;
    }

    // Check TREASURER_MINT role
    const isTreasurer = await publicClient.readContract({
      address: UNITY_COIN_ADDRESS,
      abi: unityCoinABI,
      functionName: 'hasRole',
      args: [TREASURER_MINT_ROLE as `0x${string}`, address],
    });

    if (isTreasurer) {
      console.log(`✅ ${address} is TREASURER_MINT`);
      return true;
    }

    // Check PAUSER role
    const isPauser = await publicClient.readContract({
      address: UNITY_COIN_ADDRESS,
      abi: unityCoinABI,
      functionName: 'hasRole',
      args: [PAUSER_ROLE as `0x${string}`, address],
    });

    if (isPauser) {
      console.log(`✅ ${address} is PAUSER`);
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
export async function getAllAdmins(): Promise<Address[]> {
  try {
    const admins = new Set<Address>();

    // PRIORITY 1: Get Treasury Safe owners (most important!)
    try {
      const safeOwners = await publicClient.readContract({
        address: TREASURY_SAFE_ADDRESS,
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

    // PRIORITY 2: Get DEFAULT_ADMIN members from Soulaani Coin
    try {
      const defaultAdminCountSoulaani = await publicClient.readContract({
        address: SOULAANI_COIN_ADDRESS,
        abi: unityCoinABI,
        functionName: 'getRoleMemberCount',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`],
      });

      for (let i = 0; i < Number(defaultAdminCountSoulaani); i++) {
        const member = await publicClient.readContract({
          address: SOULAANI_COIN_ADDRESS,
          abi: unityCoinABI,
          functionName: 'getRoleMember',
          args: [DEFAULT_ADMIN_ROLE as `0x${string}`, BigInt(i)],
        });
        admins.add(member as Address);
      }
    } catch (error) {
      console.error('Error fetching Soulaani Coin admins:', error);
    }

    // PRIORITY 3: Get DEFAULT_ADMIN members from Unity Coin (fallback)
    const defaultAdminCount = await publicClient.readContract({
      address: UNITY_COIN_ADDRESS,
      abi: unityCoinABI,
      functionName: 'getRoleMemberCount',
      args: [DEFAULT_ADMIN_ROLE as `0x${string}`],
    });

    for (let i = 0; i < Number(defaultAdminCount); i++) {
      const member = await publicClient.readContract({
        address: UNITY_COIN_ADDRESS,
        abi: unityCoinABI,
        functionName: 'getRoleMember',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`, BigInt(i)],
      });
      admins.add(member as Address);
    }

    // Get TREASURER_MINT members
    const treasurerCount = await publicClient.readContract({
      address: UNITY_COIN_ADDRESS,
      abi: unityCoinABI,
      functionName: 'getRoleMemberCount',
      args: [TREASURER_MINT_ROLE as `0x${string}`],
    });

    for (let i = 0; i < Number(treasurerCount); i++) {
      const member = await publicClient.readContract({
        address: UNITY_COIN_ADDRESS,
        abi: unityCoinABI,
        functionName: 'getRoleMember',
        args: [TREASURER_MINT_ROLE as `0x${string}`, BigInt(i)],
      });
      admins.add(member as Address);
    }

    // Get PAUSER members
    const pauserCount = await publicClient.readContract({
      address: UNITY_COIN_ADDRESS,
      abi: unityCoinABI,
      functionName: 'getRoleMemberCount',
      args: [PAUSER_ROLE as `0x${string}`],
    });

    for (let i = 0; i < Number(pauserCount); i++) {
      const member = await publicClient.readContract({
        address: UNITY_COIN_ADDRESS,
        abi: unityCoinABI,
        functionName: 'getRoleMember',
        args: [PAUSER_ROLE as `0x${string}`, BigInt(i)],
      });
      admins.add(member as Address);
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
  expectedAddress: Address
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
    const isAdmin = await isContractAdmin(recoveredAddress);

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
export async function checkPortalAccess(address: Address): Promise<{ hasAccess: boolean; isAdmin: boolean; role?: string }> {
  try {
    console.log(`\n🔍 ========== PORTAL ACCESS CHECK (API SERVER) ==========`);
    console.log(`   Address: ${address}`);

    // FIRST: Check if user is an admin (Treasury Safe owner or contract admin)
    const adminStatus = await checkAdminStatusWithRole(address);
    if (adminStatus.isAdmin) {
      console.log(`✅ Portal access granted via ADMIN status: ${adminStatus.role}`);
      console.log('🔍 ========== PORTAL ACCESS CHECK END ==========\n');
      return { hasAccess: true, isAdmin: true, role: adminStatus.role };
    }

    // SECOND: Check SoulaaniCoin balance for regular members
    console.log('\n📋 Checking Soulaani Coin balance for regular member access...');
    console.log(`   Soulaani Coin Address: ${SOULAANI_COIN_ADDRESS}`);

    try {
      // Read balance from contract
      const balance = await publicClient.readContract({
        address: SOULAANI_COIN_ADDRESS,
        abi: unityCoinABI,
        functionName: 'balanceOf',
        args: [address],
      });

      // Check if user is an active member
      const isActive = await publicClient.readContract({
        address: SOULAANI_COIN_ADDRESS,
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
