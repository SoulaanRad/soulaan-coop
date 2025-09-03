import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";

import { trpcExpress } from "@repo/trpc/server";
import { createMiddleware } from "@sashimo/lib"


import "dotenv/config";

import type { Application, Request, Response } from "express";
import express from "express";

const app: Application = express();

// Enable CORS for all routes
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use("/trpc", trpcExpress);

app.use("/sashi", createMiddleware({
  openAIKey: process.env.OPENAI_API_KEY || ""
}));

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});

export default app;
