import { db } from '@repo/db';
import { encodeFunctionData, type Address } from 'viem';
import { sendTransaction, createWalletForUser, ensureWalletHasGas, mintUCToUser } from './wallet-service.js';
import {
  getUCBalance,
  parseUCAmount,
  formatUCAmount,
  unityCoinAbi,
  contracts,
} from './blockchain.js';
import { chargePaymentMethod, refundPayment } from './stripe-customer.js';
import { sendClaimSMS } from './sms.js';
import { coopConfig } from '../config/coop.js';

// Exchange rate: 1 UC = 1 USD (fixed for now, can be made dynamic later)
const UC_USD_RATE = 1.0;

/**
 * Get user's balance in USD (converts from UC)
 */
export async function getUSDBalance(userId: string): Promise<{
  balanceUSD: number;
  balanceUC: string;
  formatted: string;
}> {
  console.log(`\n💰 getUSDBalance - userId: ${userId}`);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
  });

  console.log(`   walletAddress from DB: ${user?.walletAddress || 'NOT SET'}`);

  if (!user?.walletAddress) {
    console.log('   ⚠️ No wallet address, returning $0.00');
    return {
      balanceUSD: 0,
      balanceUC: '0',
      formatted: '$0.00',
    };
  }

  const { balance, formatted } = await getUCBalance(user.walletAddress);
  console.log(`   UC balance from blockchain: ${formatted} UC (raw: ${balance})`);

  const balanceUSD = parseFloat(formatted) * UC_USD_RATE;
  console.log(`   USD balance: $${balanceUSD.toFixed(2)}`);

  return {
    balanceUSD,
    balanceUC: balance.toString(),
    formatted: `$${balanceUSD.toFixed(2)}`,
  };
}

/**
 * Send payment to another Soulaan user
 */
