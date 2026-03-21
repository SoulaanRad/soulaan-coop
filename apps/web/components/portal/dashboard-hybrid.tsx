"use client";

import { api } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, DollarSign, Coins, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardHybrid() {
  // Fetch payment stats
  const paymentStatsQuery = api.commerce.getPaymentStats.useQuery({});

  // Fetch SC mint stats
  const scStatsQuery = api.scMintEvents.getStats.useQuery();

  // Fetch treasury summary
  const treasurySummaryQuery = api.treasuryLedger.getSummary.useQuery({
    currency: 'USD',
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

  const isLoading = paymentStatsQuery.isLoading || scStatsQuery.isLoading || treasurySummaryQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasIssues = (scStatsQuery.data?.failed || 0) > 0 || (scStatsQuery.data?.pending || 0) > 5;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of cooperative operations
        </p>
      </div>

      {/* Alert for mismatches */}
      {hasIssues && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-400">System Issues Detected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {scStatsQuery.data?.failed || 0} failed SC mints and {scStatsQuery.data?.pending || 0} pending.
                  Review the SC Rewards page for details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Payment Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {formatAmount((paymentStatsQuery.data?.totalVolumeCents || 0) / 100)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentStatsQuery.data?.totalPayments || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Wealth Fund</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {formatAmount((treasurySummaryQuery.data?.totalBalance || 0) / 100)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Treasury fees collected
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">SC Rewards</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {formatSC(scStatsQuery.data?.totalMintedDB || 0)} SC
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {scStatsQuery.data?.completed || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {scStatsQuery.data?.successRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {scStatsQuery.data?.failed || 0} failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200">Recent Payments</CardTitle>
            <CardDescription>Latest commerce transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentStatsQuery.data?.recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payments yet
              </div>
            ) : (
              <div className="space-y-3">
                {paymentStatsQuery.data?.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-200">{tx.business.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tx.customer.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-100">
                        {formatAmount(tx.chargedAmount)}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200">System Health</CardTitle>
            <CardDescription>Current operational status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    (scStatsQuery.data?.failed || 0) === 0 ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm text-slate-300">SC Minting</span>
                </div>
                <Badge variant={
                  (scStatsQuery.data?.failed || 0) === 0 ? 'default' : 'destructive'
                }>
                  {(scStatsQuery.data?.failed || 0) === 0 ? 'Healthy' : `${scStatsQuery.data?.failed} Failed`}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    (scStatsQuery.data?.pending || 0) < 5 ? 'bg-green-500' : 'bg-amber-500'
                  }`} />
                  <span className="text-sm text-slate-300">Processing Queue</span>
                </div>
                <Badge variant={
                  (scStatsQuery.data?.pending || 0) < 5 ? 'default' : 'secondary'
                }>
                  {scStatsQuery.data?.pending || 0} Pending
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-300">Payment Processing</span>
                </div>
                <Badge variant="default">
                  Operational
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
