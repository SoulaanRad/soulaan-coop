import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { env } from "~/env";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const coopId = request.headers.get("x-coop-id");

    if (!coopId) {
      return NextResponse.json(
        { success: false, error: "Missing X-Coop-Id header" },
        { status: 400 }
      );
    }

    // Get API URL from environment
    const apiUrl = env.NEXT_PUBLIC_API_URL?.replace("/trpc", "") || "http://localhost:3001";

    // Forward request to Express API server
    const response = await fetch(`${apiUrl}/api/upload/presigned-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Coop-Id": coopId,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Upload presigned batch URL proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate presigned URLs",
      },
      { status: 500 }
    );
  }
}
