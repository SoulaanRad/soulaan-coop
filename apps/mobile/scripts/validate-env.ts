import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const nodeEnv = process.env.NODE_ENV || "development";

console.log("🔍 Environment validation starting...");
console.log(`📌 NODE_ENV: ${nodeEnv}`);
console.log(`📂 Working directory: ${process.cwd()}`);

const envFiles = [
  `.env.${nodeEnv}.local`,
  `.env.${nodeEnv}`,
  ".env.local",
  ".env",
  "../../.env",
];

console.log("\n📄 Loading environment files:");
envFiles.forEach((file, index) => {
  const fullPath = resolve(process.cwd(), file);
  const exists = existsSync(fullPath);
  const result = loadDotenv({ 
    path: fullPath, 
    override: index < envFiles.length - 1 
  });
  
  if (exists) {
    console.log(`  ✅ ${file} (found, ${result.parsed ? Object.keys(result.parsed).length : 0} vars)`);
  } else {
    console.log(`  ⏭️  ${file} (not found, skipping)`);
  }
});

async function main() {
  console.log("\n🔐 Validating environment variables...");
  await import("../env");
  console.log("✅ Environment validation passed!");
  console.log("\n🌐 Key variables loaded:");
  console.log(`  EXPO_PUBLIC_API_BASE_URL: ${process.env.EXPO_PUBLIC_API_BASE_URL}`);
  console.log(`  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 20)}...`);
  console.log(`  EXPO_PUBLIC_COOP_ID: ${process.env.EXPO_PUBLIC_COOP_ID || "(not set)"}`);
}

main().catch((error) => {
  console.error("\n❌ Environment validation failed:");
  console.error(error);
  process.exit(1);
});
