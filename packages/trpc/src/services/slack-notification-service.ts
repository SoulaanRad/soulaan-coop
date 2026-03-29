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

export async function sendApiHealthNotification(params: {
  status: "up" | "down" | "degraded";
  service: "api" | "web" | "database";
  error?: string;
  uptime?: number;
  environment?: string;
}) {
  const { status, service, error, uptime, environment } = params;

  const emoji = status === "up" ? "✅" : status === "down" ? "🔴" : "⚠️";
  const color = status === "up" ? "good" : status === "down" ? "danger" : "warning";
  const statusText = status === "up" ? "Online" : status === "down" ? "Offline" : "Degraded";

  const fields: Array<{ title: string; value: string; short?: boolean }> = [
    {
      title: "Service",
      value: service.toUpperCase(),
      short: true,
    },
    {
      title: "Status",
      value: statusText,
      short: true,
    },
  ];

  if (environment) {
    fields.push({
      title: "Environment",
      value: environment,
      short: true,
    });
  }

  if (uptime !== undefined) {
    fields.push({
      title: "Uptime",
      value: `${Math.floor(uptime / 60)} minutes`,
      short: true,
    });
  }

  if (error) {
    fields.push({
      title: "Error",
      value: error,
      short: false,
    });
  }

  fields.push({
    title: "Time",
    value: new Date().toLocaleString(),
    short: false,
  });

  await sendSlackNotification({
    text: `${emoji} ${service.toUpperCase()} Service ${statusText}`,
    attachments: [
      {
        color,
        fields,
      },
    ],
  });
}

export async function sendApiStartupNotification(params: {
  service: "api" | "web";
  port?: number;
  environment?: string;
  version?: string;
}) {
  const { service, port, environment, version } = params;

  const fields: Array<{ title: string; value: string; short?: boolean }> = [
    {
      title: "Service",
      value: service.toUpperCase(),
      short: true,
    },
    {
      title: "Status",
      value: "Started",
      short: true,
    },
  ];

  if (port) {
    fields.push({
      title: "Port",
      value: port.toString(),
      short: true,
    });
  }

  if (environment) {
    fields.push({
      title: "Environment",
      value: environment,
      short: true,
    });
  }

  if (version) {
    fields.push({
      title: "Version",
      value: version,
      short: true,
    });
  }

  fields.push({
    title: "Time",
    value: new Date().toLocaleString(),
    short: false,
  });

  await sendSlackNotification({
    text: `🚀 ${service.toUpperCase()} Service Started`,
    attachments: [
      {
        color: "good",
        fields,
      },
    ],
  });
}

export async function sendApiErrorNotification(params: {
  service: "api" | "web";
  error: string;
  stack?: string;
  path?: string;
  method?: string;
}) {
  const { service, error, stack, path, method } = params;

  const fields: Array<{ title: string; value: string; short?: boolean }> = [
    {
      title: "Service",
      value: service.toUpperCase(),
      short: true,
    },
    {
      title: "Error Type",
      value: "Uncaught Exception",
      short: true,
    },
  ];

  if (method && path) {
    fields.push({
      title: "Endpoint",
      value: `${method} ${path}`,
      short: false,
    });
  }

  fields.push({
    title: "Error Message",
    value: error.substring(0, 500),
    short: false,
  });

  if (stack) {
    fields.push({
      title: "Stack Trace",
      value: stack.substring(0, 1000),
      short: false,
    });
  }

  fields.push({
    title: "Time",
    value: new Date().toLocaleString(),
    short: false,
  });

  await sendSlackNotification({
    text: `💥 ${service.toUpperCase()} Service Error`,
    attachments: [
      {
        color: "danger",
        fields,
      },
    ],
  });
}
