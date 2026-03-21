"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";
import { useCoin } from "@/hooks/use-platform-config";
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
  DollarSign,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";

type ChartPeriod = '7d' | '30d' | '90d';

export default function TreasuryDashboardHybrid() {
  const coin = useCoin();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('30d');

  // Fetch treasury summary (Wealth Fund)
  const treasurySummaryQuery = api.treasuryLedger.getSummary.useQuery({
    currency: 'USD',
  }, {
    refetchInterval: 60000,
  });

  // Fetch payment stats
  const paymentStatsQuery = api.commerce.getPaymentStats.useQuery({
    startDate: getStartDateForPeriod(chartPeriod),
  }, {
    refetchInterval: 60000,
  });

  // Fetch SC mint stats
  const scStatsQuery = api.scMintEvents.getStats.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // Fetch recent ledger entries
  const ledgerEntriesQuery = api.treasuryLedger.getLedgerEntries.useQuery({
    limit: 10,
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatSC = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isLoading = treasurySummaryQuery.isLoading || paymentStatsQuery.isLoading || scStatsQuery.isLoading;
  const hasError = treasurySummaryQuery.error || paymentStatsQuery.error || scStatsQuery.error;

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold">Failed to load treasury data</p>
          <p className="text-sm text-muted-foreground mt-2">
            {treasurySummaryQuery.error?.message || paymentStatsQuery.error?.message || scStatsQuery.error?.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Treasury Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor Wealth Fund, payments, and {coin.symbol} rewards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={chartPeriod} onValueChange={(v) => setChartPeriod(v as ChartPeriod)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              treasurySummaryQuery.refetch();
              paymentStatsQuery.refetch();
              scStatsQuery.refetch();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Wealth Fund Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Wealth Fund Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-100">
                  {formatAmount((treasurySummaryQuery.data?.totalBalance || 0) / 100)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From {treasurySummaryQuery.data?.totalEntries || 0} transactions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Payment Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-100">
                  {formatAmount((paymentStatsQuery.data?.totalVolumeCents || 0) / 100)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {paymentStatsQuery.data?.totalPayments || 0} payments
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">SC Rewards Issued</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-100">
                  {formatSC(scStatsQuery.data?.totalMintedDB || 0)} SC
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {scStatsQuery.data?.completed || 0} completed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Success Rate</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-100">
                  {scStatsQuery.data?.successRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {scStatsQuery.data?.failed || 0} failed mints
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mismatch Alerts */}
      {scStatsQuery.data && (scStatsQuery.data.failed > 0 || scStatsQuery.data.pending > 5) && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">System Mismatches Detected</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {scStatsQuery.data.failed > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div>
                  <p className="font-medium text-red-400">Failed SC Mints</p>
                  <p className="text-sm text-muted-foreground">
                    {scStatsQuery.data.failed} rewards failed to mint
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
            )}
            {scStatsQuery.data.pending > 5 && (
              <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div>
                  <p className="font-medium text-amber-400">Pending SC Mints</p>
                  <p className="text-sm text-muted-foreground">
                    {scStatsQuery.data.pending} rewards still processing
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

      {/* Wealth Fund Breakdown */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200">Wealth Fund Breakdown</CardTitle>
          <CardDescription>
            Fiat treasury fees collected from platform operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <ArrowDownLeft className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">Treasury Fees</p>
                      <p className="text-xs text-muted-foreground">Collected from sales</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-100">
                    {formatAmount((treasurySummaryQuery.data?.accountBalances.TREASURY_FEES || 0) / 100)}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">Platform Fees</p>
                      <p className="text-xs text-muted-foreground">Operations revenue</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-100">
                    {formatAmount((treasurySummaryQuery.data?.accountBalances.PLATFORM_FEES || 0) / 100)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Ledger Activity */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-200">Recent Wealth Fund Activity</CardTitle>
              <CardDescription>
                Latest treasury ledger entries
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-slate-300 hover:text-slate-200">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {ledgerEntriesQuery.isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : ledgerEntriesQuery.data?.entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No ledger entries yet
            </div>
          ) : (
            <div className="space-y-3">
              {ledgerEntriesQuery.data?.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      entry.direction === 'CREDIT' 
                        ? 'bg-green-500/10' 
                        : 'bg-red-500/10'
                    }`}>
                      {entry.direction === 'CREDIT' ? (
                        <ArrowDownLeft className={`h-4 w-4 ${
                          entry.direction === 'CREDIT' ? 'text-green-500' : 'text-red-500'
                        }`} />
                      ) : (
                        <ArrowUpRight className={`h-4 w-4 ${
                          entry.direction === 'CREDIT' ? 'text-green-500' : 'text-red-500'
                        }`} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">
                        {entry.entryType.replace(/_/g, ' ')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {entry.accountType.replace(/_/g, ' ')}
                        </Badge>
                        {entry.linkedPayment && (
                          <Badge variant="secondary" className="text-xs">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Linked to payment
                          </Badge>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {entry.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      entry.direction === 'CREDIT' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {entry.direction === 'CREDIT' ? '+' : '-'}
                      {formatAmount(entry.amount / 100)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.occurredAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Stats */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200">Payment Activity ({chartPeriod})</CardTitle>
          <CardDescription>
            Commerce transaction breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentStatsQuery.isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                  <p className="text-2xl font-bold mt-1 text-slate-100">
                    {formatAmount((paymentStatsQuery.data?.totalVolumeCents || 0) / 100)}
                  </p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg Transaction</p>
                  <p className="text-2xl font-bold mt-1 text-slate-100">
                    {formatAmount((paymentStatsQuery.data?.averageTransactionCents || 0) / 100)}
                  </p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Payments</p>
                  <p className="text-2xl font-bold mt-1 text-slate-100">
                    {paymentStatsQuery.data?.totalPayments || 0}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                  <p className="text-sm text-muted-foreground">Merchant Settlements</p>
                  <p className="text-xl font-bold mt-1 text-green-400">
                    {formatAmount((paymentStatsQuery.data?.totalMerchantSettlementCents || 0) / 100)}
                  </p>
                </div>
                <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <p className="text-sm text-muted-foreground">Platform Fees</p>
                  <p className="text-xl font-bold mt-1 text-blue-400">
                    {formatAmount((paymentStatsQuery.data?.totalPlatformFeesCents || 0) / 100)}
                  </p>
                </div>
                <div className="p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
                  <p className="text-sm text-muted-foreground">Treasury Fees</p>
                  <p className="text-xl font-bold mt-1 text-purple-400">
                    {formatAmount((paymentStatsQuery.data?.totalTreasuryFeesCents || 0) / 100)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SC Rewards Health */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200">SC Rewards Health</CardTitle>
          <CardDescription>
            On-chain reward minting status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scStatsQuery.isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Minted</p>
                  <p className="text-xl font-bold mt-1 text-slate-200">
                    {formatSC(scStatsQuery.data?.totalMintedDB || 0)} SC
                  </p>
                </div>
                <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold mt-1 text-green-400">
                    {scStatsQuery.data?.completed || 0}
                  </p>
                </div>
                <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold mt-1 text-amber-400">
                    {scStatsQuery.data?.pending || 0}
                  </p>
                </div>
                <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-xl font-bold mt-1 text-red-400">
                    {scStatsQuery.data?.failed || 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getStartDateForPeriod(period: ChartPeriod): Date {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}
