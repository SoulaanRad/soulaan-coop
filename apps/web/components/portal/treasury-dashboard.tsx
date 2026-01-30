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
  DollarSign,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Wallet,
  Clock,
  TrendingUp,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";

type ChartPeriod = '7d' | '30d' | '90d';

export default function TreasuryDashboard() {
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('30d');

  // Fetch treasury overview
  const treasuryQuery = api.admin.getTreasuryOverview.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch chart data
  const chartQuery = api.admin.getTransactionVolumeChart.useQuery({
    period: chartPeriod,
    type: 'all',
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatUC = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const refetchAll = () => {
    treasuryQuery.refetch();
    chartQuery.refetch();
  };

  if (treasuryQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (treasuryQuery.error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 mr-2" />
          Failed to load treasury data
        </div>
        <p className="text-sm text-slate-400 max-w-md text-center">
          {treasuryQuery.error.message}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => treasuryQuery.refetch()}
          className="mt-4 bg-slate-800 border-slate-600 text-gray-200 hover:bg-slate-700 hover:text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const data = treasuryQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Treasury Overview</h2>
          <p className="text-sm text-slate-400">
            Last updated: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : 'N/A'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refetchAll}
          disabled={treasuryQuery.isFetching}
          className="bg-slate-800 border-slate-600 text-gray-200 hover:bg-slate-700 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${treasuryQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* UC in Circulation */}
        <Card className="bg-gradient-to-br from-purple-900/50 to-slate-800 border-purple-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-300 flex items-center gap-2">
              <Coins className="h-4 w-4" />
              UC in Circulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {formatUC(data?.ucCirculation.totalSupply || '0')} UC
            </div>
            <p className="text-xs text-purple-300 mt-1">
              = {formatAmount(parseFloat(data?.ucCirculation.totalSupply || '0'))} USD value
            </p>
          </CardContent>
        </Card>

        {/* Net Flow */}
        <Card className="bg-gradient-to-br from-emerald-900/50 to-slate-800 border-emerald-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-300 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Net Flow (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(data?.allTime.netFlow || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatAmount(data?.allTime.netFlow || 0)}
            </div>
            <p className="text-xs text-emerald-300 mt-1">
              Deposits - Withdrawals
            </p>
          </CardContent>
        </Card>

        {/* Stripe Balance */}
        <Card className="bg-gradient-to-br from-blue-900/50 to-slate-800 border-blue-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-300 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Stripe Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.stripeBalance ? (
              <>
                <div className="text-3xl font-bold text-white">
                  {formatAmount(data.stripeBalance.available.reduce((sum, b) => sum + b.amount, 0))}
                </div>
                <p className="text-xs text-blue-300 mt-1">
                  Available ({data.stripeBalance.pending.length > 0 &&
                    `+${formatAmount(data.stripeBalance.pending.reduce((sum, b) => sum + b.amount, 0))} pending`})
                </p>
              </>
            ) : (
              <>
                <div className="text-xl font-semibold text-slate-400">
                  Not Configured
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Set STRIPE_SECRET_KEY
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending Escrow */}
        <Card className="bg-gradient-to-br from-amber-900/50 to-slate-800 border-amber-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-300 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              In Escrow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">
              {formatAmount(data?.escrow.amountUSD || 0)}
            </div>
            <p className="text-xs text-amber-300 mt-1">
              {data?.escrow.count || 0} pending claims
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Stats by Time Period */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 24h Volume */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center justify-between">
              <span>Last 24 Hours</span>
              <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">24h</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-green-400" />
                Deposits
              </span>
              <span className="font-semibold text-green-400">
                {formatAmount(data?.last24h.onramp.volumeUSD || 0)}
                <span className="text-xs text-slate-400 ml-1">
                  ({data?.last24h.onramp.count || 0})
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Coins className="h-4 w-4 text-purple-400" />
                P2P
              </span>
              <span className="font-semibold text-purple-400">
                {formatAmount(data?.last24h.p2p.volumeUSD || 0)}
                <span className="text-xs text-slate-400 ml-1">
                  ({data?.last24h.p2p.count || 0})
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-orange-400" />
                Withdrawals
              </span>
              <span className="font-semibold text-orange-400">
                {formatAmount(data?.last24h.withdrawal.volumeUSD || 0)}
                <span className="text-xs text-slate-400 ml-1">
                  ({data?.last24h.withdrawal.count || 0})
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 7d Volume */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center justify-between">
              <span>Last 7 Days</span>
              <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">7d</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-green-400" />
                Deposits
              </span>
              <span className="font-semibold text-green-400">
                {formatAmount(data?.last7d.onramp.volumeUSD || 0)}
                <span className="text-xs text-slate-400 ml-1">
                  ({data?.last7d.onramp.count || 0})
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Coins className="h-4 w-4 text-purple-400" />
                P2P
              </span>
              <span className="font-semibold text-purple-400">
                {formatAmount(data?.last7d.p2p.volumeUSD || 0)}
                <span className="text-xs text-slate-400 ml-1">
                  ({data?.last7d.p2p.count || 0})
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-orange-400" />
                Withdrawals
              </span>
              <span className="font-semibold text-orange-400">
                {formatAmount(data?.last7d.withdrawal.volumeUSD || 0)}
                <span className="text-xs text-slate-400 ml-1">
                  ({data?.last7d.withdrawal.count || 0})
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 30d Volume */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center justify-between">
              <span>Last 30 Days</span>
              <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">30d</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-green-400" />
                Deposits
              </span>
              <span className="font-semibold text-green-400">
                {formatAmount(data?.last30d.onramp.volumeUSD || 0)}
                <span className="text-xs text-slate-400 ml-1">
                  ({data?.last30d.onramp.count || 0})
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Coins className="h-4 w-4 text-purple-400" />
                P2P
              </span>
              <span className="font-semibold text-purple-400">
                {formatAmount(data?.last30d.p2p.volumeUSD || 0)}
                <span className="text-xs text-slate-400 ml-1">
                  ({data?.last30d.p2p.count || 0})
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-orange-400" />
                Withdrawals
              </span>
              <span className="font-semibold text-orange-400">
                {formatAmount(data?.last30d.withdrawal.volumeUSD || 0)}
                <span className="text-xs text-slate-400 ml-1">
                  ({data?.last30d.withdrawal.count || 0})
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All-Time Totals */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">All-Time Totals</CardTitle>
          <CardDescription className="text-slate-400">
            Complete transaction history since launch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400 mb-1">Total Deposits</p>
              <p className="text-2xl font-bold text-green-400">
                {formatAmount(data?.allTime.onramp.volumeUSD || 0)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {data?.allTime.onramp.count || 0} transactions
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-sm text-purple-400 mb-1">Total P2P Volume</p>
              <p className="text-2xl font-bold text-purple-400">
                {formatAmount(data?.allTime.p2p.volumeUSD || 0)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {data?.allTime.p2p.count || 0} transfers
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-sm text-orange-400 mb-1">Total Withdrawals</p>
              <p className="text-2xl font-bold text-orange-400">
                {formatAmount(data?.allTime.withdrawal.volumeUSD || 0)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {data?.allTime.withdrawal.count || 0} withdrawals
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Stats */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data?.users.total || 0}</p>
                <p className="text-sm text-slate-400">Total Users</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{data?.users.active || 0}</p>
                <p className="text-sm text-slate-400">Active Members</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{data?.users.withWallets || 0}</p>
                <p className="text-sm text-slate-400">With Wallets</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volume Chart */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white">Transaction Volume Over Time</CardTitle>
            <Select value={chartPeriod} onValueChange={(v) => setChartPeriod(v as ChartPeriod)}>
              <SelectTrigger className="w-[120px] bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="7d" className="text-white">Last 7 days</SelectItem>
                <SelectItem value="30d" className="text-white">Last 30 days</SelectItem>
                <SelectItem value="90d" className="text-white">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {chartQuery.isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : chartQuery.data?.data && chartQuery.data.data.length > 0 ? (
            <div className="space-y-4">
              {/* Simple bar representation */}
              <div className="grid gap-1">
                {chartQuery.data.data.slice(-14).map((day, i) => {
                  const total = day.onramp + day.p2p + day.withdrawal;
                  const maxTotal = Math.max(...chartQuery.data.data.slice(-14).map(d => d.onramp + d.p2p + d.withdrawal));
                  const width = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

                  return (
                    <div key={day.date} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-20">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex-1 h-6 bg-slate-700/50 rounded overflow-hidden">
                        <div className="h-full flex">
                          {day.onramp > 0 && (
                            <div
                              className="bg-green-500/80 h-full"
                              style={{ width: `${maxTotal > 0 ? (day.onramp / maxTotal) * 100 : 0}%` }}
                              title={`Deposits: ${formatAmount(day.onramp)}`}
                            />
                          )}
                          {day.p2p > 0 && (
                            <div
                              className="bg-purple-500/80 h-full"
                              style={{ width: `${maxTotal > 0 ? (day.p2p / maxTotal) * 100 : 0}%` }}
                              title={`P2P: ${formatAmount(day.p2p)}`}
                            />
                          )}
                          {day.withdrawal > 0 && (
                            <div
                              className="bg-orange-500/80 h-full"
                              style={{ width: `${maxTotal > 0 ? (day.withdrawal / maxTotal) * 100 : 0}%` }}
                              title={`Withdrawals: ${formatAmount(day.withdrawal)}`}
                            />
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 w-20 text-right">
                        {total > 0 ? formatAmount(total) : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span className="text-xs text-slate-400">Deposits</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-purple-500" />
                  <span className="text-xs text-slate-400">P2P</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-500" />
                  <span className="text-xs text-slate-400">Withdrawals</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400">
              No transaction data for this period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
