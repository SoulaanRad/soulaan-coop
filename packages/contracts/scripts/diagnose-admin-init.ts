/**
 * diagnose-admin-init.ts
 *
 * Diagnoses — and optionally fixes — why the admin initialization step
 * (addMember + mintReward) fails on Base Mainnet.
 *
 * Mirrors the exact viem calls the web UI makes so the results are 1-to-1.
 *
 * READ-ONLY mode (no private key):
 *   npx ts-node --project tsconfig.scripts.json scripts/diagnose-admin-init.ts
 *
 * FIX mode (provide private key to actually run the transactions):
 *   DEPLOYER_PRIVATE_KEY=0x... npx ts-node --project tsconfig.scripts.json scripts/diagnose-admin-init.ts --fix
 */

import { createPublicClient, createWalletClient, http, keccak256, toBytes, parseEther, formatEther } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";

// ─── CONFIG ─────────────────────────────────────────────────────────────────

const SC_ADDRESS       = "0x064a167c5ba379c061f5e02e9996f8e775da1700" as const;
const WALLET_ADDRESS   = "0x89590b9173d8166FCCc3D77ca133a295c4d5b6Cd" as const;
const RPC_URL          = "https://base-mainnet.g.alchemy.com/v2/uQp-Ozg_oughZk9YhAyvl";

const SEED_AMOUNT      = parseEther("100000");   // 100,000 SC
const SEED_REASON      = keccak256(toBytes("INITIAL_RESERVE_SEED"));

// Role hashes — must match keccak256(string) in Solidity
const ROLES = {
  DEFAULT_ADMIN:    "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
  GOVERNANCE_AWARD: keccak256(toBytes("GOVERNANCE_AWARD")) as `0x${string}`,
  GOVERNANCE_SLASH: keccak256(toBytes("GOVERNANCE_SLASH")) as `0x${string}`,
  MEMBER_MANAGER:   keccak256(toBytes("MEMBER_MANAGER"))   as `0x${string}`,
};

// ─── ABI (minimal — only what we call) ───────────────────────────────────────

const ABI = [
  { name: "name",           type: "function", stateMutability: "view",       inputs: [],                                                       outputs: [{ type: "string" }] },
  { name: "symbol",         type: "function", stateMutability: "view",       inputs: [],                                                       outputs: [{ type: "string" }] },
  { name: "totalSupply",    type: "function", stateMutability: "view",       inputs: [],                                                       outputs: [{ type: "uint256" }] },
  { name: "balanceOf",      type: "function", stateMutability: "view",       inputs: [{ name: "account", type: "address" }],                   outputs: [{ type: "uint256" }] },
  { name: "memberStatus",   type: "function", stateMutability: "view",       inputs: [{ name: "member",  type: "address" }],                   outputs: [{ type: "uint8" }] },
  { name: "isActiveMember", type: "function", stateMutability: "view",       inputs: [{ name: "member",  type: "address" }],                   outputs: [{ type: "bool" }] },
  { name: "hasRole",        type: "function", stateMutability: "view",       inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], outputs: [{ type: "bool" }] },
  { name: "getRoleAdmin",   type: "function", stateMutability: "view",       inputs: [{ name: "role", type: "bytes32" }],                      outputs: [{ type: "bytes32" }] },
  { name: "addMember",      type: "function", stateMutability: "nonpayable", inputs: [{ name: "member", type: "address" }],                    outputs: [] },
  { name: "mintReward",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "recipient", type: "address" }, { name: "amount", type: "uint256" }, { name: "reason", type: "bytes32" }], outputs: [] },
  { name: "grantRole",      type: "function", stateMutability: "nonpayable", inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], outputs: [] },
] as const;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const sep = () => console.log("─".repeat(60));
const ok  = (msg: string) => console.log(`  ✅  ${msg}`);
const warn = (msg: string) => console.log(`  ⚠️   ${msg}`);
const fail = (msg: string) => console.log(`  ❌  ${msg}`);

