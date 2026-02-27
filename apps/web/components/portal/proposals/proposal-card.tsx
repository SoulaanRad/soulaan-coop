"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProposalDecisionBadge } from "./proposal-decision-badge";

const statusColors: Record<string, string> = {
  submitted: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  votable: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  funded: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  failed: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

function prettifyKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

interface ProposalCardProps {
  proposal: {
    id: string;
    title: string;
    summary: string;
    status: string;
    category: string;
    evaluation?: { computed_scores?: { overall_score?: number } } | null;
    proposer: { wallet: string; displayName?: string | null };
    region: { name: string };
    createdAt: string;
    decision?: string | null;
  };
  categoryLabels?: Record<string, string>;
}

export function ProposalCard({ proposal, categoryLabels }: ProposalCardProps) {
  const statusClass = statusColors[proposal.status] ?? statusColors.submitted;
  const catLabel = categoryLabels?.[proposal.category] ?? prettifyKey(proposal.category);
  const date = new Date(proposal.createdAt).toLocaleDateString();
  const scorePct = Math.round((proposal.evaluation?.computed_scores?.overall_score ?? 0) * 100);

  return (
    <Link href={`/portal/proposals/${proposal.id}`}>
      <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-500 transition-colors cursor-pointer">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white text-sm line-clamp-2">{proposal.title}</h3>
            <div className="flex gap-1 shrink-0">
              <Badge variant="outline" className={statusClass}>
                {proposal.status}
              </Badge>
            </div>
          </div>

          <p className="text-gray-400 text-xs line-clamp-2">{proposal.summary}</p>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-slate-700/50 text-gray-300 border-slate-600 text-xs">
                {catLabel}
              </Badge>
              <ProposalDecisionBadge decision={proposal.decision} />
            </div>
            <span className="font-mono text-amber-400">{scorePct}%</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{proposal.proposer.displayName || proposal.proposer.wallet.slice(0, 10) + "..."}</span>
            <span>{proposal.region.name} | {date}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
