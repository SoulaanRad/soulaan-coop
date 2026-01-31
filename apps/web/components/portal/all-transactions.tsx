"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, ArrowRight, ExternalLink, Download, DollarSign, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";

type P2PStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type OnrampStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export default function AllTransactions() {
  const [p2pStatusFilter, setP2pStatusFilter] = useState<P2PStatus | 'ALL'>('ALL');
  const [onrampStatusFilter, setOnrampStatusFilter] = useState<OnrampStatus | 'ALL'>('ALL');
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<WithdrawalStatus | 'ALL'>('ALL');

  // Fetch stats
  const statsQuery = api.admin.getTransactionStats.useQuery();

  // Fetch P2P transfers
  const p2pQuery = api.admin.getAllP2PTransfers.useQuery({
    limit: 50,
    offset: 0,
    status: p2pStatusFilter === 'ALL' ? undefined : p2pStatusFilter,
  });

  // Fetch onramp transactions
  const onrampQuery = api.admin.getAllOnrampTransactions.useQuery({
    limit: 50,
    offset: 0,
    status: onrampStatusFilter === 'ALL' ? undefined : onrampStatusFilter,
  });

  // Fetch withdrawals
  const withdrawalQuery = api.admin.getAllWithdrawals.useQuery({
    limit: 50,
    offset: 0,
    status: withdrawalStatusFilter === 'ALL' ? undefined : withdrawalStatusFilter,
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'PROCESSING':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'FAILED':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'REFUNDED':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const truncateAddress = (address: string | null) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const refetchAll = () => {
    statsQuery.refetch();
    p2pQuery.refetch();
    onrampQuery.refetch();
    withdrawalQuery.refetch();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {statsQuery.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                P2P Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatAmount(statsQuery.data.p2p.volumeUSD)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {statsQuery.data.p2p.completed} completed / {statsQuery.data.p2p.total} total
                {statsQuery.data.p2p.pending > 0 && (
                  <span className="text-yellow-400"> ({statsQuery.data.p2p.pending} pending)</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-green-400" />
                Deposits (Onramp)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {formatAmount(statsQuery.data.onramp.volumeUSD)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {statsQuery.data.onramp.completed} completed / {statsQuery.data.onramp.total} total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-orange-400" />
                Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">
                {formatAmount(statsQuery.data.withdrawal.volumeUSD)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {statsQuery.data.withdrawal.completed} completed / {statsQuery.data.withdrawal.total} total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={refetchAll}
          disabled={p2pQuery.isFetching || onrampQuery.isFetching || withdrawalQuery.isFetching}
          className="border-slate-700 text-gray-300"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${(p2pQuery.isFetching || onrampQuery.isFetching) ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Transactions Tabs */}
      <Tabs defaultValue="p2p" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800">
          <TabsTrigger value="p2p">P2P Transfers</TabsTrigger>
          <TabsTrigger value="onramp">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        {/* P2P Transfers Tab */}
        <TabsContent value="p2p" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={p2pStatusFilter} onValueChange={(v) => setP2pStatusFilter(v as P2PStatus | 'ALL')}>
              <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="ALL" className="text-white">All Status</SelectItem>
                <SelectItem value="PENDING" className="text-white">Pending</SelectItem>
                <SelectItem value="PROCESSING" className="text-white">Processing</SelectItem>
                <SelectItem value="COMPLETED" className="text-white">Completed</SelectItem>
                <SelectItem value="FAILED" className="text-white">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead></TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p2pQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : p2pQuery.data?.transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                      No P2P transfers found
                    </TableCell>
                  </TableRow>
                ) : (
                  p2pQuery.data?.transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="text-sm text-slate-300">
                        {formatDate(transfer.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{transfer.sender.name}</p>
                          <p className="text-xs text-slate-400">{transfer.sender.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-slate-500" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{transfer.recipient.name}</p>
                          <p className="text-xs text-slate-400">{transfer.recipient.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-400">
                          {formatAmount(transfer.amountUSD)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {transfer.fundingSource}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(transfer.status)}>
                          {transfer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-400 max-w-[150px] truncate">
                        {transfer.note || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {p2pQuery.data && (
            <p className="text-sm text-slate-400 text-center">
              Showing {p2pQuery.data.transfers.length} of {p2pQuery.data.total} transfers
            </p>
          )}
        </TabsContent>

        {/* Onramp/Deposits Tab */}
        <TabsContent value="onramp" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={onrampStatusFilter} onValueChange={(v) => setOnrampStatusFilter(v as OnrampStatus | 'ALL')}>
              <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="ALL" className="text-white">All Status</SelectItem>
                <SelectItem value="PENDING" className="text-white">Pending</SelectItem>
                <SelectItem value="COMPLETED" className="text-white">Completed</SelectItem>
                <SelectItem value="FAILED" className="text-white">Failed</SelectItem>
                <SelectItem value="REFUNDED" className="text-white">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount USD</TableHead>
                  <TableHead>UC Minted</TableHead>
                  <TableHead>Processor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tx Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onrampQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : onrampQuery.data?.transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      No deposit transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  onrampQuery.data?.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-slate-300">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{tx.user.name}</p>
                          <p className="text-xs text-slate-400">{tx.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-white">
                        {formatAmount(tx.amountUSD)}
                      </TableCell>
                      <TableCell className="font-semibold text-green-400">
                        {tx.amountUC.toFixed(2)} UC
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {tx.processor}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(tx.status)}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tx.mintTxHash ? (
                          <a
                            href={`https://sepolia.basescan.org/tx/${tx.mintTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-400 hover:text-blue-300 text-xs font-mono"
                          >
                            {truncateAddress(tx.mintTxHash)}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {onrampQuery.data && (
            <p className="text-sm text-slate-400 text-center">
              Showing {onrampQuery.data.transactions.length} of {onrampQuery.data.total} transactions
            </p>
          )}
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={withdrawalStatusFilter} onValueChange={(v) => setWithdrawalStatusFilter(v as WithdrawalStatus | 'ALL')}>
              <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="ALL" className="text-white">All Status</SelectItem>
                <SelectItem value="PENDING" className="text-white">Pending</SelectItem>
                <SelectItem value="PROCESSING" className="text-white">Processing</SelectItem>
                <SelectItem value="COMPLETED" className="text-white">Completed</SelectItem>
                <SelectItem value="FAILED" className="text-white">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawalQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : withdrawalQuery.data?.withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                      No withdrawals found
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawalQuery.data?.withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-sm text-slate-300">
                        {formatDate(w.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{w.user.name}</p>
                          <p className="text-xs text-slate-400">{w.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-orange-400">
                        {formatAmount(w.amountUSD)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(w.status)}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">
                        {w.completedAt ? formatDate(w.completedAt) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {withdrawalQuery.data && (
            <p className="text-sm text-slate-400 text-center">
              Showing {withdrawalQuery.data.withdrawals.length} of {withdrawalQuery.data.total} withdrawals
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
