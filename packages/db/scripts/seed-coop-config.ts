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

  const missionGoals = [
    {
      key: "income_stability",
      label: "Income Stability",
      priorityWeight: 0.35,
      description:
        "Does this proposal create reliable, living-wage income for Soulaan Co-op members? " +
        "Score high if it funds productive employment, apprenticeships, or revenue-generating operations " +
        "within SC-eligible sectors (manufacturing, logistics, trade training, exportable products, tech/IP). " +
        "Score low if income generated is marginal, speculative, or flows primarily to a single individual rather than the broader membership. " +
        "Per the charter, 85%+ of spending must be export-earning, import-reducing, or productive investment within 12–36 months.",
    },
    {
      key: "asset_creation",
      label: "Asset Creation",
      priorityWeight: 0.25,
      description:
        "Does this proposal build long-term, collectively owned productive assets — real estate, equipment, IP platforms, trade infrastructure, or equity stakes? " +
        "Score high if it transforms rent, consumption, or labor into durable equity and governance rights for the membership. " +
        "Score low if it funds depreciating goods, one-time events, non-scalable side hustles, or assets that accrue to one person. " +
        "Per the charter, the Soulaan Wealth Fund prioritises housing, trade schools, export businesses, and infrastructure above all else.",
    },
    {
      key: "leakage_reduction",
      label: "Leakage Reduction",
      priorityWeight: 0.20,
      description:
        "Does this proposal reduce the outflow of capital from the Black community economy by bringing more goods, services, or capacity in-house? " +
        "Score high if it substitutes an import with a co-op-produced alternative, lowers collective costs through bulk procurement, " +
        "or increases circulation of UC within the community rather than letting dollars exit to external vendors. " +
        "Score low if it increases dependence on outside suppliers, creates no substitution effect, or primarily serves individual consumption with no multiplier. " +
        "Per the charter surplus rule, proposals must demonstrably reduce the import side of the ledger.",
    },
    {
      key: "export_expansion",
      label: "Export Expansion",
      priorityWeight: 0.20,
      description:
        "Does this proposal bring new capital into the Soulaan economy by selling Black-created goods, services, or intellectual property to external markets? " +
        "Score high if it generates verifiable outside revenue within 12–24 months — exportable products (skincare, shelf-stable foods, B2B tools, IP platforms), " +
        "logistics serving outside clients, or manufacturing supply chains that sell beyond the co-op. " +
        "Score low if the business model is entirely inward-facing, relies on member spending to survive, or cannot demonstrate a credible path to external revenue. " +
        "Per the charter, expanding UC export inflow is one of the four core pillars of Black economic sovereignty.",
    },
  ];

  // Structural weights must sum to 1
  const structuralWeights = {
    feasibility:    0.40,
    risk:           0.35,
    accountability: 0.25,
  };

  // Score mix must sum to 1
  const scoreMix = {
    missionWeight:    0.60,
    structuralWeight: 0.40,
  };

  const proposalCategories = [
    { key: "business_funding", label: "Business Funding", isActive: true, description: "Capital requests to start, expand, or stabilise a member-owned business. Includes equipment, working capital, licensing, and growth investment." },
    { key: "procurement",      label: "Procurement",      isActive: true, description: "Proposals to establish or formalise collective purchasing agreements, supplier contracts, or bulk-buying arrangements that reduce costs for members." },
    { key: "infrastructure",   label: "Infrastructure",   isActive: true, description: "Investment in shared physical or digital infrastructure — facilities, tools, platforms, or systems that multiple members or the coop as a whole relies on." },
    { key: "transport",        label: "Transport",        isActive: true, description: "Proposals covering logistics, delivery, fleet, or mobility solutions that support member business operations or reduce distribution costs." },
    { key: "wallet_incentive", label: "Wallet Incentive", isActive: true, description: "Programmes that reward members for using the coop's digital wallet, driving internal circulation and reducing leakage from the community economy." },
    { key: "governance",       label: "Governance",       isActive: true, description: "Changes to coop rules, policies, bylaws, voting structures, or operational procedures. Requires heightened scrutiny and broad member input." },
    { key: "other",            label: "Other",            isActive: true, description: "Proposals that don't fit an existing category. AI will apply general screening; the council may re-categorise before voting." },
  ];

  const sectorExclusions = [
    { value: "fashion",           description: "Clothing, apparel, or personal style businesses — excluded due to low community multiplier and high individual-brand risk." },
    { value: "restaurant",        description: "Dine-in food service establishments — excluded due to high failure rate and limited scalability within the coop model." },
    { value: "cafe",              description: "Coffee shops and casual eateries — excluded for the same reasons as restaurants." },
    { value: "food truck",        description: "Mobile food vending — excluded due to logistical complexity and thin margins that rarely generate shared returns." },
    { value: "personality brand", description: "Businesses built around a single individual's public profile — excluded because they cannot be collectively owned or scaled cooperatively." },
    { value: "lifestyle brand",   description: "Consumer identity or aspirational brands — excluded as they prioritise aesthetics over productive economic impact." },
  ];

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
      missionGoals,
      structuralWeights,
      scoreMix,
      screeningPassThreshold: 0.6,
      quorumPercent: 15,
      approvalThresholdPercent: 51,
      votingWindowDays: 7,
      scVotingCapPercent: 2,
      proposalCategories,
      sectorExclusions,
      minScBalanceToSubmit: 0,
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
