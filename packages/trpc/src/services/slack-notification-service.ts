/**
 * Slack Notification Service
 * Sends notifications to Slack for important events
 */

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function sendSlackNotification(message: {
  text: string;
  attachments?: Array<{
    color?: string;
    fields?: Array<{ title: string; value: string; short?: boolean }>;
  }>;
}) {
  if (!SLACK_WEBHOOK_URL) {
    console.log("⚠️ Slack webhook not configured, skipping notification");
    return;
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(`Slack webhook failed: ${response.status}`);
    } else {
      console.log("✅ Slack notification sent");
    }
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
  }
}

export async function sendApplicationSubmittedNotification(params: {
  coopId: string;
  coopName?: string;
  applicantEmail?: string;
  applicantName?: string;
  applicationId: string;
}) {
  const { coopId, coopName, applicantEmail, applicantName, applicationId } = params;

  await sendSlackNotification({
    text: `📝 New Membership Application Submitted!`,
    attachments: [
      {
        color: "good",
        fields: [
          {
            title: "Co-op",
            value: coopName || coopId,
            short: true,
          },
          {
            title: "Applicant",
            value: applicantName || applicantEmail || "Unknown",
            short: true,
          },
          {
            title: "Email",
            value: applicantEmail || "Not provided",
            short: true,
          },
          {
            title: "Application ID",
            value: applicationId,
            short: true,
          },
          {
            title: "Time",
            value: new Date().toLocaleString(),
            short: false,
          },
        ],
      },
    ],
  });
}
