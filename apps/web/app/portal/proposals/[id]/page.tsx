"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, ArrowLeft, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ThumbsUp, AlertCircle, LogOut, Shield,
  Pencil, Sparkles, RotateCcw, History, ChevronUp, Star,
} from "lucide-react";
import Link from "next/link";
import { useWeb3Auth } from "@/hooks/use-web3-auth";
import { ProposalScores } from "@/components/portal/proposals/proposal-scores";
import { ProposalDecisionBanner } from "@/components/portal/proposals/proposal-decision-badge";
import { CommentForm } from "@/components/portal/proposals/comment-form";
import { CommentList } from "@/components/portal/proposals/comment-list";

function prettifyKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

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

  // Edit & resubmit state
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editText, setEditText] = useState("");
  const [applyingAltIndex, setApplyingAltIndex] = useState<number | null>(null);
  const [expandedRevision, setExpandedRevision] = useState<number | null>(null);

  const { data: proposal, isLoading, refetch: refetchProposal } = api.proposal.getById.useQuery({ id });
  const { data: coopConfig } = api.coopConfig.getActive.useQuery({ coopId: "soulaan" });
  const categoryLabels: Record<string, string> = Object.fromEntries(
    (coopConfig?.proposalCategories ?? []).map((c: { key: string; label: string }) => [c.key, c.label])
  );
  const catLabel = (key: string) => categoryLabels[key] ?? prettifyKey(key);
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

  const resubmit = api.proposal.resubmit.useMutation({
    onSuccess: () => { refetchProposal(); refetchRevisions(); setShowEditPanel(false); },
  });

  const applyAlternative = api.proposal.applyAlternative.useMutation({
    onSuccess: (updatedProposal) => {
      // Use mutation payload immediately so edit panel always shows rewritten text,
      // even before query refetch settles.
      setEditText(updatedProposal.rawText ?? updatedProposal.summary ?? "");
      setShowEditPanel(true);
      refetchProposal();
      refetchRevisions();
      setApplyingAltIndex(null);
    },
    onError: () => { setApplyingAltIndex(null); },
  });

  const { data: revisions, refetch: refetchRevisions } = api.proposal.getRevisions.useQuery(
    { proposalId: id },
    { enabled: !!id },
  );

  // Expert scoring state
  const [expertScoreInputs, setExpertScoreInputs] = useState<Record<string, { score: string; reason: string }>>({});
  const [expandedExpertGoal, setExpandedExpertGoal] = useState<string | null>(null);
  const { data: myExpertAssignments } = api.proposalExpert.myAssignments.useQuery(undefined, {
    enabled: !!walletAddress,
  });
  const myDomains = new Set((myExpertAssignments ?? []).map((a: any) => a.domain));
  const latestRevisionNumber = revisions ? Math.max(...revisions.map((r: any) => r.revisionNumber)) : undefined;
  const { data: goalScores, refetch: refetchGoalScores } = api.proposalExpert.getGoalScores.useQuery(
    { proposalId: id, revisionNumber: latestRevisionNumber },
    { enabled: !!id && latestRevisionNumber != null },
  );
  const myGoalScores = (goalScores ?? []).filter((gs: any) => myDomains.has(gs.domain));
  const upsertExpertScore = api.proposalExpert.upsertExpertScore.useMutation({
    onSuccess: () => {
      refetchProposal();
      refetchGoalScores();
    },
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
  const canEdit = isProposer && (proposal.status === "submitted" || proposal.status === "votable");
  const councilRequired = proposal.councilRequired;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link href="/portal/proposals" className="inline-flex items-center text-gray-400 hover:text-white text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to proposals
      </Link>

      {/* Header */}
      <div className="space-y-2">
        {/* Title row: left = title + badges, right = action buttons */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{proposal.title}</h1>
            <Badge variant="outline" className={statusColors[proposal.status] ?? ""}>
              {proposal.status}
            </Badge>
            {councilRequired && (
              <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                <Shield className="h-3 w-3 mr-1" />
                Council Vote Required
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Proposer actions */}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                onClick={() => {
                  setEditText(proposal.rawText ?? proposal.summary ?? "");
                  setShowEditPanel(v => !v);
                }}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit & Resubmit
              </Button>
            )}
            {canWithdraw && (
              withdrawConfirm ? (
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
              )
            )}

            {/* Admin: manage status dropdown */}
            {isAdmin && transitions.length > 0 && (
              <div className="relative">
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
          </div>
        </div>

        {/* Meta row */}
        <p className="text-gray-400 text-sm">
          {new Date(proposal.createdAt).toLocaleDateString()} | {proposal.region.name} | {catLabel(proposal.category)}
        </p>
      </div>

      {/* Decision Banner */}
      <ProposalDecisionBanner decision={proposal.decision} reasons={proposal.decisionReasons} />

      {/* Edit & Resubmit Panel */}
      {showEditPanel && canEdit && (
        <Card className="bg-amber-500/5 border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-amber-300 text-sm flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Edit & Resubmit Proposal
            </CardTitle>
            <p className="text-gray-400 text-xs mt-1">
              Update your proposal text below. The AI will re-evaluate it from scratch when you resubmit.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={8}
              className="bg-slate-900 border-slate-600 text-white text-sm resize-y"
              placeholder="Describe your proposal in plain language..."
            />
            {resubmit.isError && (
              <p className="text-xs text-red-400">{(resubmit.error as any)?.message ?? "Resubmit failed."}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowEditPanel(false)}
                disabled={resubmit.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => resubmit.mutate({ proposalId: id, text: editText })}
                disabled={resubmit.isPending || editText.trim().length < 10}
              >
                {resubmit.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    Re-evaluating…
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3 mr-1.5" />
                    Resubmit for Review
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                <p className="text-white">{catLabel(proposal.category)}</p>
              </div>
              <div>
                <span className="text-gray-500">Budget</span>
                <p className="text-white">{proposal.budget.currency} {proposal.budget.amountRequested.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">Location</span>
                <p className="text-white">{proposal.region.name}</p>
              </div>
            </CardContent>
          </Card>

          {/* Alternatives */}
          {(proposal.alternatives.length > 0 || proposal.bestAlternative != null) && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">AI-Suggested Alternatives</CardTitle>
                {canEdit && (
                  <p className="text-gray-500 text-xs mt-1">
                    Click "Apply this Alternative" to have the AI rewrite and re-evaluate your proposal with those changes.
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {proposal.bestAlternative != null && (
                  <div className="p-3 bg-amber-500/10 rounded border border-amber-500/30 mb-2">
                    <p className="text-xs text-amber-400 font-semibold mb-1">Recommended Alternative</p>
                    <p className="text-sm font-medium text-white">{(proposal.bestAlternative as any).label}</p>
                    <p className="text-xs text-gray-400 mt-1">{(proposal.bestAlternative as any).rationale}</p>
                  </div>
                )}
                {proposal.alternatives.map((alt: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-900 rounded border border-slate-700 space-y-2">
                    <p className="text-sm font-medium text-white">{alt.label}</p>
                    <p className="text-xs text-gray-400">{alt.rationale}</p>
                    <div className="flex gap-2 flex-wrap">
                      {alt.changes?.map((change: any, j: number) => (
                        <span key={j} className="text-xs bg-slate-700 text-gray-300 px-2 py-0.5 rounded">
                          {change.field}: {String(change.from ?? "?")} → {String(change.to)}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      {alt.overallScore != null && (
                        <p className="text-xs text-slate-400" title="Unverified AI estimate — apply alternative and resubmit for an official score">
                          Est. score: {Math.round((alt.overallScore ?? 0) * 100)}% <span className="opacity-60">(unverified)</span>
                        </p>
                      )}
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs h-7 px-2.5"
                          onClick={() => {
                            setApplyingAltIndex(i);
                            applyAlternative.mutate({ proposalId: id, alternativeIndex: i });
                          }}
                          disabled={applyAlternative.isPending}
                        >
                          {applyAlternative.isPending && applyingAltIndex === i ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Applying…
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 mr-1" />
                              Apply this Alternative
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {applyAlternative.isError && (
                  <p className="text-xs text-red-400 mt-1">{(applyAlternative.error as any)?.message ?? "Failed to apply alternative."}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Missing Data */}
          {proposal.missing_data.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader><CardTitle className="text-white text-lg">Missing Data</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {proposal.missing_data.map((item: any, i: number) => {
                  const sev: string = item.severity ?? (item.blocking ? "BLOCKER" : "SOFT");
                  const isBlocker = sev === "BLOCKER";
                  const isInfo = sev === "INFO";
                  const iconColor = isBlocker ? "text-red-400" : isInfo ? "text-blue-400" : "text-amber-400";
                  const badgeStyle = isBlocker
                    ? "text-red-400 border-red-500/30"
                    : isInfo
                      ? "text-blue-400 border-blue-500/30"
                      : "text-amber-400 border-amber-500/30";
                  return (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className={`h-4 w-4 ${iconColor} shrink-0 mt-0.5`} />
                      <div>
                        <p className="text-white">{item.field}: {item.question}</p>
                        <p className="text-xs text-gray-500">{item.why_needed}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={badgeStyle}>
                            {sev}
                          </Badge>
                          {item.affectedGoalIds?.length > 0 && (
                            <span className="text-xs text-gray-500">
                              affects: {item.affectedGoalIds.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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

          {/* Submission History / Audit Trail */}
          {revisions && revisions.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-amber-400" />
                  Submission History
                  <span className="text-xs text-gray-500 font-normal ml-1">{revisions.length} revision{revisions.length !== 1 ? "s" : ""}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...revisions].reverse().map((rev) => {
                  const isExpanded = expandedRevision === rev.revisionNumber;
                  const decisionColor =
                    rev.decision === "advance" ? "text-green-400 border-green-500/30 bg-green-500/5" :
                    rev.decision === "block"   ? "text-red-400 border-red-500/30 bg-red-500/5" :
                    "text-amber-400 border-amber-500/30 bg-amber-500/5";
                  const overallScore = (rev.evaluation)?.computed_scores?.overall_score;
                  return (
                    <div key={rev.revisionNumber} className="border border-slate-700 rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors text-left"
                        onClick={() => setExpandedRevision(isExpanded ? null : rev.revisionNumber)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-500 w-6">#{rev.revisionNumber}</span>
                          <Badge variant="outline" className={`text-xs ${decisionColor}`}>
                            {rev.decision ?? "unknown"}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(rev.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {overallScore != null && (
                            <span className={`text-xs font-semibold ${overallScore >= 0.7 ? "text-green-400" : overallScore >= 0.4 ? "text-amber-400" : "text-red-400"}`}>
                              {Math.round(overallScore * 100)}%
                            </span>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50">
                          {/* Decision reasons */}
                          {rev.decisionReasons.length > 0 && (
                            <div className="pt-3">
                              <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Decision Reasons</p>
                              <ul className="space-y-1">
                                {rev.decisionReasons.map((r: string, i: number) => (
                                  <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                                    <span className="text-amber-500 mt-0.5">•</span>{r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Compliance checks */}
                          {(rev.auditChecks).length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Compliance Checks</p>
                              <div className="space-y-1">
                                {(rev.auditChecks).map((check: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2 text-xs">
                                    {check.passed
                                      ? <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
                                      : <XCircle className="h-3 w-3 text-red-400 shrink-0" />}
                                    <span className="text-gray-400">{check.name.replace(/_/g, " ")}</span>
                                    {check.note && <span className="text-gray-600">({check.note})</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* AI Summary */}
                          {(rev.evaluation)?.llm_summary && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">AI Summary</p>
                              <p className="text-xs text-gray-400 italic">{(rev.evaluation).llm_summary}</p>
                            </div>
                          )}

                          {/* Raw text submitted */}
                          {rev.rawText && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Submitted Text</p>
                              <p className="text-xs text-gray-400 bg-slate-900 rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">{rev.rawText}</p>
                            </div>
                          )}

                          <p className="text-xs text-gray-600">Engine: {rev.engineVersion}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Community Discussion */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white text-lg">Community Discussion</CardTitle></CardHeader>
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
              <ProposalScores evaluation={proposal.evaluation} goalScores={goalScores as any} />
            </CardContent>
          </Card>

          {/* Expert Review Panel — only visible to assigned experts */}
          {myGoalScores.length > 0 && (
            <Card className="bg-slate-800/50 border-amber-600/30">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400" />
                  Expert Review
                  <span className="text-xs text-gray-500 font-normal ml-1">{myGoalScores.length} goal{myGoalScores.length !== 1 ? "s" : ""} assigned to you</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {myGoalScores.map((gs: any) => {
                  const goalKey = gs.goalId;
                  const isOpen = expandedExpertGoal === goalKey;
                  const inp = expertScoreInputs[goalKey] ?? { score: "", reason: "" };
                  const scoreNum = parseFloat(inp.score);
                  const scoreValid = !isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 1;
                  return (
                    <div key={goalKey} className="border border-slate-700 rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors text-left"
                        onClick={() => setExpandedExpertGoal(isOpen ? null : goalKey)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white font-medium">{prettifyKey(goalKey)}</span>
                          <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">{gs.domain}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">AI</span>
                            <span className="text-blue-400 font-semibold">{Math.round(gs.aiScore * 100)}%</span>
                            {gs.expertScore != null && (
                              <>
                                <span className="text-gray-600">→</span>
                                <span className="text-amber-400 font-semibold">{Math.round(gs.expertScore * 100)}%</span>
                                <span className="text-gray-500">Expert</span>
                              </>
                            )}
                          </div>
                          {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
                          {gs.expertScore != null && (
                            <div className="text-xs text-gray-400 bg-slate-900 rounded p-2">
                              <span className="text-gray-500">Previous expert note:</span> {gs.expertReason}
                            </div>
                          )}
                          <div className="space-y-1">
                            <label className="text-xs text-gray-400">Score (0.00 – 1.00)</label>
                            <input
                              type="number"
                              min={0}
                              max={1}
                              step={0.01}
                              placeholder={String(gs.aiScore.toFixed(2))}
                              value={inp.score}
                              onChange={e => setExpertScoreInputs(prev => ({ ...prev, [goalKey]: { ...inp, score: e.target.value } }))}
                              className="w-full bg-slate-900 text-white border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-gray-400">Reason for override</label>
                            <Textarea
                              rows={2}
                              placeholder="Explain why you're adjusting this score…"
                              value={inp.reason}
                              onChange={e => setExpertScoreInputs(prev => ({ ...prev, [goalKey]: { ...inp, reason: e.target.value } }))}
                              className="bg-slate-900 text-white border-slate-600 text-sm"
                            />
                          </div>
                          <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white w-full"
                            disabled={!scoreValid || inp.reason.length < 5 || upsertExpertScore.isPending}
                            onClick={() => {
                              upsertExpertScore.mutate({
                                proposalId: id,
                                revisionNumber: gs.revisionNumber,
                                goalId: goalKey,
                                score: scoreNum,
                                reason: inp.reason,
                              });
                            }}
                          >
                            {upsertExpertScore.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Star className="h-3 w-3 mr-1" />}
                            Submit Expert Score
                          </Button>
                          {upsertExpertScore.isError && (
                            <p className="text-xs text-red-400">{(upsertExpertScore.error as any)?.message ?? "Failed to save score."}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Review Parameters */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white text-sm">Review Parameters</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Approval Tier</span>
                <span className={councilRequired ? "text-purple-400 font-semibold" : "text-green-400 font-semibold"}>
                  {councilRequired ? "Council Vote" : "AI Auto-Approved"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deliberation Window</span>
                <span className="text-white">{proposal.governance.votingWindowDays}d</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Quorum</span>
                <span className="text-white">{proposal.governance.quorumPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Approval Threshold</span>
                <span className="text-white">{proposal.governance.approvalThresholdPercent}%</span>
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
