"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { useWeb3Auth } from "@/hooks/use-web3-auth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Filter,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | "PENDING" | "ACKNOWLEDGED" | "REJECTED" | "SUPERSEDED";

interface ConfigAmendment {
  id: string;
  type: "config";
  section: string;
  reason: string;
  status: string;
  proposedBy: string;
  proposedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  proposedChanges: Record<string, unknown>;
  currentSnapshot: Record<string, unknown>;
}

interface CharterAmendment {
  id: string;
  type: "charter";
  reason: string;
  status: string;
  proposedBy: string;
  proposedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  proposedText: string;
  currentText: string;
}

type AnyAmendment = ConfigAmendment | CharterAmendment;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  missionGoals: "Mission Goals",
  structuralWeights: "Structural Weights",
  scoreMix: "Score Mix",
  screeningThreshold: "Screening Threshold",
  votingRules: "Voting Rules",
  proposalCategories: "Proposal Categories",
  sectorExclusions: "Sector Exclusions",
  submissionRequirements: "Submission Requirements",
  approvalTiers: "Approval Tiers",
};

function statusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 border border-amber-600/40 px-2 py-0.5 text-xs text-amber-300 font-medium">
          <Clock className="h-3 w-3" /> Pending
        </span>
      );
    case "ACKNOWLEDGED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-900/30 border border-green-600/40 px-2 py-0.5 text-xs text-green-300 font-medium">
          <CheckCircle2 className="h-3 w-3" /> Accepted
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-900/30 border border-red-600/40 px-2 py-0.5 text-xs text-red-300 font-medium">
          <XCircle className="h-3 w-3" /> Rejected
        </span>
      );
    case "SUPERSEDED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/60 border border-slate-600/40 px-2 py-0.5 text-xs text-slate-400 font-medium">
          Superseded
        </span>
      );
    default:
      return <span className="text-xs text-gray-500">{status}</span>;
  }
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Render a JSON diff — compare currentSnapshot vs proposedChanges for config,
// or currentText vs proposedText for charter.
function JsonDiff({
  current,
  proposed,
}: {
  current: Record<string, unknown>;
  proposed: Record<string, unknown>;
}) {
  const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(proposed)]));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-2">
      <div className="space-y-1">
        <p className="text-xs font-medium text-red-400 flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Before
        </p>
        <div className="rounded bg-red-950/20 border border-red-800/30 p-2 space-y-1 text-xs font-mono text-gray-400 max-h-52 overflow-y-auto">
          {keys.map((k) => (
            <div key={k}>
              <span className="text-gray-500">{k}: </span>
              {JSON.stringify(current[k], null, 1)}
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-green-400 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Proposed
        </p>
        <div className="rounded bg-green-950/20 border border-green-800/30 p-2 space-y-1 text-xs font-mono text-gray-300 max-h-52 overflow-y-auto">
          {keys.map((k) => (
            <div key={k}>
              <span className="text-gray-500">{k}: </span>
              {JSON.stringify(proposed[k], null, 1)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TextDiff({ current, proposed }: { current: string; proposed: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-2">
      <div className="space-y-1">
        <p className="text-xs font-medium text-red-400 flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Current
        </p>
        <div className="rounded bg-red-950/20 border border-red-800/30 p-2 text-xs text-gray-400 max-h-52 overflow-y-auto whitespace-pre-wrap font-mono">
          {current || <em className="text-gray-600">empty</em>}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-green-400 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Proposed
        </p>
        <div className="rounded bg-green-950/20 border border-green-800/30 p-2 text-xs text-gray-300 max-h-52 overflow-y-auto whitespace-pre-wrap font-mono">
          {proposed}
        </div>
      </div>
    </div>
  );
}

// ─── Amendment Card ───────────────────────────────────────────────────────────

function AmendmentCard({
  amendment,
  isAdmin,
  onAcknowledge,
  onReject,
  isMutating,
}: {
  amendment: AnyAmendment;
  isAdmin: boolean;
  onAcknowledge: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  isMutating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const isPending = amendment.status === "PENDING";
  const label =
    amendment.type === "charter"
      ? "Charter Text"
      : (SECTION_LABELS[amendment.section] ?? amendment.section);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white text-sm">{label}</span>
            {statusBadge(amendment.status)}
            <Badge
              variant="outline"
              className="text-xs text-slate-400 border-slate-600 font-mono"
            >
              {amendment.type === "charter" ? "charter" : "config"}
            </Badge>
          </div>
          <p className="text-xs text-gray-400 line-clamp-2">{amendment.reason}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
            <span>
              Proposed by{" "}
              <span className="font-mono text-gray-400">{shortAddr(amendment.proposedBy)}</span>
            </span>
            <span>{formatDate(amendment.proposedAt)}</span>
            {amendment.reviewedBy && (
              <span>
                Reviewed by{" "}
                <span className="font-mono text-gray-400">{shortAddr(amendment.reviewedBy)}</span>
                {amendment.reviewedAt ? ` · ${formatDate(amendment.reviewedAt)}` : ""}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700"
        >
          {expanded ? "Hide diff" : "Show diff"}
        </button>
      </div>

      {/* Diff (collapsible) */}
      {expanded && (
        <div className="px-4 pb-4">
          {amendment.type === "charter" ? (
            <TextDiff
              current={amendment.currentText}
              proposed={amendment.proposedText}
            />
          ) : (
            <JsonDiff
              current={amendment.currentSnapshot}
              proposed={amendment.proposedChanges}
            />
          )}
        </div>
      )}

      {/* Admin actions for pending items */}
      {isPending && isAdmin && (
        <div className="border-t border-slate-700 bg-slate-900/30 px-4 py-3">
          {!showReject ? (
            <div className="flex gap-2">
              <button
                onClick={() => onAcknowledge(amendment.id)}
                disabled={isMutating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white text-xs font-medium transition-colors"
              >
                {isMutating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Acknowledge & Apply
              </button>
              <button
                onClick={() => setShowReject(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-700/50 text-red-400 hover:bg-red-900/20 text-xs font-medium transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="bg-slate-900 border-slate-600 text-white text-xs h-8 flex-1"
              />
              <button
                onClick={() => {
                  onReject(amendment.id, rejectReason || "Rejected");
                  setShowReject(false);
                  setRejectReason("");
                }}
                disabled={isMutating}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white text-xs font-medium transition-colors shrink-0"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowReject(false);
                  setRejectReason("");
                }}
                className="text-xs text-gray-400 hover:text-white px-1"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AmendmentsPage() {
  const { isAdmin } = useWeb3Auth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const { data, isLoading, refetch } = api.coopConfig.getAllAmendments.useQuery(
    { coopId: "soulaan" },
  );

  const { data: configData, refetch: refetchConfig } =
    api.coopConfig.getActive.useQuery({ coopId: "soulaan" });

  const acknowledgeConfig = api.coopConfig.acknowledgeConfigAmendment.useMutation({
    onSuccess: () => { void refetch(); void refetchConfig(); },
  });
  const rejectConfig = api.coopConfig.rejectConfigAmendment.useMutation({
    onSuccess: () => void refetch(),
  });
  const acknowledgeCharter = api.coopConfig.acknowledgeCharterAmendment.useMutation({
    onSuccess: () => { void refetch(); void refetchConfig(); },
  });
  const rejectCharter = api.coopConfig.rejectCharterAmendment.useMutation({
    onSuccess: () => void refetch(),
  });

  const isMutating =
    acknowledgeConfig.isPending ||
    rejectConfig.isPending ||
    acknowledgeCharter.isPending ||
    rejectCharter.isPending;

  const handleAcknowledge = (amendment: AnyAmendment) => {
    if (amendment.type === "charter") {
      acknowledgeCharter.mutate({ amendmentId: amendment.id, coopId: "soulaan" });
    } else {
      acknowledgeConfig.mutate({ amendmentId: amendment.id, coopId: "soulaan" });
    }
  };

  const handleReject = (amendment: AnyAmendment, reason: string) => {
    if (amendment.type === "charter") {
      rejectCharter.mutate({ amendmentId: amendment.id, reason });
    } else {
      rejectConfig.mutate({ amendmentId: amendment.id, reason });
    }
  };

  // Merge and sort all amendments newest-first
  const all: AnyAmendment[] = [
    ...(data?.config ?? []),
    ...(data?.charter ?? []),
  ].sort((a, b) => new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime());

  const filtered =
    statusFilter === "ALL" ? all : all.filter((a) => a.status === statusFilter);

  const pendingCount = all.filter((a) => a.status === "PENDING").length;

  const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "ACKNOWLEDGED", label: "Accepted" },
    { value: "REJECTED", label: "Rejected" },
    { value: "SUPERSEDED", label: "Superseded" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/portal/proposals/config"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Config
        </Link>
        <span className="text-slate-600">/</span>
        <h1 className="text-xl font-bold text-white">Proposed Changes</h1>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 border border-amber-600/40 px-2 py-0.5 text-xs text-amber-300 font-medium">
            <AlertTriangle className="h-3 w-3" />
            {pendingCount} pending
          </span>
        )}
      </div>

      <p className="text-sm text-gray-400">
        All proposed configuration changes — including charter edits. Admins can
        acknowledge or reject pending items here.
      </p>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-gray-500 shrink-0" />
        {STATUS_OPTIONS.map(({ value, label }) => (
          <Button
            key={value}
            variant={statusFilter === value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(value)}
            className={
              statusFilter === value
                ? "bg-indigo-700 hover:bg-indigo-600 text-white border-indigo-700"
                : "border-slate-600 text-gray-400 hover:text-white hover:bg-slate-700"
            }
          >
            {label}
            {value !== "ALL" && (
              <span className="ml-1.5 text-xs opacity-70">
                {all.filter((a) => a.status === value).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
          <FileText className="h-10 w-10 opacity-30" />
          <p className="text-sm">No {statusFilter !== "ALL" ? statusFilter.toLowerCase() : ""} changes found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((amendment) => (
            <AmendmentCard
              key={amendment.id}
              amendment={amendment}
              isAdmin={isAdmin ?? false}
              onAcknowledge={() => handleAcknowledge(amendment)}
              onReject={(_, reason) => handleReject(amendment, reason)}
              isMutating={isMutating}
            />
          ))}
        </div>
      )}

      {/* Only show config link when there's live config context available */}
      {configData && (
        <p className="text-xs text-gray-600 text-center pb-4">
          Active config version: v{configData.version}
        </p>
      )}
    </div>
  );
}
