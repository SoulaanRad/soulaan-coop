import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";

import { trpcExpress } from "@repo/trpc/server";
import { createMiddleware } from "@sashimo/lib"


import "dotenv/config";

import type { Application, Request, Response } from "express";
import express from "express";
import os from "os";

const app: Application = express();

// Import webhook handlers
import { handleStripeWebhook, handlePayPalWebhook, handleSquareWebhook } from './webhooks';

// IMPORTANT: Stripe webhooks need raw body for signature verification
// So we add this route BEFORE the general JSON parser
app.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// Parse JSON bodies (for all other routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  console.log(`📨 INCOMING REQUEST`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log(`🔵 Method: ${req.method}`);
  console.log(`🔗 Path: ${req.path}`);
  console.log(`🌐 Origin: ${req.get('origin') || 'N/A'}`);
  
  if (req.method === 'POST' || req.method === 'PUT') {
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

app.use("/trpc", trpcExpress);

app.use("/sashi", createMiddleware({
  openAIKey: process.env.OPENAI_API_KEY || ""
}));

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
  console.log('💡 For mobile testing, update your mobile app config to:');
  console.log(`   API_BASE_URL: 'http://${localIp}:${port}'\n`);
});

export default app;
