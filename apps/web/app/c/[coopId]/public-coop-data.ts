import { env } from "@/env";

interface PublicCoopNameResponse {
  name?: string | null;
}

export async function getPublicCoopDisplayName(coopId: string) {
  try {
    const input = JSON.stringify({ coopId });
    const url = `${env.NEXT_PUBLIC_API_URL}/publicCoopInfo.getByCoopIdWithUnpublished?input=${encodeURIComponent(input)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return coopId;
    }

    const data = await response.json();
    const publicInfo = data.result?.data as PublicCoopNameResponse | null;
    return publicInfo?.name || coopId;
  } catch (error) {
    console.error("Error fetching public coop display name:", error);
    return coopId;
  }
}
