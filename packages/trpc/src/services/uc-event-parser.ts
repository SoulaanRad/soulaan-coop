import { createPublicClient, http, type Hash, decodeEventLog, parseAbiItem } from "viem";
import { baseSepolia } from "viem/chains";

const UNITY_COIN_ADDRESS = process.env.UNITY_COIN_ADDRESS || '';
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

// TreasuryReserveTransferred event ABI
const TREASURY_RESERVE_TRANSFERRED_EVENT = parseAbiItem(
  'event TreasuryReserveTransferred(address indexed from, address indexed store, uint256 paymentAmount, uint256 reserveAmount, uint256 reserveBps, bytes32 indexed sourceUcTxHash)'
);

/**
 * Parse TreasuryReserveTransferred event from UC transaction
 * Returns the reserve amount that was automatically set aside
 */
export async function getTreasuryReserveFromTransaction(txHash: string): Promise<{
  reserveAmount: number; // In UC (not wei)
  reserveBps: number;
  paymentAmount: number;
  from: string;
  store: string;
} | null> {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as Hash,
    });

    // Find TreasuryReserveTransferred event in logs
    for (const log of receipt.logs) {
      // Check if this log is from UnityCoin contract
      if (log.address.toLowerCase() !== UNITY_COIN_ADDRESS.toLowerCase()) {
        continue;
      }

      try {
        const decoded = decodeEventLog({
          abi: [TREASURY_RESERVE_TRANSFERRED_EVENT],
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === 'TreasuryReserveTransferred') {
          const args = decoded.args as {
            from: string;
            store: string;
            paymentAmount: bigint;
            reserveAmount: bigint;
            reserveBps: bigint;
            sourceUcTxHash: string;
          };

          // Convert from wei (18 decimals) to UC
          const reserveAmountUC = Number(args.reserveAmount) / 1e18;
          const paymentAmountUC = Number(args.paymentAmount) / 1e18;

          console.log(`📊 Parsed TreasuryReserveTransferred event from tx ${txHash}:`);
          console.log(`   Reserve: ${reserveAmountUC} UC`);
          console.log(`   Payment: ${paymentAmountUC} UC`);
          console.log(`   Rate: ${Number(args.reserveBps) / 100}%`);

          return {
            reserveAmount: reserveAmountUC,
            reserveBps: Number(args.reserveBps),
            paymentAmount: paymentAmountUC,
            from: args.from,
            store: args.store,
          };
        }
      } catch (decodeError) {
        // Not a TreasuryReserveTransferred event, continue
        continue;
      }
    }

    // No TreasuryReserveTransferred event found (store not SC-verified or no reserve)
    console.log(`ℹ️ No TreasuryReserveTransferred event in tx ${txHash} (store may not be SC-verified)`);
    return null;
  } catch (error) {
    console.error(`❌ Failed to parse treasury reserve from tx ${txHash}:`, error);
    throw error;
  }
}

// ERC-20 Transfer event ABI
const ERC20_TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

/**
 * Read the UC transfer amount and recipient from a UC payment transaction.
 * Used as a fallback when no TreasuryReserveTransferred event exists.
 */
export async function getUCTransferFromTransaction(txHash: string): Promise<{
  from: string;
  to: string;
  amountUC: number;
} | null> {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hash });

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== UNITY_COIN_ADDRESS.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: [ERC20_TRANSFER_EVENT],
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'Transfer') {
          const args = decoded.args as { from: string; to: string; value: bigint };
          return {
            from: args.from,
            to: args.to,
            amountUC: Number(args.value) / 1e18,
          };
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error(`❌ Failed to read UC transfer from tx ${txHash}:`, error);
    return null;
  }
}
