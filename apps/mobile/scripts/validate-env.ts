import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(process.cwd(), ".env") });
loadDotenv({ path: resolve(process.cwd(), "../../.env"), override: false });

async function main() {
  await import("../env");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
