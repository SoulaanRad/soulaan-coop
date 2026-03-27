import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { env } from "@/env";
import PostHogClient from "@/lib/posthog";

// Create database client directly
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ["query", "error", "warn"],
});

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

interface BusinessData {
  ownerName: string;
  ownerEmail: string;
  businessName: string;
  businessAddress: string;
  businessType: string;
  coopInterest?: string;
  description?: string;
  coopId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ownerName,
      ownerEmail,
      businessName,
      businessAddress,
      businessType,
      coopInterest,
      description,
      coopId,
    } = body as BusinessData;

    // Capture the origin URL
    const origin = request.headers.get("origin") || request.headers.get("referer") || "Unknown";

    // Validation
    if (!ownerName || !ownerEmail || !businessName || !businessAddress) {
      return NextResponse.json(
        { success: false, message: "Please fill in all required fields" },
        { status: 400 }
      );
    }

    if (!ownerEmail.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const businessData: BusinessData = {
      ownerName,
      ownerEmail,
      businessName,
      businessAddress,
      businessType,
      coopInterest: coopInterest?.trim() || undefined,
      coopId: coopId?.trim() || undefined,
      description: [
        description?.trim(),
        coopInterest?.trim()
          ? `Preferred coop: ${coopInterest.trim()}`
          : undefined,
      ]
        .filter(Boolean)
        .join("\n\n") || undefined,
    };

    // Save to database using simple unique key on ownerEmail
    await db.businessWaitlist.upsert({
      where: { 
        ownerEmail,
      },
      update: {
        ownerName: businessData.ownerName,
        businessName: businessData.businessName,
        businessAddress: businessData.businessAddress,
        businessType: businessData.businessType,
        coopId: businessData.coopId || null,
        description: businessData.description,
      },
      create: {
        ownerName: businessData.ownerName,
        ownerEmail: businessData.ownerEmail,
        coopId: businessData.coopId || null,
        businessName: businessData.businessName,
        businessAddress: businessData.businessAddress,
        businessType: businessData.businessType,
        monthlyRevenue: '',
        description: businessData.description,
      },
    });

    // Send to Slack
    await sendBusinessToSlack(businessData, origin);

    // Identify user in PostHog
    try {
      const posthog = PostHogClient();
      posthog.identify({
        distinctId: businessData.ownerEmail,
        properties: {
          email: businessData.ownerEmail,
          name: businessData.ownerName,
          businessName: businessData.businessName,
          businessAddress: businessData.businessAddress,
          businessType: businessData.businessType,
          coopInterest: businessData.coopInterest,
          signupType: 'business',
        },
      });
      await posthog.shutdown();
    } catch (error) {
      console.error("PostHog identification error:", error);
      // Don't fail the request if PostHog fails
    }

    return NextResponse.json({
      success: true,
      message: "Thanks for your interest! We'll contact you about partnership opportunities.",
    });
  } catch (error) {
    console.error("Business signup error:", error);
    return NextResponse.json(
      { success: false, message: "Business signup error. Please try again." },
      { status: 500 }
    );
  }
}

// Send business signup to Slack
async function sendBusinessToSlack(data: BusinessData, origin: string) {
  const slackWebhookUrl = env.SLACK_WEBHOOK_URL;

  if (!slackWebhookUrl) {
    console.log("No Slack webhook configured");
    return;
  }

  const message = {
    text: `🏪 New Business Partnership Interest!\n\n*Business Owner:* ${data.ownerName}\n*Email:* ${data.ownerEmail}\n*Business Name:* ${data.businessName}\n*Address:* ${data.businessAddress}\n*Business Type:* ${data.businessType}\n*Preferred Coop:* ${data.coopInterest || "Not provided"}\n*Description:* ${data.description || "Not provided"}\n*Website URL:* ${origin}\n*Time:* ${new Date().toLocaleString()}`,
  };

  const response = await fetch(slackWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status}`);
  }
}
