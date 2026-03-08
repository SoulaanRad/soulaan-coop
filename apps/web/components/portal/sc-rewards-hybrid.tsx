"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Coins,
  TrendingUp,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Info,
} from "lucide-react";

export default function SCRewardsHybrid() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'COMPLETED' | 'PENDING' | 'FAILED'>('all');

  // Fetch SC mint stats
  const statsQuery = api.scMintEvents.getStats.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // Fetch mint events
  const eventsQuery = api.scMintEvents.getMintEvents.useQuery({
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 50,
  });

  const formatSC = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isLoading = statsQuery.isLoading || eventsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SC Rewards</h1>
          <p className="text-muted-foreground mt-1">
            On-chain governance token rewards from commerce activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={statusFilter} 
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              statsQuery.refetch();
              eventsQuery.refetch();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-blue-400">Hybrid Architecture Active</p>
              <p className="text-sm text-muted-foreground mt-1">
                SC rewards are now minted from Stripe commerce transactions. Each reward is tracked
                separately from the fiat payment, with clear eligibility and status visibility.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Minted</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatSC(statsQuery.data?.totalMintedDB || 0)} SC
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All-time total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatSC(statsQuery.data?.weekMinted || 0)} SC
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 7 days
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {statsQuery.data?.successRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {statsQuery.data?.completed || 0} / {statsQuery.data?.total || 0}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {(statsQuery.data?.failed || 0) + (statsQuery.data?.pending || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {statsQuery.data?.failed || 0} failed, {statsQuery.data?.pending || 0} pending
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mismatch Alerts */}
      {statsQuery.data && (statsQuery.data.failed > 0 || statsQuery.data.pending > 5) && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Mismatch Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {statsQuery.data.failed > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div>
                  <p className="font-medium text-red-400">Failed Mints</p>
                  <p className="text-sm text-muted-foreground">
                    {statsQuery.data.failed} rewards failed - payments completed but SC minting failed
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Retry Failed
                </Button>
              </div>
            )}
            {statsQuery.data.pending > 5 && (
              <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div>
                  <p className="font-medium text-amber-400">Delayed Mints</p>
                  <p className="text-sm text-muted-foreground">
                    {statsQuery.data.pending} rewards still processing - may indicate blockchain congestion
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mint Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Mint History</CardTitle>
          <CardDescription>
            Detailed SC reward minting events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventsQuery.isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : eventsQuery.data?.events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No mint events matching filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventsQuery.data?.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      event.status === 'COMPLETED' 
                        ? 'bg-green-500/10' 
                        : event.status === 'PENDING'
                        ? 'bg-amber-500/10'
                        : 'bg-red-500/10'
                    }`}>
                      {event.status === 'COMPLETED' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : event.status === 'PENDING' ? (
                        <Clock className="h-4 w-4 text-amber-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {event.user.name || event.user.email}
                        </p>
                        <Badge variant={
                          event.status === 'COMPLETED' ? 'default' :
                          event.status === 'PENDING' ? 'secondary' :
                          'destructive'
                        } className="text-xs">
                          {event.status}
                        </Badge>
                        {event.sourceType && (
                          <Badge variant="outline" className="text-xs">
                            {event.sourceType}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>ID: {event.id.slice(0, 12)}...</span>
                        <span>Wallet: {event.walletAddress.slice(0, 6)}...{event.walletAddress.slice(-4)}</span>
                        {event.contractTxHash && (
                          <a
                            href={`https://sepolia.basescan.org/tx/${event.contractTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on chain
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold">
                      {formatSC(event.actualAmount || event.requestedAmount)} SC
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
