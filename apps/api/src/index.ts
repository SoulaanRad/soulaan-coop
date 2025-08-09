import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";

import { trpcExpress } from "@repo/trpc/server";

import "dotenv/config";

import type { Application, Request, Response } from "express";
import express from "express";

const app: Application = express();

// Enable CORS for all routes
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:8082"],
    credentials: true,
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use("/trpc", trpcExpress);

const port = process.env.PORT || 5001;

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});

export default app;
