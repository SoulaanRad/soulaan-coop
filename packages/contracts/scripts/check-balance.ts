import { ethers } from 'hardhat';
import dotenv from 'dotenv';

/**
 * Check ETH balance of your deployer wallet
 * 
 * Usage:
 *   pnpm check-balance
 */

dotenv.config();

async function main() {
  console.log('\n💰 CHECKING ETH BALANCE\n');
  console.log('═══════════════════════════════════════════════════\n');

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log('');

  // Get deployer address from private key
  let deployerAddress: string;
  
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY);
    deployerAddress = wallet.address;
  } else {
    console.error('❌ DEPLOYER_PRIVATE_KEY not found in .env');
    console.log('\nPlease set up your .env file:');
    console.log('  cp .env.example .env');
    console.log('  # Edit .env and add your DEPLOYER_PRIVATE_KEY');
    process.exit(1);
  }

  // Get balance
  const balance = await ethers.provider.getBalance(deployerAddress);
  const balanceInEth = ethers.formatEther(balance);

  console.log(`🔑 Deployer Address: ${deployerAddress}`);
  console.log(`💵 Balance: ${balanceInEth} ETH`);
  console.log('');

  // Check if sufficient for deployment
  const minRequired = ethers.parseEther('0.01'); // ~$20-40 worth, should be plenty
  
  if (balance < minRequired) {
    console.log('⚠️  WARNING: Balance is low!');
    console.log(`   You need at least 0.01 ETH to deploy contracts safely.`);
    console.log(`   You have: ${balanceInEth} ETH`);
    console.log('');
    console.log('🚰 Get test ETH from a faucet:');
    console.log('');
    console.log('   Option 1 (Recommended): Coinbase Faucet');
    console.log('   https://www.coinbase.com/faucets/base-ethereum-goerli-faucet');
    console.log('');
    console.log('   Option 2: Alchemy Faucet');
    console.log('   https://www.alchemy.com/faucets/base-sepolia');
    console.log('');
  } else {
    console.log('✅ Balance is sufficient for deployment!');
    console.log('');
    console.log('📊 Estimated deployment costs:');
    console.log('   - Deploy all 3 contracts: ~0.005 ETH');
    console.log('   - Verify contracts: free (no gas)');
    console.log('   - Grant roles: ~0.001 ETH');
    console.log('   Total: ~0.006 ETH');
    console.log('');
    console.log(`   Your balance (${balanceInEth} ETH) can handle this!`);
    console.log('');
  }

  console.log('🔗 View on BaseScan:');
  if (network.chainId === 84532n) {
    console.log(`   https://sepolia.basescan.org/address/${deployerAddress}`);
  } else {
    console.log(`   Unknown network (Chain ID: ${network.chainId})`);
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