export async function sendToSoulaanUser(params: {
  senderId: string;
  recipientId: string;
  amountUSD: number;
  note?: string;
}): Promise<{
  transferId: string;
  transactionHash: string;
  fundingSource: 'BALANCE' | 'CARD';
}> {
  const { senderId, recipientId, amountUSD, note } = params;
  const amountUC = amountUSD / UC_USD_RATE;

  console.log(`\n💸 P2P Transfer: ${amountUSD} USD (${amountUC} UC)`);
  console.log(`   From: ${senderId} → To: ${recipientId}`);

  // Get sender and recipient
  const [sender, recipient] = await Promise.all([
    db.user.findUnique({
      where: { id: senderId },
      select: { walletAddress: true, defaultPaymentMethodId: true },
    }),
    db.user.findUnique({
      where: { id: recipientId },
      select: { walletAddress: true, name: true },
    }),
  ]);

  if (!sender?.walletAddress) {
    throw new Error('Sender does not have a wallet');
  }
  if (!recipient) {
    throw new Error('Recipient not found');
  }

  // If recipient doesn't have a wallet, create one for them
  let recipientWalletAddress = recipient.walletAddress;
  if (!recipientWalletAddress) {
    console.log(`   Creating wallet for recipient ${recipientId}...`);
    recipientWalletAddress = await createWalletForUser(recipientId);
    console.log(`   ✅ Created wallet: ${recipientWalletAddress}`);
  }

  // Check sender's balance
  const { balance } = await getUCBalance(sender.walletAddress);
  const amountInWei = parseUCAmount(amountUC.toString());
  const hasBalance = balance >= amountInWei;

  let fundingSource: 'BALANCE' | 'CARD' = 'BALANCE';
  let stripePaymentIntentId: string | undefined;
  let stripeChargeId: string | undefined;

  // If insufficient balance, do JIT charging
  if (!hasBalance) {
    console.log('   Insufficient balance, initiating JIT charge...');

    if (!sender.defaultPaymentMethodId) {
      throw new Error('Insufficient balance and no payment method on file');
    }

    // Charge the card
    const amountCents = Math.ceil(amountUSD * 100);
    const chargeResult = await chargePaymentMethod(
      senderId,
      amountCents,
      `Payment to ${recipient.name || 'Soulaan user'}`,
      { recipientId, amountUSD: amountUSD.toString() }
    );

    stripePaymentIntentId = chargeResult.paymentIntentId;
    stripeChargeId = chargeResult.chargeId;
    fundingSource = 'CARD';

    // Mint UC to sender's wallet after card charge
    console.log('   Minting UC to sender wallet...');
    await mintUCToUser(senderId, amountUC);
    console.log('   Card charged and UC minted successfully');
  }

  // Create transfer record first (PENDING)
  const transfer = await db.p2PTransfer.create({
    data: {
      senderId,
      recipientId,
      amountUSD,
      amountUC,
      fundingSource,
      stripePaymentIntentId,
      stripeChargeId,
      note,
      status: 'PROCESSING',
    },
  });

  try {
    // Ensure sender has gas for the transaction
    console.log('   Ensuring sender has gas...');
    const hasGas = await ensureWalletHasGas(sender.walletAddress);
    if (!hasGas) {
      throw new Error('Failed to fund wallet with gas');
    }
    console.log('   ✅ Sender has sufficient gas');

    // Execute blockchain transfer
    const txData = encodeFunctionData({
      abi: unityCoinAbi,
      functionName: 'transfer',
      args: [recipientWalletAddress as Address, amountInWei],
    });

    const txHash = await sendTransaction(
      senderId,
      contracts.unityCoin,
      txData
    );

    // Update transfer as completed
    await db.p2PTransfer.update({
      where: { id: transfer.id },
      data: {
        status: 'COMPLETED',
        blockchainTxHash: txHash,
        completedAt: new Date(),
      },
    });

    // Create notifications
    await createPaymentNotifications(transfer.id, senderId, recipientId, amountUSD);

    console.log(`   ✅ Transfer complete: ${txHash}`);
    return {
      transferId: transfer.id,
      transactionHash: txHash,
      fundingSource,
    };
  } catch (error) {
    console.error('   ❌ Transfer failed:', error);

    // Mark transfer as failed
    await db.p2PTransfer.update({
      where: { id: transfer.id },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: error instanceof Error ? error.message : 'Transfer failed',
      },
    });

    // If card was charged, initiate refund
    if (fundingSource === 'CARD' && stripePaymentIntentId) {
      console.log('   💳 Initiating refund for failed transfer...');
      try {
        const amountCents = Math.ceil(amountUSD * 100);
        await refundPayment(stripePaymentIntentId, amountCents);
        console.log('   ✅ Refund initiated successfully');

        // Notify user about the refund
        await db.notification.create({
          data: {
            userId: senderId,
            type: 'PAYMENT_REFUNDED',
            title: 'Payment Refunded',
            body: `Your $${amountUSD.toFixed(2)} payment failed and has been refunded to your card.`,
            data: {
              transferId: transfer.id,
              amountUSD,
              reason: error instanceof Error ? error.message : 'Transfer failed',
            },
          },
        });
      } catch (refundError) {
        console.error('   ❌ Refund failed:', refundError);
        // Log for manual intervention
        await db.notification.create({
          data: {
            userId: senderId,
            type: 'PAYMENT_REFUND_FAILED',
            title: 'Payment Issue',
            body: `Your $${amountUSD.toFixed(2)} payment failed. Please contact support for a refund.`,
            data: {
              transferId: transfer.id,
              amountUSD,
              stripePaymentIntentId,
            },
          },
        });
      }
    }

    throw error;
  }
}

/**
 * Send payment to a non-user (creates pending transfer)
 */
