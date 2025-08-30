import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { env } from "@/env";

// Create database client directly
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ["query", "error", "warn"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

interface BusinessData {
  ownerName: string;
  ownerEmail: string;
  businessName: string;
  businessAddress: string;
  businessType: string;
  monthlyRevenue: string;
  description?: string;
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
      monthlyRevenue,
      description,
    } = body as BusinessData;

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
      monthlyRevenue,
      description: description || undefined,
    };

    // Save to database
    await db.businessWaitlist.upsert({
      where: { ownerEmail },
      update: {
        ownerName: businessData.ownerName,
        businessName: businessData.businessName,
        businessAddress: businessData.businessAddress,
        businessType: businessData.businessType,
        monthlyRevenue: businessData.monthlyRevenue,
        description: businessData.description,
      },
      create: {
        ownerName: businessData.ownerName,
        ownerEmail: businessData.ownerEmail,
        businessName: businessData.businessName,
        businessAddress: businessData.businessAddress,
        businessType: businessData.businessType,
        monthlyRevenue: businessData.monthlyRevenue,
        description: businessData.description,
      },
    });

    // Send to Slack
    await sendBusinessToSlack(businessData);

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
async function sendBusinessToSlack(data: BusinessData) {
  const slackWebhookUrl = env.SLACK_WEBHOOK_URL;

  if (!slackWebhookUrl) {
    console.log("No Slack webhook configured");
    return;
  }

  const message = {
    text: `🏪 New Business Partnership Interest!\n\n*Business Owner:* ${data.ownerName}\n*Email:* ${data.ownerEmail}\n*Business Name:* ${data.businessName}\n*Address:* ${data.businessAddress}\n*Business Type:* ${data.businessType}\n*Monthly Revenue:* ${data.monthlyRevenue}\n*Description:* ${data.description || "Not provided"}\n*Time:* ${new Date().toLocaleString()}`,
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
