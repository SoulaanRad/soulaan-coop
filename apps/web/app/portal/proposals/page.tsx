"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Plus, CheckSquare, Square, ChevronDown } from "lucide-react";
import Link from "next/link";
import { ProposalCard } from "@/components/portal/proposals/proposal-card";
import { useWeb3Auth } from "@/hooks/use-web3-auth";

type StatusFilter = "all" | "submitted" | "votable" | "approved" | "funded" | "rejected" | "failed" | "withdrawn";

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "votable", label: "Votable" },
  { value: "approved", label: "Approved" },
  { value: "funded", label: "Funded" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
  { value: "withdrawn", label: "Withdrawn" },
];

const PAGE_SIZE = 20;

const ALL_STATUSES: StatusFilter[] = ["submitted", "votable", "approved", "funded", "rejected", "failed", "withdrawn"];

export default function ProposalsPage() {
  const { isAdmin } = useWeb3Auth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [offset, setOffset] = useState(0);
  const [allProposals, setAllProposals] = useState<any[]>([]);

  // Bulk management state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<StatusFilter>("rejected");
  const [bulkApplying, setBulkApplying] = useState(false);

  const { data, isLoading, error, refetch } = api.proposal.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: PAGE_SIZE,
    offset,
  });

  // Accumulate proposals for "load more"
  useEffect(() => {
    if (!data) return;
    if (offset === 0) {
      setAllProposals(data.proposals);
    } else {
      setAllProposals(prev => [...prev, ...data.proposals]);
    }
  }, [data, offset]);

  const updateStatus = api.proposal.updateStatus.useMutation();

  function handleTabChange(tab: StatusFilter) {
    setStatusFilter(tab);
    setOffset(0);
    setAllProposals([]);
    setSelectedIds(new Set());
    setBulkMode(false);
  }

  function handleLoadMore() {
    setOffset(prev => prev + PAGE_SIZE);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === allProposals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allProposals.map(p => p.id)));
    }
  }

  async function applyBulkStatus() {
    if (selectedIds.size === 0) return;
    setBulkApplying(true);
    try {
      for (const id of selectedIds) {
        await updateStatus.mutateAsync({ id, status: bulkStatus as any });
      }
      setSelectedIds(new Set());
      setOffset(0);
      setAllProposals([]);
      refetch();
    } finally {
      setBulkApplying(false);
    }
  }

  const hasMore = data ? offset + PAGE_SIZE < data.total : false;
  // While loading offset=0 page, show skeleton; on load-more, show existing + spinner below
  const displayedProposals = allProposals;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Proposals</h1>
          <p className="text-gray-400 mt-1">View and submit proposals for the cooperative</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className={bulkMode ? "border-amber-500 text-amber-400" : "border-slate-600 text-gray-400"}
              onClick={() => { setBulkMode(b => !b); setSelectedIds(new Set()); }}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              {bulkMode ? "Cancel Bulk" : "Bulk Edit"}
            </Button>
          )}
          <Link href="/portal/proposals/submit">
            <Button className="bg-amber-600 hover:bg-amber-700">
              <Plus className="h-4 w-4 mr-2" />
              Submit Proposal
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 bg-slate-900 rounded-lg p-2 flex-wrap">
        {statusTabs.map((tab) => (
          <Button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            variant={statusFilter === tab.value ? "default" : "ghost"}
            className={statusFilter === tab.value ? "bg-amber-600 hover:bg-amber-700" : ""}
            size="sm"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Loading State (initial) */}
      {isLoading && offset === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          Failed to load proposals: {error.message}
        </div>
      )}

      {/* Bulk Action Bar */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-800 border border-slate-600 rounded-xl px-5 py-3 shadow-2xl">
          <span className="text-white text-sm font-medium">{selectedIds.size} selected</span>
          <span className="text-gray-500 text-sm">→ Change status to</span>
          <div className="relative">
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as StatusFilter)}
              className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 appearance-none pr-8"
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
          </div>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
            onClick={applyBulkStatus}
            disabled={bulkApplying}
          >
            {bulkApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </div>
      )}

      {/* Bulk select all row */}
      {bulkMode && displayedProposals.length > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-gray-400">
            {selectedIds.size === displayedProposals.length ? (
              <CheckSquare className="h-4 w-4 mr-1 text-amber-400" />
            ) : (
              <Square className="h-4 w-4 mr-1" />
            )}
            {selectedIds.size === displayedProposals.length ? "Deselect All" : "Select All"}
          </Button>
          <span className="text-gray-500 text-xs">{selectedIds.size} of {displayedProposals.length} selected</span>
        </div>
      )}

      {/* Proposal Grid */}
      {!isLoading && (
        <>
          {displayedProposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p>No proposals found</p>
              {statusFilter !== "all" && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => handleTabChange("all")}>
                  Clear filter
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedProposals.map((proposal: any) => (
                <div key={proposal.id} className="relative">
                  {bulkMode && (
                    <button
                      onClick={() => toggleSelect(proposal.id)}
                      className="absolute top-3 left-3 z-10 w-6 h-6 flex items-center justify-center rounded border-2 bg-slate-800"
                      style={{ borderColor: selectedIds.has(proposal.id) ? "#f59e0b" : "#475569" }}
                    >
                      {selectedIds.has(proposal.id) && (
                        <div className="w-3 h-3 rounded-sm bg-amber-500" />
                      )}
                    </button>
                  )}
                  <ProposalCard proposal={proposal} />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing {displayedProposals.length} of {data?.total ?? displayedProposals.length} proposals
            </p>
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-gray-400 hover:text-white"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                Load More
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
