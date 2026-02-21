"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, ArrowLeft, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ThumbsUp, AlertCircle, LogOut, Shield,
} from "lucide-react";
import Link from "next/link";
import { useWeb3Auth } from "@/hooks/use-web3-auth";
import { ProposalScores } from "@/components/portal/proposals/proposal-scores";
import { ProposalDecisionBanner } from "@/components/portal/proposals/proposal-decision-badge";
import { CommentForm } from "@/components/portal/proposals/comment-form";
import { CommentList } from "@/components/portal/proposals/comment-list";

const statusColors: Record<string, string> = {
  submitted: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  votable: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  funded: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  failed: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  withdrawn: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

// Valid admin transitions per current status
const adminTransitions: Record<string, { value: string; label: string }[]> = {
  submitted: [
    { value: "votable", label: "Move to Votable" },
    { value: "rejected", label: "Reject" },
    { value: "withdrawn", label: "Withdraw" },
    { value: "failed", label: "Mark as Failed" },
  ],
  votable: [
    { value: "approved", label: "Approve" },
    { value: "rejected", label: "Reject" },
    { value: "withdrawn", label: "Withdraw" },
    { value: "failed", label: "Mark as Failed" },
  ],
  approved: [
    { value: "funded", label: "Mark as Funded" },
    { value: "withdrawn", label: "Withdraw" },
    { value: "failed", label: "Mark as Failed" },
  ],
  rejected: [{ value: "failed", label: "Mark as Failed" }],
  funded: [{ value: "failed", label: "Mark as Failed" }],
  failed: [],
  withdrawn: [],
};

export default function ProposalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { isAdmin, address: walletAddress } = useWeb3Auth();
  const [showTransitions, setShowTransitions] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const [councilVotePending, setCouncilVotePending] = useState(false);

  const { data: proposal, isLoading, refetch: refetchProposal } = api.proposal.getById.useQuery({ id });
  const { data: commentsData, refetch: refetchComments } = api.proposalComment.listByProposal.useQuery(
    { proposalId: id },
    { enabled: !!id },
  );
  const { data: reactions, refetch: refetchReactions } = api.proposalReaction.getCounts.useQuery(
    { proposalId: id, walletAddress: walletAddress ?? undefined },
    { enabled: !!id },
  );

  const createComment = api.proposalComment.create.useMutation({
    onSuccess: () => refetchComments(),
  });

  const updateStatus = api.proposal.updateStatus.useMutation({
    onSuccess: () => { refetchProposal(); setShowTransitions(false); },
  });

  const withdrawMutation = api.proposal.withdraw.useMutation({
    onSuccess: () => { refetchProposal(); setWithdrawConfirm(false); },
  });

  const upsertReaction = api.proposalReaction.upsert.useMutation({
    onSuccess: () => refetchReactions(),
  });

  const councilVote = api.proposal.councilVote.useMutation({
    onSuccess: () => { refetchProposal(); setCouncilVotePending(false); },
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

  const transitions = adminTransitions[proposal.status] ?? [];
  const isProposer = walletAddress && proposal.proposer.wallet === walletAddress;
  const canWithdraw = isProposer && (proposal.status === "submitted" || proposal.status === "votable");
  const councilRequired = (proposal as any).councilRequired;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link href="/portal/proposals" className="inline-flex items-center text-gray-400 hover:text-white text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to proposals
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">{proposal.title}</h1>
          <Badge variant="outline" className={statusColors[proposal.status] ?? ""}>
            {proposal.status}
          </Badge>
          {councilRequired && (
            <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Shield className="h-3 w-3 mr-1" />
              Council Review
            </Badge>
          )}

          {/* Admin manage proposal dropdown */}
          {isAdmin && transitions.length > 0 && (
            <div className="relative ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-gray-300 hover:text-white"
                onClick={() => setShowTransitions(v => !v)}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                Manage Proposal
              </Button>
              {showTransitions && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-slate-800 border border-slate-600 rounded-lg shadow-xl min-w-[180px] overflow-hidden">
                  {transitions.map(t => (
                    <button
                      key={t.value}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                      onClick={() => updateStatus.mutate({ id, status: t.value as any })}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Proposer withdraw button */}
          {canWithdraw && !isAdmin && (
            <div className="ml-auto">
              {withdrawConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Confirm withdrawal?</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                    onClick={() => withdrawMutation.mutate({ id })}
                    disabled={withdrawMutation.isPending}
                  >
                    {withdrawMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, Withdraw"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setWithdrawConfirm(false)}>Cancel</Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-gray-400 hover:text-white"
                  onClick={() => setWithdrawConfirm(true)}
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Withdraw
                </Button>
              )}
            </div>
          )}
        </div>
        <p className="text-gray-400 text-sm">
          {new Date(proposal.createdAt).toLocaleDateString()} | {proposal.region.name} | {proposal.category}
        </p>
      </div>

      {/* Decision Banner */}
      <ProposalDecisionBanner decision={proposal.decision} reasons={proposal.decisionReasons} />

      {/* Council Vote Panel (admin + councilRequired) */}
      {isAdmin && councilRequired && proposal.status === "votable" && (
        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-purple-300 text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Council Vote Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-400 text-sm">
              This proposal exceeds the council review threshold. Admin council vote is required before approval.
            </p>
            <div className="flex gap-2">
              {(["FOR", "AGAINST", "ABSTAIN"] as const).map(v => (
                <Button
                  key={v}
                  size="sm"
                  variant="outline"
                  className={
                    v === "FOR" ? "border-green-500/40 text-green-400 hover:bg-green-500/10" :
                    v === "AGAINST" ? "border-red-500/40 text-red-400 hover:bg-red-500/10" :
                    "border-gray-500/40 text-gray-400 hover:bg-gray-500/10"
                  }
                  onClick={() => {
                    setCouncilVotePending(true);
                    councilVote.mutate({ proposalId: id, vote: v });
                  }}
                  disabled={councilVote.isPending}
                >
                  {councilVote.isPending && councilVotePending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  {v}
                </Button>
              ))}
            </div>
            {councilVote.data && (
              <p className="text-xs text-gray-400">
                Votes: {councilVote.data.forCount} FOR / {councilVote.data.againstCount} AGAINST / {councilVote.data.abstainCount} ABSTAIN
                {councilVote.data.newStatus && (
                  <span className="ml-2 text-amber-400">→ Status changed to {councilVote.data.newStatus}</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Support/Concern Reactions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Community Reactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className={reactions?.myReaction === "SUPPORT"
                ? "border-green-500 text-green-400 bg-green-500/10"
                : "border-slate-600 text-gray-400 hover:border-green-500/50 hover:text-green-400"
              }
              onClick={() => upsertReaction.mutate({ proposalId: id, reaction: "SUPPORT" })}
              disabled={upsertReaction.isPending || !walletAddress}
            >
              <ThumbsUp className="h-4 w-4 mr-1.5" />
              Support
              <span className="ml-1.5 text-xs font-bold">{reactions?.support ?? 0}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={reactions?.myReaction === "CONCERN"
                ? "border-amber-500 text-amber-400 bg-amber-500/10"
                : "border-slate-600 text-gray-400 hover:border-amber-500/50 hover:text-amber-400"
              }
              onClick={() => upsertReaction.mutate({ proposalId: id, reaction: "CONCERN" })}
              disabled={upsertReaction.isPending || !walletAddress}
            >
              <AlertCircle className="h-4 w-4 mr-1.5" />
              Concern
              <span className="ml-1.5 text-xs font-bold">{reactions?.concern ?? 0}</span>
            </Button>
          </div>
          {!walletAddress && (
            <p className="text-gray-500 text-xs mt-2">Connect your wallet to react</p>
          )}
          {reactions?.myReaction && (
            <p className="text-gray-500 text-xs mt-2">
              You reacted: <span className="text-amber-400">{reactions.myReaction}</span> (click again to remove)
            </p>
          )}
        </CardContent>
      </Card>

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
          {(proposal.alternatives.length > 0 || proposal.bestAlternative != null) && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader><CardTitle className="text-white text-lg">Alternatives</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {proposal.bestAlternative != null && (
                  <div className="p-3 bg-amber-500/10 rounded border border-amber-500/30 mb-2">
                    <p className="text-xs text-amber-400 font-semibold mb-1">Recommended Alternative</p>
                    <p className="text-sm font-medium text-white">{(proposal.bestAlternative as any).label}</p>
                    <p className="text-xs text-gray-400 mt-1">{(proposal.bestAlternative as any).rationale}</p>
                  </div>
                )}
                {proposal.alternatives.map((alt: any, i: number) => (
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
          {proposal.missing_data.length > 0 && (
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
