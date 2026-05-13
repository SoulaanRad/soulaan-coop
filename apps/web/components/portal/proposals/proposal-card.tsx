"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProposalDecisionBadge } from "./proposal-decision-badge";
import { ArrowRight, CalendarDays, MapPin, UserRound } from "lucide-react";

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
  coopId?: string;
}

export function ProposalCard({ proposal, categoryLabels, coopId }: ProposalCardProps) {
  const statusClass = statusColors[proposal.status] ?? statusColors.submitted;
  const catLabel = categoryLabels?.[proposal.category] ?? prettifyKey(proposal.category);
  const date = new Date(proposal.createdAt).toLocaleDateString();
  const scorePct = Math.round((proposal.evaluation?.computed_scores?.overall_score ?? 0) * 100);
  const href = coopId ? `/portal/${coopId}/proposals/${proposal.id}` : `/portal/proposals/${proposal.id}`;

  return (
    <Link href={href} className="group block h-full">
      <Card className="h-full border-zinc-800 bg-zinc-950/70 text-zinc-50 shadow-none transition-colors hover:border-zinc-700 hover:bg-zinc-900/80">
        <CardContent className="flex h-full flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-2">
              <Badge variant="outline" className="border-zinc-700 bg-zinc-900/70 text-xs text-zinc-300">
                {catLabel}
              </Badge>
              <h3 className="line-clamp-2 text-base font-semibold text-zinc-50 transition-colors group-hover:text-amber-100">
                {proposal.title}
              </h3>
            </div>
            <div className="flex gap-1 shrink-0">
              <Badge variant="outline" className={statusClass}>
                {proposal.status}
              </Badge>
            </div>
          </div>

          <p className="line-clamp-3 text-sm leading-6 text-zinc-400">{proposal.summary}</p>

          <div className="mt-auto space-y-3 border-t border-zinc-800 pt-3">
            <div className="flex items-center justify-between gap-3">
              <ProposalDecisionBadge decision={proposal.decision} />
              <div className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-200">
                {scorePct}% score
              </div>
            </div>

            <div className="grid gap-2 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <UserRound className="h-3.5 w-3.5" />
                <span className="truncate">
                  {proposal.proposer.displayName || proposal.proposer.wallet.slice(0, 10) + "..."}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {proposal.region.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {date}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end text-xs font-medium text-zinc-500 transition-colors group-hover:text-amber-200">
              Open proposal
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
