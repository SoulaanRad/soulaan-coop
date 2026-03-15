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
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Info,
} from "lucide-react";

export default function WealthFundHybridPage() {
  const [accountType, setAccountType] = useState<'TREASURY_FEES' | 'PLATFORM_FEES'>('TREASURY_FEES');

  // Fetch Wealth Fund balance
  const balanceQuery = api.treasuryLedger.getAccountBalance.useQuery({
    accountType,
    currency: 'USD',
  }, {
    refetchInterval: 60000,
  });

  // Fetch ledger entries for this account
  const entriesQuery = api.treasuryLedger.getLedgerEntries.useQuery({
    accountType,
    limit: 50,
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isLoading = balanceQuery.isLoading || entriesQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wealth Fund</h1>
          <p className="text-muted-foreground mt-1">
            Cooperative treasury funded by platform fees
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={accountType} 
            onValueChange={(v) => setAccountType(v as 'TREASURY_FEES' | 'PLATFORM_FEES')}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TREASURY_FEES">Treasury Fees</SelectItem>
              <SelectItem value="PLATFORM_FEES">Platform Fees</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              balanceQuery.refetch();
              entriesQuery.refetch();
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
                The Wealth Fund is now powered by fiat treasury fees collected from Stripe payments.
                All entries are linked to their originating commerce transactions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
          <CardDescription>
            {accountType === 'TREASURY_FEES' 
              ? 'Fees collected for cooperative treasury' 
              : 'Fees collected for platform operations'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-6 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <DollarSign className="h-8 w-8 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Balance</p>
                    <p className="text-4xl font-bold mt-1">
                      {formatAmount((balanceQuery.data?.balance || 0) / 100)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="text-2xl font-bold mt-1">
                    {balanceQuery.data?.entryCount || 0}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                    <p className="text-sm font-medium">Total Credits</p>
                  </div>
                  <p className="text-xl font-bold text-green-400">
                    {formatAmount((balanceQuery.data?.totalCredits || 0) / 100)}
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                    <p className="text-sm font-medium">Total Debits</p>
                  </div>
                  <p className="text-xl font-bold text-red-400">
                    {formatAmount((balanceQuery.data?.totalDebits || 0) / 100)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger Entries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ledger History</CardTitle>
              <CardDescription>
                All {accountType === 'TREASURY_FEES' ? 'treasury' : 'platform'} fee transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {entriesQuery.isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entriesQuery.data?.entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No ledger entries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entriesQuery.data?.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      entry.direction === 'CREDIT' 
                        ? 'bg-green-500/10' 
                        : 'bg-red-500/10'
                    }`}>
                      {entry.direction === 'CREDIT' ? (
                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {entry.entryType.replace(/_/g, ' ')}
                        </p>
                        {entry.linkedPayment && (
                          <Badge variant="secondary" className="text-xs">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Payment #{entry.linkedPayment.id.slice(0, 8)}
                          </Badge>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {entry.description}
                        </p>
                      )}
                      {entry.linkedPayment && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <p>
                            Customer: {entry.linkedPayment.customer.name} • 
                            Business: {entry.linkedPayment.business.name} • 
                            Total: {formatAmount(entry.linkedPayment.chargedAmount)}
                          </p>
                        </div>
                      )}
                      {entry.sourceTransactionId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ref: {entry.sourceTransactionId.slice(0, 12)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`text-lg font-bold ${
                      entry.direction === 'CREDIT' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {entry.direction === 'CREDIT' ? '+' : '-'}
                      {formatAmount(entry.amount / 100)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.occurredAt).toLocaleDateString()} at{' '}
                      {new Date(entry.occurredAt).toLocaleTimeString()}
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