function memberStatusLabel(status: number): string {
  switch (status) {
    case 0: return "NotMember (0)";
    case 1: return "Active (1)";
    case 2: return "Inactive (2)";
    case 3: return "Suspended (3)";
    default: return `Unknown (${status})`;
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const FIX_MODE = process.argv.includes("--fix");
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;

  if (FIX_MODE && !privateKey) {
    console.error("❌  --fix mode requires DEPLOYER_PRIVATE_KEY env variable");
    process.exit(1);
  }

  const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });

  console.log("\n🔍  SOULAANI COIN — ADMIN INIT DIAGNOSTIC");
  sep();
  console.log(`  Contract : ${SC_ADDRESS}`);
  console.log(`  Wallet   : ${WALLET_ADDRESS}`);
  console.log(`  RPC      : ${RPC_URL.replace(/\/v2\/.+$/, "/v2/***")}`);
  console.log(`  Mode     : ${FIX_MODE ? "FIX (will send transactions)" : "READ-ONLY"}`);
  sep();

  // ── 1. Basic contract info ──────────────────────────────────────────────────
  console.log("\n📄  CONTRACT INFO");

  const [name, symbol, totalSupply] = await Promise.all([
    publicClient.readContract({ address: SC_ADDRESS, abi: ABI, functionName: "name" }),
    publicClient.readContract({ address: SC_ADDRESS, abi: ABI, functionName: "symbol" }),
    publicClient.readContract({ address: SC_ADDRESS, abi: ABI, functionName: "totalSupply" }),
  ]);

  console.log(`  Name         : ${name}`);
  console.log(`  Symbol       : ${symbol}`);
  console.log(`  Total Supply : ${formatEther(totalSupply)} ${symbol}`);

  // ── 2. Wallet balance ───────────────────────────────────────────────────────
  console.log("\n💰  WALLET STATE");

  const [ethBalance, scBalance] = await Promise.all([
    publicClient.getBalance({ address: WALLET_ADDRESS }),
    publicClient.readContract({ address: SC_ADDRESS, abi: ABI, functionName: "balanceOf", args: [WALLET_ADDRESS] }),
  ]);

  console.log(`  ETH balance  : ${formatEther(ethBalance)} ETH`);

  if (ethBalance < parseEther("0.001")) {
    fail(`ETH balance is very low — transactions will likely fail (out of gas)`);
  } else {
    ok(`ETH balance sufficient`);
  }

  console.log(`  SC balance   : ${formatEther(scBalance)} ${symbol}`);

  if (scBalance > 0n) {
    ok(`Wallet already has SC tokens — minting may be unnecessary`);
  } else {
    warn(`Wallet has 0 SC tokens — minting needed`);
  }

  // ── 3. Member status ────────────────────────────────────────────────────────
  console.log("\n👤  MEMBER STATUS");

  const memberStatusRaw = await publicClient.readContract({
    address: SC_ADDRESS, abi: ABI, functionName: "memberStatus", args: [WALLET_ADDRESS],
  });
  const isActive = await publicClient.readContract({
    address: SC_ADDRESS, abi: ABI, functionName: "isActiveMember", args: [WALLET_ADDRESS],
  });

  // KEY: viem returns uint8 as a plain JS number, not BigInt
  const memberStatusNum = Number(memberStatusRaw);
  const memberStatusType = typeof memberStatusRaw;

  console.log(`  memberStatus raw value  : ${memberStatusRaw}`);
  console.log(`  memberStatus JS type    : ${memberStatusType}`);
  console.log(`  memberStatus label      : ${memberStatusLabel(memberStatusNum)}`);
  console.log(`  isActiveMember()        : ${isActive}`);

  if (memberStatusType === "bigint") {
    warn(`viem returned BigInt for uint8 — this is unusual. Strict === 0n check would work here.`);
  } else {
    warn(`viem returned ${memberStatusType} for uint8 — strict === 0n check FAILS here (this is the known bug)`);
    ok(`Number(status) === 0 is the correct check, and it resolves to: ${Number(memberStatusRaw) === 0}`);
  }

  const needsAddMember = Number(memberStatusRaw) === 0;

  if (needsAddMember) {
    fail(`Wallet is NOT a member — addMember() must be called before mintReward()`);
  } else {
    ok(`Wallet is already a member`);
  }

  // ── 4. Role audit ───────────────────────────────────────────────────────────
  console.log("\n🔑  ROLE AUDIT FOR WALLET");

  const roleChecks = await Promise.all(
    Object.entries(ROLES).map(async ([roleName, roleHash]) => {
      const has = await publicClient.readContract({
        address: SC_ADDRESS, abi: ABI, functionName: "hasRole",
        args: [roleHash, WALLET_ADDRESS],
      });
      return { roleName, roleHash, has };
    })
  );

  for (const { roleName, roleHash, has } of roleChecks) {
    const short = roleHash.slice(0, 10) + "…";
    if (has) {
      ok(`${roleName.padEnd(20)} ${short}`);
    } else {
      fail(`${roleName.padEnd(20)} ${short}  ← MISSING`);
    }
  }

  const hasAdminRole        = roleChecks.find(r => r.roleName === "DEFAULT_ADMIN")?.has    ?? false;
  const hasAwardRole        = roleChecks.find(r => r.roleName === "GOVERNANCE_AWARD")?.has ?? false;
  const hasMemberMgrRole    = roleChecks.find(r => r.roleName === "MEMBER_MANAGER")?.has   ?? false;

  // ── 5. Can we simulate the transactions? ────────────────────────────────────
  console.log("\n🧪  TRANSACTION SIMULATION");

  // Simulate addMember
  if (needsAddMember) {
    if (!hasMemberMgrRole) {
      fail(`addMember: wallet lacks MEMBER_MANAGER role — this call WILL revert`);
    } else {
      try {
        await publicClient.simulateContract({
          address: SC_ADDRESS, abi: ABI, functionName: "addMember",
          args: [WALLET_ADDRESS], account: WALLET_ADDRESS,
        });
        ok(`addMember simulation: PASSED`);
      } catch (e: any) {
        fail(`addMember simulation: FAILED — ${e.shortMessage ?? e.message}`);
      }
    }
  } else {
    ok(`addMember: skipped (already a member)`);
  }

  // Simulate mintReward
  if (!hasAwardRole) {
    fail(`mintReward: wallet lacks GOVERNANCE_AWARD role — this call WILL revert`);
  } else if (needsAddMember) {
    warn(`mintReward: can't simulate yet — need to addMember first`);
  } else {
    try {
      await publicClient.simulateContract({
        address: SC_ADDRESS, abi: ABI, functionName: "mintReward",
        args: [WALLET_ADDRESS, SEED_AMOUNT, SEED_REASON as `0x${string}`],
        account: WALLET_ADDRESS,
      });
      ok(`mintReward simulation: PASSED`);
    } catch (e: any) {
      fail(`mintReward simulation: FAILED — ${e.shortMessage ?? e.message}`);
      console.log(`       Full error: ${e.message}`);
    }
  }

  // ── 6. Summary & fix plan ────────────────────────────────────────────────────
  console.log("\n📋  SUMMARY");
  sep();

  const issues: string[] = [];
  if (!hasAdminRole)      issues.push("Wallet does NOT have DEFAULT_ADMIN_ROLE");
  if (!hasMemberMgrRole)  issues.push("Wallet does NOT have MEMBER_MANAGER role — cannot call addMember");
  if (!hasAwardRole)      issues.push("Wallet does NOT have GOVERNANCE_AWARD role — cannot call mintReward");
  if (needsAddMember)     issues.push("Wallet is NOT a member — addMember() must run before mintReward()");

  if (issues.length === 0) {
    ok("No blocking issues found");
    if (scBalance === 0n) {
      warn("Wallet is a member with correct roles but has 0 SC — mintReward should succeed");
    }
  } else {
    issues.forEach(i => fail(i));
  }

  // ── 7. FIX MODE ─────────────────────────────────────────────────────────────
  if (!FIX_MODE) {
    console.log("\n💡  To apply fixes, run with --fix and DEPLOYER_PRIVATE_KEY set:");
    console.log("    DEPLOYER_PRIVATE_KEY=0x... npx ts-node --project tsconfig.scripts.json scripts/diagnose-admin-init.ts --fix\n");
    return;
  }

  console.log("\n🔧  FIX MODE — sending transactions");
  sep();

  const account = privateKeyToAccount(privateKey!);
  const walletClient = createWalletClient({ account, chain: base, transport: http(RPC_URL) });

  // Step A: grant MEMBER_MANAGER if missing
  if (!hasMemberMgrRole && hasAdminRole) {
    console.log("  Granting MEMBER_MANAGER to wallet…");
    const h = await walletClient.writeContract({
      address: SC_ADDRESS, abi: ABI, functionName: "grantRole",
      args: [ROLES.MEMBER_MANAGER, WALLET_ADDRESS], chain: base,
    });
    console.log(`  ✅ grantRole(MEMBER_MANAGER) tx: ${h}`);
    await publicClient.waitForTransactionReceipt({ hash: h, timeout: 120_000, pollingInterval: 2_000 });
    console.log("  ✅ Confirmed");
  }

  // Step B: addMember
  if (needsAddMember) {
    console.log("  Calling addMember…");
    const h = await walletClient.writeContract({
      address: SC_ADDRESS, abi: ABI, functionName: "addMember",
      args: [WALLET_ADDRESS], chain: base,
    });
    console.log(`  ✅ addMember tx: ${h}`);
    console.log(`     https://basescan.org/tx/${h}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: h, timeout: 120_000, pollingInterval: 2_000 });
    if (receipt.status === "reverted") throw new Error("addMember reverted");
    console.log("  ✅ addMember confirmed");
  }

  // Step C: grant GOVERNANCE_AWARD if missing
  if (!hasAwardRole && hasAdminRole) {
    console.log("  Granting GOVERNANCE_AWARD to wallet…");
    const h = await walletClient.writeContract({
      address: SC_ADDRESS, abi: ABI, functionName: "grantRole",
      args: [ROLES.GOVERNANCE_AWARD, WALLET_ADDRESS], chain: base,
    });
    console.log(`  ✅ grantRole(GOVERNANCE_AWARD) tx: ${h}`);
    await publicClient.waitForTransactionReceipt({ hash: h, timeout: 120_000, pollingInterval: 2_000 });
    console.log("  ✅ Confirmed");
  }

  // Step D: mintReward
  if (scBalance === 0n) {
    console.log("  Minting 100,000 SC initial reserve…");
    console.log(`    recipient : ${WALLET_ADDRESS}`);
    console.log(`    amount    : ${formatEther(SEED_AMOUNT)} SC`);
    console.log(`    reason    : ${SEED_REASON}`);

    const h = await walletClient.writeContract({
      address: SC_ADDRESS, abi: ABI, functionName: "mintReward",
      args: [WALLET_ADDRESS, SEED_AMOUNT, SEED_REASON as `0x${string}`], chain: base,
    });
    console.log(`  ✅ mintReward tx: ${h}`);
    console.log(`     https://basescan.org/tx/${h}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: h, timeout: 180_000, pollingInterval: 2_000 });
    if (receipt.status === "reverted") throw new Error("mintReward reverted");
    console.log("  ✅ mintReward confirmed — 100,000 SC minted");
  } else {
    ok(`mintReward skipped — wallet already has ${formatEther(scBalance)} SC`);
  }

  // Final state
  const finalBalance = await publicClient.readContract({
    address: SC_ADDRESS, abi: ABI, functionName: "balanceOf", args: [WALLET_ADDRESS],
  });
  console.log(`\n  Final SC balance: ${formatEther(finalBalance)} ${symbol}`);
  sep();
  console.log("  🎉  Admin initialization complete\n");
}

main().catch(err => {
  console.error("\n💥  Fatal error:", err.message ?? err);
  process.exit(1);
});
