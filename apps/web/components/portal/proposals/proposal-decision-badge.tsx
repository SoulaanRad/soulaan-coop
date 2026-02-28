"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const decisionConfig: Record<string, { label: string; className: string; bannerClassName: string; icon: typeof CheckCircle2 }> = {
  advance: {
    label: "Advance",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
    bannerClassName: "bg-green-500/10 border-green-500/30 text-green-400",
    icon: CheckCircle2,
  },
  revise: {
    label: "Revise",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    bannerClassName: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    icon: AlertTriangle,
  },
  block: {
    label: "Block",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
    bannerClassName: "bg-red-500/10 border-red-500/30 text-red-400",
    icon: XCircle,
  },
};

export function ProposalDecisionBadge({ decision }: { decision?: string | null }) {
  if (!decision) return null;
  const config = decisionConfig[decision] ?? { label: decision, className: "bg-gray-500/20 text-gray-400", bannerClassName: "", icon: AlertTriangle };
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

export function ProposalDecisionBanner({ decision, reasons }: { decision?: string | null; reasons?: string[] }) {
  if (!decision) return null;
  const config = decisionConfig[decision] ?? { label: decision, bannerClassName: "bg-gray-500/10 border-gray-500/30 text-gray-400", icon: AlertTriangle };
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-4 rounded-lg border p-5 ${config.bannerClassName}`}>
      <Icon className="h-8 w-8 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-xl font-bold uppercase tracking-wide">{config.label}</p>
        {reasons && reasons.length > 0 && (
          <div className="space-y-1">
            {reasons.map((reason, i) => (
              <p key={i} className="text-sm opacity-80">{reason}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
