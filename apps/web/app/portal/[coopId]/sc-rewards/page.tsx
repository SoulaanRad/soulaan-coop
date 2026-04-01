"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/client";
import { useCoin } from "@/hooks/use-platform-config";
import { Loader2 } from "lucide-react";
import dynamic from 'next/dynamic';

const SCRewardsHybrid = dynamic(() => import('@/components/portal/sc-rewards-hybrid'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Coins,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Search,
} from "lucide-react";
import { SCRewardsTable } from "@/components/portal/sc-rewards-table";

type StatusFilter = 'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED';
type ReasonFilter = 'ALL' | 'STORE_PURCHASE_REWARD' | 'STORE_SALE_REWARD' | 'MANUAL_ADJUSTMENT';

export default function SCRewardsPage() {
  const coin = useCoin();
  const [useHybrid, setUseHybrid] = useState<boolean | null>(null);

  // Check if hybrid architecture is enabled
  useEffect(() => {
    async function checkFeatureFlag() {
      try {
        const response = await fetch('/api/feature-flags/hybrid-architecture');
        const data = await response.json();
        setUseHybrid(data.enabled);
      } catch (error) {
        console.error('Failed to check feature flag:', error);
        setUseHybrid(false);
      }
    }
    checkFeatureFlag();
  }, []);

  if (useHybrid === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (useHybrid) {
    return <SCRewardsHybrid />;
  }

  return <SCRewardsLegacyPage coin={coin} />;
}

function SCRewardsLegacyPage({ coin }: { coin: { symbol: string; name: string; description: string } }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReconcileDialog, setShowReconcileDialog] = useState(false);

  // Fetch stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = api.scRewards.getSCRewardStats.useQuery();

  // Fetch rewards
  const { data: rewardsData, isLoading: rewardsLoading, refetch: refetchRewards } = api.scRewards.getSCRewards.useQuery({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    reason: reasonFilter === 'ALL' ? undefined : reasonFilter,
    limit: 50,
    offset: 0,
  });

  // Retry all failed mutation
  const retryAll = api.scRewards.retryAllFailed.useMutation({
    onSuccess: () => {
      toast.success('Retry cycle complete', {
        description: 'All failed and stuck transactions have been retried.',
      });
      refetchRewards();
      refetchStats();
    },
    onError: (error) => {
      toast.error('Retry failed', { description: error.message });
    },
  });

  // Reconcile mutation
  const reconcile = api.scRewards.reconcileSCRewards.useMutation({
    onSuccess: (data) => {
      toast.success('Reconciliation Complete', {
        description: `Fixed ${data.fixedCount} record${data.fixedCount !== 1 ? 's' : ''}`,
      });
      setShowReconcileDialog(false);
      refetchRewards();
      refetchStats();
    },
    onError: (error) => {
      toast.error('Reconciliation Failed', {
        description: error.message,
      });
    },
  });

  const handleRefresh = () => {
    refetchStats();
    refetchRewards();
  };

  const handleReconcile = () => {
    reconcile.mutate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'FAILED':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'STORE_PURCHASE_REWARD':
        return 'Purchase Reward';
      case 'STORE_SALE_REWARD':
        return 'Sale Reward';
      case 'MANUAL_ADJUSTMENT':
        return 'Manual';
      default:
        return reason;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Coins className="h-8 w-8 text-amber-500" />
            SC Rewards
          </h1>
          <p className="text-gray-400 mt-1">Track and manage Soulaani Coin reward distributions</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="ghost"
            disabled={statsLoading || rewardsLoading}
            className="border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading || rewardsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => retryAll.mutate()}
            variant="outline"
            disabled={retryAll.isPending}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            {retryAll.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Retry All Failed
          </Button>
          <Button
            onClick={() => setShowReconcileDialog(true)}
            variant="outline"
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Reconcile All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-slate-700 rounded w-32"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Minted */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total SC Minted</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {Math.floor(stats.totalMintedDB).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    On-chain: {Math.floor(stats.totalOnChain).toLocaleString()}
                  </p>
                </div>
                <Coins className="h-10 w-10 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Success Rate</p>
                  <p className="text-2xl font-bold text-green-500 mt-1">
                    {stats.successRate}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.completed} / {stats.total} completed
                  </p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* Failed */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Failed Mints</p>
                  <p className="text-2xl font-bold text-red-500 mt-1">
                    {stats.failed}
                  </p>
                  {stats.failed > 0 && (
                    <Badge variant="outline" className="mt-1 text-red-400 border-red-400/30 text-xs">
                      Needs Attention
                    </Badge>
                  )}
                </div>
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          {/* This Week */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">This Week</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {Math.floor(stats.weekMinted).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Today: {Math.floor(stats.todayMinted).toLocaleString()}
                  </p>
                </div>
                <Clock className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <Label className="text-sm text-gray-400">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="ALL" className="text-gray-300 hover:text-white hover:bg-slate-800 focus:bg-slate-800 focus:text-white">All Statuses</SelectItem>
                  <SelectItem value="COMPLETED" className="text-gray-300 hover:text-white hover:bg-slate-800 focus:bg-slate-800 focus:text-white">Completed</SelectItem>
                  <SelectItem value="PENDING" className="text-gray-300 hover:text-white hover:bg-slate-800 focus:bg-slate-800 focus:text-white">Pending</SelectItem>
                  <SelectItem value="FAILED" className="text-gray-300 hover:text-white hover:bg-slate-800 focus:bg-slate-800 focus:text-white">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason Filter */}
            <div>
              <Label className="text-sm text-gray-400">Reason</Label>
              <Select value={reasonFilter} onValueChange={(v) => setReasonFilter(v as ReasonFilter)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="ALL" className="text-gray-300 hover:text-white hover:bg-slate-800 focus:bg-slate-800 focus:text-white">All Reasons</SelectItem>
                  <SelectItem value="STORE_PURCHASE_REWARD" className="text-gray-300 hover:text-white hover:bg-slate-800 focus:bg-slate-800 focus:text-white">Purchase Reward</SelectItem>
                  <SelectItem value="STORE_SALE_REWARD" className="text-gray-300 hover:text-white hover:bg-slate-800 focus:bg-slate-800 focus:text-white">Sale Reward</SelectItem>
                  <SelectItem value="MANUAL_ADJUSTMENT" className="text-gray-300 hover:text-white hover:bg-slate-800 focus:bg-slate-800 focus:text-white">Manual Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <Label className="text-sm text-gray-400">Search User</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">SC Reward Transactions</CardTitle>
          <CardDescription className="text-gray-400">
            {rewardsData ? `${rewardsData.total} total rewards` : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rewardsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : rewardsData && rewardsData.rewards.length > 0 ? (
            <SCRewardsTable 
              rewards={rewardsData.rewards} 
              onRefresh={refetchRewards}
            />
          ) : (
            <div className="text-center py-12">
              <Coins className="h-12 w-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No {coin.symbol} rewards found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconcile Dialog */}
      <Dialog open={showReconcileDialog} onOpenChange={setShowReconcileDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Reconcile SC Rewards
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              This will compare all database records with blockchain state and automatically fix discrepancies.
              Records that succeeded on-chain but are marked as PENDING or FAILED will be updated to COMPLETED.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReconcileDialog(false)}
              disabled={reconcile.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReconcile}
              disabled={reconcile.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {reconcile.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reconciling...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Start Reconciliation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
