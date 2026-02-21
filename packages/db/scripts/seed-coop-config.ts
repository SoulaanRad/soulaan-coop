/**
 * Seed script for CoopConfig v1 (Soulaan Co-op)
 *
 * Run with: pnpm tsx scripts/seed-coop-config.ts
 */

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function seedCoopConfig() {
  const coopId = "soulaan";

  // Read charter text from documents
  const charterPath = path.resolve(__dirname, "../../../documents/soulaan-coop-charter.md");
  let charterText = "";
  try {
    charterText = fs.readFileSync(charterPath, "utf8");
    console.log(`  Read charter (${charterText.length} chars)`);
  } catch {
    console.warn("  Warning: Could not read charter file, using placeholder");
    charterText = "Soulaan Co-op Charter - placeholder";
  }

  const goalDefinitions = [
    { key: "LeakageReduction", label: "Leakage Reduction", weight: 0.25, description: "Reduce external economic leakage" },
    { key: "MemberBenefit", label: "Member Benefit", weight: 0.20, description: "Direct benefit to co-op members" },
    { key: "EquityGrowth", label: "Equity Growth", weight: 0.15, description: "Build long-term equity and ownership" },
    { key: "LocalJobs", label: "Local Jobs", weight: 0.15, description: "Create local employment opportunities" },
    { key: "CommunityVitality", label: "Community Vitality", weight: 0.15, description: "Strengthen community infrastructure and culture" },
    { key: "Resilience", label: "Resilience", weight: 0.10, description: "Build economic resilience and self-sufficiency" },
  ];

  const proposalCategories = [
    { key: "business_funding", label: "Business Funding", isActive: true },
    { key: "procurement", label: "Procurement", isActive: true },
    { key: "infrastructure", label: "Infrastructure", isActive: true },
    { key: "transport", label: "Transport", isActive: true },
    { key: "wallet_incentive", label: "Wallet Incentive", isActive: true },
    { key: "governance", label: "Governance", isActive: true },
    { key: "other", label: "Other", isActive: true },
  ];

  const sectorExclusions = [
    "fashion",
    "restaurant",
    "cafe",
    "food truck",
    "personality brand",
    "lifestyle brand",
  ];

  const scoringWeights = {
    selfReliance: 0.25,
    communityJobs: 0.20,
    assetRetention: 0.20,
    transparency: 0.15,
    culturalValue: 0.20,
  };

  // Check if config already exists
  const existing = await prisma.coopConfig.findFirst({
    where: { coopId, isActive: true },
  });

  if (existing) {
    console.log(`  CoopConfig already exists for "${coopId}" (v${existing.version}), skipping.`);
    return;
  }

  const config = await prisma.coopConfig.create({
    data: {
      coopId,
      version: 1,
      isActive: true,
      charterText,
      goalDefinitions,
      quorumPercent: 15,
      approvalThresholdPercent: 51,
      votingWindowDays: 7,
      scVotingCapPercent: 2,
      proposalCategories,
      sectorExclusions,
      minScBalanceToSubmit: 0,
      scoringWeights,
      createdBy: "system",
    },
  });

  console.log(`  Created CoopConfig v1 for "${coopId}" (id: ${config.id})`);
}

console.log("Seeding CoopConfig...");

seedCoopConfig()
  .then(() => {
    console.log("\nDone!");
  })
  .catch((e) => {
    console.error("Error seeding coop config:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
