"use client";

import { Badge } from "@/components/ui/badge";

const alignmentConfig: Record<string, { label: string; className: string }> = {
  ALIGNED: { label: "Aligned", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  NEUTRAL: { label: "Neutral", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  MISALIGNED: { label: "Misaligned", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function CommentAlignmentBadge({ alignment }: { alignment: string }) {
  const config = alignmentConfig[alignment] ?? { label: alignment, className: "bg-gray-500/20 text-gray-400" };
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}
