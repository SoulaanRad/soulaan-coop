import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv({ path: resolve(process.cwd(), ".env"), override: true });

const { env } = await import("../env");

const missing: string[] = [];

if (env.NODE_ENV === "production") {
  if (!env.SESSION_SECRET) missing.push("SESSION_SECRET");
  if (!env.NEXT_PUBLIC_API_URL) missing.push("NEXT_PUBLIC_API_URL");
}

if (missing.length > 0) {
  throw new Error(`Missing required web environment variables:\n- ${missing.join("\n- ")}`);
}
