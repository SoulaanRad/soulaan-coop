#!/usr/bin/env node

/**
 * Demo script for the Proposal Engine AI Function
 * 
 * This demonstrates how the Sashimo AI function works for processing proposals.
 * The function will use mock data when OPENAI_API_KEY is not set.
 */

console.log("🚀 Proposal Engine AI Function Demo\n")

console.log("📝 The AI function 'process_proposal' has been created with the following signature:")
console.log(`
process_proposal(
  title: string,                    // "Community Solar Farm Initiative" 
  summary: string,                  // Detailed description of the proposal
  proposerWallet: string,           // "0x1234567890abcdef"
  proposerRole: string,             // "member" | "merchant" | "anchor" | "bot"
  regionCode: string,               // "US" | "CA" | "UK" etc.
  regionName: string,               // "California" | "Ontario" etc.
  category: string,                 // "business_funding" | "infrastructure" etc.
  currency: string,                 // "UC" | "USD" | "mixed"
  amountRequested: number,          // 150000
  localPercent: number,             // 70 (0-100)
  nationalPercent: number           // 30 (0-100, must sum to 100 with local)
)
`)

console.log("🤖 The AI function processes proposals through multiple agents:")
console.log("   • Impact Agent: Scores alignment (0-1) and feasibility (0-1)")
console.log("   • Governance Agent: Sets voting parameters (quorum %, approval %, days)")
console.log("   • KPI Agent: Generates success metrics")
console.log("   • Decision Agent: Determines status (draft/votable/approved/funded/rejected)")
console.log("   • Compliance Checks: Validates treasury allocation, sector rules, etc.")

console.log("\n📊 Example output structure:")
console.log(`{
  "id": "prop_ABC123",
  "createdAt": "2024-09-01T15:30:00Z", 
  "status": "draft",
  "title": "Community Solar Farm Initiative",
  "summary": "Establish a 50kW solar farm...",
  "scores": {
    "alignment": 0.75,
    "feasibility": 0.80,
    "composite": 0.775
  },
  "governance": {
    "quorumPercent": 20,
    "approvalThresholdPercent": 60,
    "votingWindowDays": 7
  },
  "audit": {
    "engineVersion": "proposal-engine@agents-1.0.0",
    "checks": [
      { "name": "treasury_allocation_sum", "passed": true },
      { "name": "sector_exclusion_screen", "passed": true }
    ]
  }
}`)

console.log("\n🔧 Environment Configuration:")
console.log(`   • OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "✅ Set (uses real AI agents)" : "❌ Not set (uses mock data)"}`)
console.log(`   • NODE_ENV: ${process.env.NODE_ENV || "development"}`)

console.log("\n✅ The AI function is registered and ready to be called by Sashimo!")
console.log("🎯 Use this function to process cooperative proposals with AI-powered analysis.")
