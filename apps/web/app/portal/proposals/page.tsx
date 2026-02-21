"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { ProposalCard } from "@/components/portal/proposals/proposal-card";

type StatusFilter = "all" | "draft" | "votable" | "approved" | "funded" | "rejected";

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "votable", label: "Votable" },
  { value: "approved", label: "Approved" },
  { value: "funded", label: "Funded" },
  { value: "rejected", label: "Rejected" },
];

export default function ProposalsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data, isLoading, error } = api.proposal.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Proposals</h1>
          <p className="text-gray-400 mt-1">View and submit proposals for the cooperative</p>
        </div>
        <Link href="/portal/proposals/submit">
          <Button className="bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4 mr-2" />
            Submit Proposal
          </Button>
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 bg-slate-900 rounded-lg p-2">
        {statusTabs.map((tab) => (
          <Button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            variant={statusFilter === tab.value ? "default" : "ghost"}
            className={statusFilter === tab.value ? "bg-amber-600 hover:bg-amber-700" : ""}
            size="sm"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
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

      {/* Proposal Grid */}
      {data && (
        <>
          {data.proposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p>No proposals found</p>
              {statusFilter !== "all" && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setStatusFilter("all")}>
                  Clear filter
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.proposals.map((proposal: any) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 text-center">
            Showing {data.proposals.length} of {data.total} proposals
          </p>
        </>
      )}
    </div>
  );
}
