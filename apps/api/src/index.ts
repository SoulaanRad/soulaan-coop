// Environment variables are preloaded via -r dotenv/config flag (see package.json)
// Verify they're loaded correctly
console.log(`\n🔐 Environment Variables Check:`);
console.log(`  WALLET_ENCRYPTION_KEY: ${process.env.WALLET_ENCRYPTION_KEY ? '✅ Set (' + process.env.WALLET_ENCRYPTION_KEY.substring(0, 8) + '...)' : '❌ NOT SET'}`);
console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ NOT SET'}`);

// Import modules
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import { trpcExpress } from "@repo/trpc/server";
import type { Application, Request, Response } from "express";
import express from "express";
import os from "os";
import { fileURLToPath } from "url";
import { resolve } from "path";

const app: Application = express();

// Import webhook handlers
import { handleStripeWebhook, handlePayPalWebhook, handleSquareWebhook } from './webhooks';
import uploadRouter from './routes/upload.js';

// IMPORTANT: Stripe webhooks need raw body for signature verification
// So we add this route BEFORE the general JSON parser
app.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// Parse JSON bodies (for non-tRPC routes only)
// tRPC has its own body parsing with SuperJSON transformer
app.use((req, res, next) => {
  if (req.path.startsWith('/trpc')) {
    // Skip JSON parsing for tRPC routes - tRPC handles its own body parsing
    return next();
  }
  express.json()(req, res, next);
});
app.use((req, res, next) => {
  if (req.path.startsWith('/trpc')) {
    return next();
  }
  express.urlencoded({ extended: true })(req, res, next);
});

// Enable CORS for all routes - allow mobile app origins
app.use(
  cors({
    origin: [
      "http://localhost:3000",      // Web app
      "http://localhost:8081",      // Expo dev server
      "http://localhost:19000",     // Alternative Expo port
      "http://localhost:19006",     // Expo web
    ],
    credentials: true,
  }),
);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log incoming request
  console.log('\n' + '═'.repeat(80));
  console.log(`📨 ${req.method} ${req.path}`);
  console.log(`⏰ ${new Date().toISOString()}`);

  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    console.log(`📦 Body:`, JSON.stringify(req.body, null, 2));
  }
  
  // Capture original res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    const duration = Date.now() - start;
    
    console.log(`\n📤 RESPONSE`);
    console.log(`✅ Status: ${res.statusCode}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    
    // Log response body (truncate if too large)
    const bodyStr = JSON.stringify(body, null, 2);
    if (bodyStr.length > 500) {
      console.log(`📄 Body: ${bodyStr.substring(0, 500)}... (truncated)`);
    } else {
      console.log(`📄 Body:`, bodyStr);
    }
    
    // Check for errors in tRPC response
    if (body.error) {
      console.log(`❌ ERROR DETECTED:`, body.error);
    }
    
    console.log('═'.repeat(80) + '\n');
    
    return originalJson(body);
  };
  
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// Webhook endpoints (PayPal and Square use JSON body)
app.post('/webhooks/paypal', handlePayPalWebhook);
app.post('/webhooks/square', handleSquareWebhook);

// File upload endpoints
app.use('/api/upload', uploadRouter);

app.use("/trpc", trpcExpress);

// TODO: Fix Sashimo middleware path-to-regexp compatibility issue
// Temporarily commented out - causing PathError with '*' route pattern
// app.use("/sashi", createMiddleware({
//   openAIKey: process.env.OPENAI_API_KEY || ""
// }));

// Error handling middleware (MUST be after all routes)
app.use((err: any, req: any, res: any, next: any) => {
  console.error('\n' + '🚨 '.repeat(40));
  console.error('❌ ERROR OCCURRED');
  console.error(`⏰ Time: ${new Date().toISOString()}`);
  console.error(`🔗 Path: ${req.path}`);
  console.error(`💥 Error:`, err);
  console.error(`📚 Stack:`, err.stack);
  console.error('🚨 '.repeat(40) + '\n');
  
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const port = process.env.PORT || 3001;

// Helper function to get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

app.listen(port, () => {
  const localIp = getLocalIpAddress();
  console.log('\n🚀 API Server is running!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Port: ${port}`);
  console.log(`🌐 Local:   http://localhost:${port}`);
  console.log(`📱 Network: http://${localIp}:${port}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Log environment variable status
  console.log('\n📋 Environment Variables:');
  console.log(`  PINATA_JWT: ${process.env.PINATA_JWT ? '✅ Set' : '❌ Not set'}`);
  console.log(`  WALLET_ENCRYPTION_KEY: ${process.env.WALLET_ENCRYPTION_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`  STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Not set'}`);

  console.log('\n💡 For mobile testing, update your mobile app config to:');
  console.log(`   API_BASE_URL: 'http://${localIp}:${port}'\n`);
});

export default app;