export async function sendToNonUser(params: {
  senderId: string;
  recipientPhone: string;
  recipientEmail?: string;
  amountUSD: number;
  note?: string;
}): Promise<{
  pendingTransferId: string;
  claimToken: string;
  fundingSource: 'BALANCE' | 'CARD';
}> {
  const { senderId, recipientPhone, recipientEmail, amountUSD, note } = params;
  const amountUC = amountUSD / UC_USD_RATE;

  console.log(`\n💸 P2P Transfer to non-user: ${amountUSD} USD`);
  console.log(`   From: ${senderId} → To: ${recipientPhone}`);

  // Get sender
  const sender = await db.user.findUnique({
    where: { id: senderId },
    select: { walletAddress: true, defaultPaymentMethodId: true, name: true },
  });

  if (!sender?.walletAddress) {
    throw new Error('Sender does not have a wallet');
  }

  // Check sender's balance
  const { balance } = await getUCBalance(sender.walletAddress);
  const amountInWei = parseUCAmount(amountUC.toString());
  const hasBalance = balance >= amountInWei;

  let fundingSource: 'BALANCE' | 'CARD' = 'BALANCE';
  let stripePaymentIntentId: string | undefined;
  let stripeChargeId: string | undefined;

  // If insufficient balance, do JIT charging
  if (!hasBalance) {
    console.log('   Insufficient balance, initiating JIT charge...');

    if (!sender.defaultPaymentMethodId) {
      throw new Error('Insufficient balance and no payment method on file');
    }

    const amountCents = Math.ceil(amountUSD * 100);
    const chargeResult = await chargePaymentMethod(
      senderId,
      amountCents,
      `Payment to ${recipientPhone}`,
      { recipientPhone, amountUSD: amountUSD.toString() }
    );

    stripePaymentIntentId = chargeResult.paymentIntentId;
    stripeChargeId = chargeResult.chargeId;
    fundingSource = 'CARD';

    // Mint UC to sender's wallet after card charge
    console.log('   Minting UC to sender wallet...');
    await mintUCToUser(senderId, amountUC);
    console.log('   Card charged and UC minted successfully');
  }

  // Calculate expiration (7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Create pending transfer (escrow)
  const pendingTransfer = await db.pendingTransfer.create({
    data: {
      senderId,
      recipientPhone,
      recipientEmail,
      amountUSD,
      amountUC,
      fundingSource,
      stripePaymentIntentId,
      stripeChargeId,
      note,
      expiresAt,
      status: 'PENDING_CLAIM',
    },
  });

  // TODO: Debit sender's UC to escrow
  // For now, we track it in the pending transfer record

  // Create notification for sender
  const config = coopConfig();
  await db.notification.create({
    data: {
      userId: senderId,
      type: 'PAYMENT_SENT',
      title: 'Payment Sent',
      body: `You sent $${amountUSD.toFixed(2)} to ${recipientPhone}. They have ${config.claimExpirationDays} days to claim it.`,
      data: {
        pendingTransferId: pendingTransfer.id,
        recipientPhone,
        amountUSD,
      },
    },
  });

  console.log(`   ✅ Pending transfer created: ${pendingTransfer.id}`);
  console.log(`   Claim token: ${pendingTransfer.claimToken}`);

  // Send SMS to recipient
  const smsResult = await sendClaimSMS({
    recipientPhone,
    senderName: sender.name || `Someone on ${config.shortName}`,
    amountUSD,
    claimToken: pendingTransfer.claimToken,
    note,
  });

  if (smsResult.success) {
    console.log(`   📱 SMS sent: ${smsResult.messageId}`);
  } else {
    console.warn(`   ⚠️ SMS not sent: ${smsResult.error}`);
  }

  return {
    pendingTransferId: pendingTransfer.id,
    claimToken: pendingTransfer.claimToken,
    fundingSource,
  };
}

/**
 * Process expired pending transfers (refund to sender)
 */
