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
import { Input } from "@/components/ui/input";
import { RefreshCw, Download, ExternalLink } from "lucide-react";

interface Transfer {
  from: string;
  to: string;
  value: string;
  valueFormatted: string;
  timestamp: number;
  transactionHash: string;
  blockNumber: number;
}

interface TransferStats {
  totalVolume: string;
  transferCount: number;
  uniqueSenders: number;
  uniqueReceivers: number;
  averageTransferSize: string;
}

export default function UCTransactions() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [stats, setStats] = useState<TransferStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchAddress, setSearchAddress] = useState("");
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      // Call tRPC endpoint for all transfers
      const response = await fetch("http://localhost:3001/trpc/ucAdmin.getAllTransfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: { limit: 100, offset: 0 }
        })
      });

      const result = await response.json();
      if (result.result?.data?.json) {
        setTransfers(result.result.data.json.transfers || []);
        setFilteredTransfers(result.result.data.json.transfers || []);
      }

      // Load stats
      const statsResponse = await fetch("http://localhost:3001/trpc/ucAdmin.getTransferStats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: {} })
      });

      const statsResult = await statsResponse.json();
      if (statsResult.result?.data?.json) {
        setStats(statsResult.result.data.json);
      }
    } catch (err) {
      console.error("Error loading transfers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTransfers();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      void loadTransfers();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Filter transfers by search address
    if (searchAddress.trim()) {
      const search = searchAddress.toLowerCase();
      const filtered = transfers.filter(
        (t) =>
          t.from.toLowerCase().includes(search) ||
          t.to.toLowerCase().includes(search)
      );
      setFilteredTransfers(filtered);
    } else {
      setFilteredTransfers(transfers);
    }
  }, [searchAddress, transfers]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Date", "From", "To", "Amount", "Tx Hash", "Block"].join(","),
      ...filteredTransfers.map((t) =>
        [
          formatDate(t.timestamp),
          t.from,
          t.to,
          t.valueFormatted,
          t.transactionHash,
          t.blockNumber,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uc-transactions-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Total Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.totalVolume} UC
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.transferCount}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Unique Senders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.uniqueSenders}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Unique Receivers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.uniqueReceivers}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Avg Transfer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.averageTransferSize} UC
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search by wallet address..."
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
          className="max-w-md bg-slate-800 border-slate-700 text-white"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTransfers}
            disabled={loading}
            className="border-slate-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="border-slate-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border border-slate-700 bg-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Block</TableHead>
              <TableHead className="text-right">Tx Hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : filteredTransfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              filteredTransfers.map((transfer, index) => (
                <TableRow key={`${transfer.transactionHash}-${index}`}>
                  <TableCell className="text-sm">
                    {formatDate(transfer.timestamp)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {truncateAddress(transfer.from)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {truncateAddress(transfer.to)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-green-600 text-green-400">
                      {transfer.valueFormatted} UC
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    #{transfer.blockNumber}
                  </TableCell>
                  <TableCell className="text-right">
                    <a
                      href={`https://sepolia.basescan.org/tx/${transfer.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm font-mono"
                    >
                      {truncateAddress(transfer.transactionHash)}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Info */}
      {filteredTransfers.length > 0 && (
        <div className="text-sm text-slate-400 text-center">
          Showing {filteredTransfers.length} transaction{filteredTransfers.length !== 1 ? "s" : ""}
          {searchAddress && ` (filtered)`}
        </div>
      )}
    </div>
  );
}
