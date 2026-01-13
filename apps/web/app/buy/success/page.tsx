"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/trpc/client";

function SuccessContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get("transaction_id");

  const { data: transaction, isLoading } = api.onramp.getOnrampStatus.useQuery(
    { transactionId: transactionId || "" },
    { enabled: !!transactionId, refetchInterval: 3000 }
  );

  if (!transactionId) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Invalid Transaction</h3>
              <p className="text-slate-400">No transaction ID found</p>
            </div>
            <Button
              onClick={() => (window.location.href = "/buy")}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Back to Buy Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto" />
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Processing Payment...</h3>
              <p className="text-slate-400">Please wait while we confirm your transaction</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transaction) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Transaction Not Found</h3>
              <p className="text-slate-400">Unable to find transaction details</p>
            </div>
            <Button
              onClick={() => (window.location.href = "/buy")}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Back to Buy Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSuccess = transaction.status === "COMPLETED";
  const isPending = transaction.status === "PENDING";
  const isFailed = transaction.status === "FAILED";

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
              isSuccess
                ? "bg-green-500/10"
                : isPending
                ? "bg-amber-500/10"
                : "bg-red-500/10"
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-8 h-8 text-green-500" />}
            {isPending && <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />}
            {isFailed && <XCircle className="w-8 h-8 text-red-500" />}
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {isSuccess && "Payment Successful!"}
              {isPending && "Processing Payment..."}
              {isFailed && "Payment Failed"}
            </h3>
            <p className="text-slate-400">
              {isSuccess &&
                "Your Unity Coins have been minted and are available in your wallet."}
              {isPending && "Your payment is being processed. This may take a few moments."}
              {isFailed &&
                (transaction.failureReason ||
                  "Your payment could not be processed. Please try again.")}
            </p>
          </div>

          <div
            className={`border rounded-lg p-4 ${
              isSuccess
                ? "bg-green-500/10 border-green-500/20"
                : isPending
                ? "bg-amber-500/10 border-amber-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
          >
            <p
              className={`text-sm mb-1 ${
                isSuccess
                  ? "text-green-100"
                  : isPending
                  ? "text-amber-100"
                  : "text-red-100"
              }`}
            >
              {isSuccess ? "You received" : "Amount"}
            </p>
            <p
              className={`text-3xl font-bold ${
                isSuccess
                  ? "text-green-400"
                  : isPending
                  ? "text-amber-400"
                  : "text-red-400"
              }`}
            >
              {transaction.amountUC.toFixed(2)} UC
            </p>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-white font-medium">{transaction.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Amount Paid:</span>
              <span className="text-white font-medium">${transaction.amountUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Processor:</span>
              <span className="text-white font-medium capitalize">{transaction.processor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Transaction ID:</span>
              <span className="text-white font-mono text-xs">
                {transaction.id.slice(0, 12)}...
              </span>
            </div>
            {transaction.mintTxHash && (
              <div className="pt-2 border-t border-slate-700">
                <a
                  href={`https://sepolia.basescan.org/tx/${transaction.mintTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 text-xs inline-flex items-center"
                >
                  View Mint Transaction on Block Explorer →
                </a>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {(isSuccess || isFailed) && (
              <Button
                onClick={() => (window.location.href = "/buy")}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white"
              >
                Buy More UC
              </Button>
            )}
            <Button
              onClick={() => (window.location.href = "/portal")}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BuySuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Suspense
          fallback={
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto" />
                  <p className="text-slate-400">Loading...</p>
                </div>
              </CardContent>
            </Card>
          }
        >
          <SuccessContent />
        </Suspense>
      </div>
    </div>
  );
}
