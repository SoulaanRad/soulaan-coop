"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";
import { useWeb3Auth } from "@/hooks/use-web3-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { ConfigSectionEditor } from "@/components/portal/proposals/config-section-editor";
import { CharterPreview } from "@/components/portal/proposals/charter-preview";

export default function CoopConfigPage() {
  const { isAdmin } = useWeb3Auth();
  const { data: config, refetch, isLoading } = api.coopConfig.getActive.useQuery({ coopId: "soulaan" });
  const { data: versions } = api.coopConfig.listVersions.useQuery({ coopId: "soulaan" });

  const updateConfig = api.coopConfig.update.useMutation({
    onSuccess: () => refetch(),
  });

  // Editing state
  const [editCharterText, setEditCharterText] = useState("");
  const [editQuorum, setEditQuorum] = useState("");
  const [editApproval, setEditApproval] = useState("");
  const [editWindow, setEditWindow] = useState("");
  const [editMinSc, setEditMinSc] = useState("");
  const [editCouncilThreshold, setEditCouncilThreshold] = useState("");

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Admin Access Required</h2>
        <p className="text-gray-400">You need admin privileges to manage co-op configuration.</p>
        <Link href="/portal/proposals" className="text-amber-500 hover:underline">
          Back to proposals
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-400">No configuration found. Run the seed script first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/portal/proposals" className="inline-flex items-center text-gray-400 hover:text-white text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to proposals
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Co-op Configuration</h1>
          <p className="text-gray-400 text-sm mt-1">
            Version {config.version} | {config.coopId} | Last updated by {config.createdBy}
          </p>
        </div>
      </div>

      {/* Charter */}
      <ConfigSectionEditor
        title="Charter Text"
        onSave={async (reason) => {
          await updateConfig.mutateAsync({
            coopId: config.coopId,
            charterText: editCharterText || config.charterText,
            reason,
          });
        }}
        isSaving={updateConfig.isPending}
      >
        <CharterPreview text={config.charterText} />
        <div className="mt-3">
          <Textarea
            defaultValue={config.charterText}
            onChange={(e) => setEditCharterText(e.target.value)}
            className="bg-slate-900 border-slate-600 text-white min-h-[150px] text-sm"
            placeholder="Charter text..."
          />
        </div>
      </ConfigSectionEditor>

      {/* Goal Definitions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader><CardTitle className="text-white">Goal Definitions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {config.goalDefinitions.map((goal: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 bg-slate-900 rounded">
                <div>
                  <span className="text-white font-medium">{goal.label}</span>
                  <span className="text-gray-500 ml-2">({goal.key})</span>
                  {goal.description && <p className="text-xs text-gray-500">{goal.description}</p>}
                </div>
                <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                  {(goal.weight * 100).toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Voting Rules */}
      <ConfigSectionEditor
        title="Voting Rules"
        onSave={async (reason) => {
          await updateConfig.mutateAsync({
            coopId: config.coopId,
            quorumPercent: editQuorum ? parseFloat(editQuorum) : undefined,
            approvalThresholdPercent: editApproval ? parseFloat(editApproval) : undefined,
            votingWindowDays: editWindow ? parseInt(editWindow) : undefined,
            reason,
          });
        }}
        isSaving={updateConfig.isPending}
      >
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Quorum %</span>
            <Input
              type="number"
              defaultValue={config.quorumPercent}
              onChange={(e) => setEditQuorum(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white mt-1"
            />
          </div>
          <div>
            <span className="text-gray-500">Approval %</span>
            <Input
              type="number"
              defaultValue={config.approvalThresholdPercent}
              onChange={(e) => setEditApproval(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white mt-1"
            />
          </div>
          <div>
            <span className="text-gray-500">Voting Window (days)</span>
            <Input
              type="number"
              defaultValue={config.votingWindowDays}
              onChange={(e) => setEditWindow(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white mt-1"
            />
          </div>
        </div>
      </ConfigSectionEditor>

      {/* Proposal Categories */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader><CardTitle className="text-white">Proposal Categories</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {config.proposalCategories.map((cat: any, i: number) => (
              <Badge
                key={i}
                variant="outline"
                className={cat.isActive
                  ? "text-green-400 border-green-500/30"
                  : "text-gray-500 border-gray-600"
                }
              >
                {cat.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sector Exclusions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader><CardTitle className="text-white">Sector Exclusions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {config.sectorExclusions.map((sector: string, i: number) => (
              <Badge key={i} variant="outline" className="text-red-400 border-red-500/30">
                {sector}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submission Requirements */}
      <ConfigSectionEditor
        title="Submission Requirements"
        onSave={async (reason) => {
          await updateConfig.mutateAsync({
            coopId: config.coopId,
            minScBalanceToSubmit: editMinSc ? parseFloat(editMinSc) : undefined,
            reason,
          });
        }}
        isSaving={updateConfig.isPending}
      >
        <div className="text-sm">
          <span className="text-gray-500">Min SC Balance to Submit</span>
          <Input
            type="number"
            defaultValue={config.minScBalanceToSubmit}
            onChange={(e) => setEditMinSc(e.target.value)}
            className="bg-slate-900 border-slate-600 text-white mt-1 max-w-xs"
          />
        </div>
      </ConfigSectionEditor>

      {/* Council Vote Threshold */}
      <ConfigSectionEditor
        title="Council Review"
        onSave={async (reason) => {
          await updateConfig.mutateAsync({
            coopId: config.coopId,
            councilVoteThresholdUSD: editCouncilThreshold ? parseFloat(editCouncilThreshold) : undefined,
            reason,
          });
        }}
        isSaving={updateConfig.isPending}
      >
        <div className="text-sm space-y-1">
          <span className="text-gray-500">Council Review Threshold (USD)</span>
          <p className="text-xs text-gray-600">
            Proposals with AI "advance" decision AND budget ≥ this amount require council vote before approval.
            Proposals under this amount are auto-approved.
          </p>
          <Input
            type="number"
            defaultValue={(config as any).councilVoteThresholdUSD ?? 5000}
            onChange={(e) => setEditCouncilThreshold(e.target.value)}
            className="bg-slate-900 border-slate-600 text-white mt-1 max-w-xs"
          />
        </div>
      </ConfigSectionEditor>

      {/* Scoring Weights */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader><CardTitle className="text-white">Scoring Weights</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {Object.entries(config.scoringWeights).map(([key, value]: [string, any]) => (
              <div key={key} className="flex justify-between p-2 bg-slate-900 rounded">
                <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="text-white">{(value * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Version History */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader><CardTitle className="text-white">Version History</CardTitle></CardHeader>
        <CardContent>
          {versions && versions.length > 0 ? (
            <div className="space-y-2">
              {versions.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between text-sm p-2 bg-slate-900 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">v{v.version}</span>
                    {v.isActive && <Badge className="bg-green-500/20 text-green-400 text-xs">Active</Badge>}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {new Date(v.createdAt).toLocaleDateString()} | {v.createdBy}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No version history available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
