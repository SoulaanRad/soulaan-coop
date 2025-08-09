"use server";

import { env } from "@/src/env";

import { db } from "@repo/db";

interface WaitlistData {
  email: string;
  name?: string;
  source: "hero" | "contact";
}

interface BusinessData {
  ownerName: string;
  ownerEmail: string;
  businessName: string;
  businessAddress: string;
  businessType: string;
  monthlyRevenue: string;
  description?: string;
}

export async function joinWaitlist(formData: FormData) {
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const source = formData.get("source") as string;

  if (!email || !email.includes("@")) {
    return {
      success: false,
      message: "Please enter a valid email address",
    };
  }

  const waitlistData: WaitlistData = {
    email,
    name: name || undefined,
    source: source as "hero" | "contact",
  };

  try {
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

    // Send to Slack
    await sendWaitlistToSlack(waitlistData);

    return {
      success: true,
      message: "You're on the list! We'll be in touch soon.",
    };
  } catch (error) {
    console.error("Waitlist signup error:", error);
    return {
      success: false,
      message: "Waitlist signup error. Please try again.",
    };
  }
}

export async function submitBusinessSignup(formData: FormData) {
  const ownerName = formData.get("ownerName") as string;
  const ownerEmail = formData.get("ownerEmail") as string;
  const businessName = formData.get("businessName") as string;
  const businessAddress = formData.get("businessAddress") as string;
  const businessType = formData.get("businessType") as string;
  const monthlyRevenue = formData.get("monthlyRevenue") as string;
  const description = formData.get("description") as string;

  // Validation
  if (!ownerName || !ownerEmail || !businessName || !businessAddress) {
    return {
      success: false,
      message: "Please fill in all required fields",
    };
  }

  if (!ownerEmail.includes("@")) {
    return {
      success: false,
      message: "Please enter a valid email address",
    };
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

  try {
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

    return {
      success: true,
      message:
        "Thanks for your interest! We'll contact you about partnership opportunities.",
    };
  } catch (error) {
    console.error("Business signup error:", error);
    return {
      success: false,
      message: "Business signup error. Please try again.",
    };
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
