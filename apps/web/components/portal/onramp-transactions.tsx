"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, ExternalLink, CreditCard } from "lucide-react";

interface OnrampTransaction {
  id: string;
  userId: string;
  user: {
    email: string;
    name: string | null;
  };
  amountUSD: number;
  amountUC: number;
  paymentIntentId: string;
  processor: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  mintTxHash: string | null;
  processorChargeId: string | null;
  createdAt: string;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
}

interface ProcessorStats {
  processor: string;
  count: number;
  totalUSD: number;
  totalUC: number;
  successRate: number;
}

export default function OnrampTransactions() {
  const [transactions, setTransactions] = useState<OnrampTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processorFilter, setProcessorFilter] = useState<string>("all");

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/trpc/ucAdmin.getAllOnrampTransactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: { limit: 100, offset: 0 }
        })
      });

      const result = await response.json();
      if (result.result?.data?.json) {
        setTransactions(result.result.data.json.transactions || []);
      }
    } catch (err) {
      console.error("Error loading onramp transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTransactions();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      void loadTransactions();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredTransactions = transactions.filter((tx) => {
    if (statusFilter !== "all" && tx.status !== statusFilter) return false;
    if (processorFilter !== "all" && tx.processor !== processorFilter) return false;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default";
      case "PENDING":
        return "secondary";
      case "FAILED":
        return "destructive";
      case "REFUNDED":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getProcessorLinkColor = (processor: string) => {
    switch (processor) {
      case "stripe":
        return "text-purple-400 hover:text-purple-300";
      case "paypal":
        return "text-blue-400 hover:text-blue-300";
      case "square":
        return "text-green-400 hover:text-green-300";
      default:
        return "text-blue-400 hover:text-blue-300";
    }
  };

  const getProcessorLink = (tx: OnrampTransaction) => {
    if (tx.processor === "stripe" && tx.paymentIntentId) {
      return `https://dashboard.stripe.com/test/payments/${tx.paymentIntentId}`;
    }
    return null;
  };

  // Calculate processor stats
  const processorStats: ProcessorStats[] = Object.values(
    transactions.reduce((acc, tx) => {
      if (!acc[tx.processor]) {
        acc[tx.processor] = {
          processor: tx.processor,
          count: 0,
          totalUSD: 0,
          totalUC: 0,
          successRate: 0,
        };
      }
      acc[tx.processor].count++;
      acc[tx.processor].totalUSD += tx.amountUSD;
      acc[tx.processor].totalUC += tx.amountUC;
      return acc;
    }, {} as Record<string, ProcessorStats>)
  ).map((stat) => {
    const completed = transactions.filter(
      (tx) => tx.processor === stat.processor && tx.status === "COMPLETED"
    ).length;
    stat.successRate = stat.count > 0 ? (completed / stat.count) * 100 : 0;
    return stat;
  });

  const totalStats = {
    total: transactions.length,
    completed: transactions.filter((tx) => tx.status === "COMPLETED").length,
    pending: transactions.filter((tx) => tx.status === "PENDING").length,
    failed: transactions.filter((tx) => tx.status === "FAILED").length,
    totalUSD: transactions.reduce((sum, tx) => sum + tx.amountUSD, 0),
    totalUC: transactions.reduce((sum, tx) => sum + tx.amountUC, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Onramps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalStats.total}</div>
            <p className="text-xs text-slate-400 mt-1">
              {totalStats.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total USD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${totalStats.totalUSD.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total UC Minted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {totalStats.totalUC.toFixed(2)} UC
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {totalStats.total > 0
                ? ((totalStats.completed / totalStats.total) * 100).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {totalStats.failed} failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Processor Stats */}
      {processorStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {processorStats.map((stat) => (
            <Card key={stat.processor} className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 capitalize flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  {stat.processor}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Transactions:</span>
                    <span className="text-white font-medium">{stat.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total:</span>
                    <span className="text-white font-medium">
                      ${stat.totalUSD.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Success Rate:</span>
                    <span className="text-green-400 font-medium">
                      {stat.successRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <select
            value={processorFilter}
            onChange={(e) => setProcessorFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm"
          >
            <option value="all">All Processors</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
            <option value="square">Square</option>
          </select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTransactions}
          disabled={loading}
          className="border-slate-700"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border border-slate-700 bg-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Processor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Links</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm">
                    {formatDate(tx.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium text-white">
                        {tx.user.name || "No name"}
                      </div>
                      <div className="text-xs text-slate-400">{tx.user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium text-white">
                        ${tx.amountUSD.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {tx.amountUC.toFixed(2)} UC
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize border-slate-600">
                      {tx.processor}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(tx.status)}>
                      {tx.status}
                    </Badge>
                    {tx.status === "FAILED" && tx.failureReason && (
                      <div className="text-xs text-red-400 mt-1">
                        {tx.failureReason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(() => {
                        const link = getProcessorLink(tx);
                        return link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center text-xs ${getProcessorLinkColor(
                              tx.processor
                            )}`}
                          >
                            Payment
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        ) : null;
                      })()}
                      {tx.mintTxHash && (
                        <a
                          href={`https://sepolia.basescan.org/tx/${tx.mintTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-green-400 hover:text-green-300"
                        >
                          Mint Tx
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Info */}
      {filteredTransactions.length > 0 && (
        <div className="text-sm text-slate-400 text-center">
          Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
          {(statusFilter !== "all" || processorFilter !== "all") && ` (filtered)`}
        </div>
      )}
    </div>
  );
}
