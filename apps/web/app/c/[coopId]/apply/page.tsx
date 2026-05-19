import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ coopId: string }>;
}

export default async function LegacyCoopApplyRedirect({ params }: PageProps) {
  const { coopId } = await params;
  redirect(`/${coopId}/application`);
}