export async function processExpiredTransfers(): Promise<number> {
  const now = new Date();

  // Find expired pending transfers
  const expiredTransfers = await db.pendingTransfer.findMany({
    where: {
      status: 'PENDING_CLAIM',
      expiresAt: { lt: now },
    },
    include: {
      sender: { select: { walletAddress: true, name: true } },
    },
  });

  console.log(`\n🕐 Processing ${expiredTransfers.length} expired transfers...`);

  let processed = 0;

  for (const transfer of expiredTransfers) {
    try {
      // TODO: Refund UC from escrow to sender's wallet

      // Update transfer status
      await db.pendingTransfer.update({
        where: { id: transfer.id },
        data: {
          status: 'EXPIRED',
          refundedAt: now,
        },
      });

      // Notify sender
      await db.notification.create({
        data: {
          userId: transfer.senderId,
          type: 'PAYMENT_EXPIRED',
          title: 'Payment Returned',
          body: `Your $${transfer.amountUSD.toFixed(2)} payment to ${transfer.recipientPhone} was not claimed and has been returned.`,
          data: {
            pendingTransferId: transfer.id,
            amountUSD: transfer.amountUSD,
          },
        },
      });

      processed++;
      console.log(`   ✅ Refunded transfer ${transfer.id}`);
    } catch (error) {
      console.error(`   ❌ Failed to refund transfer ${transfer.id}:`, error);
    }
  }

  return processed;
}

/**
 * Create payment notifications for both parties
 */
async function createPaymentNotifications(
  transferId: string,
  senderId: string,
  recipientId: string,
  amountUSD: number
): Promise<void> {
  const [sender, recipient] = await Promise.all([
    db.user.findUnique({ where: { id: senderId }, select: { name: true } }),
    db.user.findUnique({ where: { id: recipientId }, select: { name: true } }),
  ]);

  // Notification for sender
  await db.notification.create({
    data: {
      userId: senderId,
      type: 'PAYMENT_SENT',
      title: 'Payment Sent',
      body: `You sent $${amountUSD.toFixed(2)} to ${recipient?.name || 'a user'}`,
      data: { transferId, amountUSD },
    },
  });

  // Notification for recipient
  await db.notification.create({
    data: {
      userId: recipientId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      body: `${sender?.name || 'Someone'} sent you $${amountUSD.toFixed(2)}`,
      data: { transferId, amountUSD },
    },
  });
}

/**
 * Get transfer history for a user (sent and received)
 */
export async function getTransferHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  transfers: Array<{
    id: string;
    type: 'sent' | 'received' | 'pending';
    amount: number;
    counterparty: string;
    status: string;
    note?: string;
    createdAt: Date;
  }>;
  total: number;
}> {
  // Get P2P transfers (sent and received)
  const [sentTransfers, receivedTransfers, pendingTransfers, total] = await Promise.all([
    db.p2PTransfer.findMany({
      where: { senderId: userId },
      include: { recipient: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.p2PTransfer.findMany({
      where: { recipientId: userId },
      include: { sender: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.pendingTransfer.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.p2PTransfer.count({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    }),
  ]);

  // Combine and format
  const transfers = [
    ...sentTransfers.map(t => ({
      id: t.id,
      type: 'sent' as const,
      amount: t.amountUSD,
      counterparty: t.recipient.name || t.recipient.phone || 'Unknown',
      status: t.status,
      note: t.note || undefined,
      createdAt: t.createdAt,
    })),
    ...receivedTransfers.map(t => ({
      id: t.id,
      type: 'received' as const,
      amount: t.amountUSD,
      counterparty: t.sender.name || t.sender.phone || 'Unknown',
      status: t.status,
      note: t.note || undefined,
      createdAt: t.createdAt,
    })),
    ...pendingTransfers.map(t => ({
      id: t.id,
      type: 'pending' as const,
      amount: t.amountUSD,
      counterparty: t.recipientPhone,
      status: t.status,
      note: t.note || undefined,
      createdAt: t.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    transfers: transfers.slice(0, limit),
    total,
  };
}
