"use client";

import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { api } from "@/lib/trpc/client";

interface CheckoutFormProps {
  amount: number;
  transactionId: string;
  onReset: () => void;
}

export default function CheckoutForm({ amount, transactionId, onReset }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const { data: transactionData, refetch } = api.onramp.getOnrampStatus.useQuery(
    { transactionId },
    { enabled: paymentStatus === "success" }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/buy/success?transaction_id=${transactionId}`,
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed. Please try again.");
        setPaymentStatus("error");
      } else {
        setPaymentStatus("success");
        // Poll for transaction status
        setTimeout(() => {
          refetch();
        }, 2000);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setPaymentStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStatus === "success") {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Payment Successful!</h3>
              <p className="text-slate-400">
                Your Unity Coins are being minted and will appear in your wallet shortly.
              </p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-green-100 text-sm mb-1">You purchased</p>
              <p className="text-green-400 text-3xl font-bold">{amount.toFixed(2)} UC</p>
            </div>
            {transactionData && (
              <div className="bg-slate-900 rounded-lg p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-white font-medium">{transactionData.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction ID:</span>
                  <span className="text-white font-mono text-xs">
                    {transactionData.id.slice(0, 8)}...
                  </span>
                </div>
                {transactionData.mintTxHash && (
                  <div className="pt-2 border-t border-slate-700">
                    <a
                      href={`https://sepolia.basescan.org/tx/${transactionData.mintTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 text-xs"
                    >
                      View on Block Explorer →
                    </a>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={onReset}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white"
              >
                Buy More UC
              </Button>
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

  if (paymentStatus === "error") {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Payment Failed</h3>
              <p className="text-slate-400">{errorMessage}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onReset}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => {
                  setPaymentStatus("idle");
                  setErrorMessage("");
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Payment Details</CardTitle>
        <CardDescription className="text-slate-400">
          Enter your payment information to complete the purchase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount summary */}
        <div className="bg-slate-900 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Amount:</span>
            <span className="text-white font-medium">${amount.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">You will receive:</span>
            <span className="text-amber-400 font-semibold">{amount.toFixed(2)} UC</span>
          </div>
          <div className="pt-2 border-t border-slate-700 flex justify-between">
            <span className="text-slate-400 font-semibold">Total:</span>
            <span className="text-white font-bold">${amount.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Stripe Payment Element */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <PaymentElement />

          {/* Error message */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={onReset}
              variant="outline"
              disabled={isProcessing}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-12 text-lg font-semibold"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay $${amount.toFixed(2)}`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
