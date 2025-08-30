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

interface WaitlistData {
  email: string;
  name?: string;
  source: "hero" | "contact";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, source } = body as WaitlistData;
    console.log("waitlist-form request", body);

    // Validation
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!email?.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!source || !["hero", "contact"].includes(source)) {
      return NextResponse.json(
        { success: false, message: "Invalid source" },
        { status: 400 }
      );
    }

    const waitlistData: WaitlistData = {
      email,
      name: name || undefined,
      source: source,
    };

    // Send to Slack first
    await sendWaitlistToSlack(waitlistData);

    // Save to database
    await db.waitlistEntry.upsert({
      where: { email },
      update: {
        name: waitlistData.name,
        source: waitlistData.source,
      },
      create: {
        email: waitlistData.email,
        name: waitlistData.name,
        type: "user",
        source: waitlistData.source,
      },
    });

    return NextResponse.json({
      success: true,
      message: "You're on the list! We'll be in touch soon.",
    });
  } catch (error) {
    console.error("Waitlist signup error:", error);
    return NextResponse.json(
      { success: false, message: "Waitlist signup error. Please try again." },
      { status: 500 }
    );
  }
}

// Send waitlist signup to Slack
async function sendWaitlistToSlack(data: WaitlistData) {
  const slackWebhookUrl = env.SLACK_WEBHOOK_URL;

  if (!slackWebhookUrl) {
    console.log("No Slack webhook configured");
    return;
  }

  const message = {
    text: `🎉 New Soulaan Waitlist Signup!\n\n*Email:* ${data.email}\n*Name:* ${data.name || "Not provided"}\n*Source:* ${data.source}\n*Time:* ${new Date().toLocaleString()}`,
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
