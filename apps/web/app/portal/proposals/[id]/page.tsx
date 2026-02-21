"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { ProposalScores } from "@/components/portal/proposals/proposal-scores";
import { ProposalDecisionBadge, ProposalDecisionBanner } from "@/components/portal/proposals/proposal-decision-badge";
import { CommentForm } from "@/components/portal/proposals/comment-form";
import { CommentList } from "@/components/portal/proposals/comment-list";

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  votable: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  funded: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ProposalDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: proposal, isLoading } = api.proposal.getById.useQuery({ id });
  const { data: commentsData, refetch: refetchComments } = api.proposalComment.listByProposal.useQuery(
    { proposalId: id },
    { enabled: !!id },
  );

  const createComment = api.proposalComment.create.useMutation({
    onSuccess: () => refetchComments(),
  });

  const handleCommentSubmit = async (content: string) => {
    await createComment.mutateAsync({ proposalId: id, content });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-400">Proposal not found</p>
        <Link href="/portal/proposals" className="text-amber-500 hover:underline mt-2 inline-block">
          Back to proposals
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link href="/portal/proposals" className="inline-flex items-center text-gray-400 hover:text-white text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to proposals
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{proposal.title}</h1>
          <Badge variant="outline" className={statusColors[proposal.status] ?? ""}>
            {proposal.status}
          </Badge>
        </div>
        <p className="text-gray-400 text-sm">
          {new Date(proposal.createdAt).toLocaleDateString()} | {proposal.region.name} | {proposal.category}
        </p>
      </div>

      {/* Decision Banner */}
      <ProposalDecisionBanner decision={proposal.decision} reasons={proposal.decisionReasons} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white text-lg">Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm">{proposal.summary}</p>
            </CardContent>
          </Card>

          {/* Details Grid */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white text-lg">Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Category</span>
                <p className="text-white">{proposal.category}</p>
              </div>
              <div>
                <span className="text-gray-500">Budget</span>
                <p className="text-white">{proposal.budget.currency} {proposal.budget.amountRequested.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">Treasury Split</span>
                <p className="text-white">Local {proposal.treasuryPlan.localPercent}% / National {proposal.treasuryPlan.nationalPercent}%</p>
              </div>
              <div>
                <span className="text-gray-500">Region</span>
                <p className="text-white">{proposal.region.name} ({proposal.region.code})</p>
              </div>
              <div>
                <span className="text-gray-500">Jobs Created</span>
                <p className="text-white">{proposal.impact.jobsCreated}</p>
              </div>
              <div>
                <span className="text-gray-500">Leakage Reduction</span>
                <p className="text-white">${proposal.impact.leakageReductionUSD.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Alternatives */}
          {((proposal.alternatives && proposal.alternatives.length > 0) || proposal.bestAlternative) && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader><CardTitle className="text-white text-lg">Alternatives</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {proposal.bestAlternative && (
                  <div className="p-3 bg-amber-500/10 rounded border border-amber-500/30 mb-2">
                    <p className="text-xs text-amber-400 font-semibold mb-1">Recommended Alternative</p>
                    <p className="text-sm font-medium text-white">{(proposal.bestAlternative as any).label}</p>
                    <p className="text-xs text-gray-400 mt-1">{(proposal.bestAlternative as any).rationale}</p>
                  </div>
                )}
                {(proposal.alternatives ?? []).map((alt: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-900 rounded border border-slate-700">
                    <p className="text-sm font-medium text-white">{alt.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{alt.rationale}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {alt.changes?.map((change: any, j: number) => (
                        <span key={j} className="text-xs bg-slate-700 text-gray-300 px-2 py-0.5 rounded">
                          {change.field}: {String(change.from ?? "?")} → {String(change.to)}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-amber-400 mt-1">
                      Composite: {(alt.scores?.composite * 100).toFixed(0)}%
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Missing Data */}
          {proposal.missing_data && proposal.missing_data.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader><CardTitle className="text-white text-lg">Missing Data</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {proposal.missing_data.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    {item.blocking ? (
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-white">{item.field}: {item.question}</p>
                      <p className="text-xs text-gray-500">{item.why_needed}</p>
                      <Badge variant="outline" className={item.blocking ? "text-red-400 border-red-500/30" : "text-amber-400 border-amber-500/30"}>
                        {item.blocking ? "Blocking" : "Non-blocking"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Audit Checks */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white text-lg">Compliance Checks</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {proposal.audit.checks.map((check: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {check.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-gray-300">{check.name.replace(/_/g, " ")}</span>
                  {check.note && <span className="text-xs text-gray-500">({check.note})</span>}
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2">Engine: {proposal.audit.engineVersion}</p>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white text-lg">Comments</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CommentForm
                onSubmit={handleCommentSubmit}
                isSubmitting={createComment.isPending}
              />
              <CommentList comments={commentsData?.comments ?? []} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Scores */}
        <div className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white text-lg">Scores</CardTitle></CardHeader>
            <CardContent>
              <ProposalScores scores={proposal.scores} goalScores={proposal.goalScores} />
            </CardContent>
          </Card>

          {/* Governance */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white text-sm">Governance</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Quorum</span>
                <span className="text-white">{proposal.governance.quorumPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Approval</span>
                <span className="text-white">{proposal.governance.approvalThresholdPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Voting Window</span>
                <span className="text-white">{proposal.governance.votingWindowDays} days</span>
              </div>
            </CardContent>
          </Card>

          {/* Proposer */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white text-sm">Proposer</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-white">{proposal.proposer.displayName || "Anonymous"}</p>
              <p className="text-gray-500 font-mono text-xs">{proposal.proposer.wallet}</p>
              <Badge variant="outline" className="text-gray-400 border-slate-600 text-xs">
                {proposal.proposer.role}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
