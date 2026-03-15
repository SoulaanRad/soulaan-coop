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

interface WaitlistData {
  email: string;
  name?: string;
  source: "hero" | "contact";
  suggestedCoop?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, source, suggestedCoop } = body as WaitlistData;
    console.log("waitlist-form request", body);

    // Capture the origin URL
    const origin = request.headers.get("origin") || request.headers.get("referer") || "Unknown";

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

    // Require coop selection
    if (!suggestedCoop?.trim()) {
      return NextResponse.json(
        { success: false, message: "Please select which coop you want to join" },
        { status: 400 }
      );
    }

    const waitlistData: WaitlistData = {
      email,
      name: name || undefined,
      source: source,
      suggestedCoop: suggestedCoop.trim(),
    };

    // Send to Slack first
    await sendWaitlistToSlack(waitlistData, origin);

    // Save to database
    await db.waitlistEntry.upsert({
      where: { email },
      update: {
        name: waitlistData.name,
        source: waitlistData.source,
        notes: waitlistData.suggestedCoop
          ? `Interested coop: ${waitlistData.suggestedCoop}`
          : undefined,
      },
      create: {
        email: waitlistData.email,
        name: waitlistData.name,
        type: "user",
        source: waitlistData.source,
        notes: waitlistData.suggestedCoop
          ? `Interested coop: ${waitlistData.suggestedCoop}`
          : undefined,
      },
    });

    // Identify user in PostHog
    try {
      const posthog = PostHogClient();
      posthog.identify({
        distinctId: waitlistData.email,
        properties: {
          email: waitlistData.email,
          name: waitlistData.name,
          source: waitlistData.source,
          suggestedCoop: waitlistData.suggestedCoop,
          signupType: 'waitlist',
        },
      });
      await posthog.shutdown();
    } catch (error) {
      console.error("PostHog identification error:", error);
      // Don't fail the request if PostHog fails
    }

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
async function sendWaitlistToSlack(data: WaitlistData, origin: string) {
  const slackWebhookUrl = env.SLACK_WEBHOOK_URL;

  if (!slackWebhookUrl) {
    console.log("No Slack webhook configured");
    return;
  }

  const message = {
    text: `🎉 New Soulaan Waitlist Signup!\n\n*Email:* ${data.email}\n*Name:* ${data.name || "Not provided"}\n*Source:* ${data.source}\n*Interested Coop:* ${data.suggestedCoop || "Not provided"}\n*Website URL:* ${origin}\n*Time:* ${new Date().toLocaleString()}`,
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
