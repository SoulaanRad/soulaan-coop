"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { coopConfig, formatCurrency } from "@/lib/coop-config";

interface ClaimInfo {
  found: boolean;
  expired?: boolean;
  claimed?: boolean;
  senderName?: string;
  amount?: number;
  note?: string;
  expiresAt?: string;
}

export default function ClaimPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const config = coopConfig();

  const [loading, setLoading] = useState(true);
  const [claimInfo, setClaimInfo] = useState<ClaimInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadClaimInfo();
    }
  }, [token]);

  const loadClaimInfo = async () => {
    try {
      const response = await fetch("/api/trpc/claim.getClaimInfo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimToken: token }),
      });

      const result = await response.json();

      if (result.error) {
        setError(result.error.message || "Failed to load claim info");
        return;
      }

      setClaimInfo(result.result?.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claim info");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !claimInfo?.found) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              This payment link is invalid or has already been used.
            </p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Go to {config.shortName}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (claimInfo.expired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏰</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Expired
            </h1>
            <p className="text-gray-600 mb-6">
              This payment has expired and was returned to the sender.
            </p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Learn About {config.shortName}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (claimInfo.claimed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Already Claimed
            </h1>
            <p className="text-gray-600 mb-6">
              This payment has already been claimed.
            </p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Go to {config.shortName}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate time remaining
  const expiresAt = claimInfo.expiresAt ? new Date(claimInfo.expiresAt) : null;
  const now = new Date();
  const daysRemaining = expiresAt
    ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-green-500 px-6 py-8 text-center text-white">
            <p className="text-green-100 mb-2">You've received</p>
            <p className="text-5xl font-bold mb-2">
              ${claimInfo.amount?.toFixed(2)}
            </p>
            <p className="text-green-100">
              from {claimInfo.senderName || "someone"}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Note */}
            {claimInfo.note && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-gray-600 text-sm">Note:</p>
                <p className="text-gray-900 font-medium">"{claimInfo.note}"</p>
              </div>
            )}

            {/* Expiration Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-sm">
                <span className="font-semibold">Claim within {daysRemaining} days</span>
                {" "}or this payment will be returned to the sender.
              </p>
            </div>

            {/* Claim Options */}
            <div className="space-y-3">
              <Link
                href={`/claim/${token}/bank`}
                className="block w-full bg-blue-600 text-white text-center px-6 py-4 rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Claim to Bank Account
              </Link>

              <Link
                href={`/claim/${token}/join`}
                className="block w-full bg-green-600 text-white text-center px-6 py-4 rounded-xl font-semibold hover:bg-green-700 transition"
              >
                Join {config.shortName} & Keep It
              </Link>
            </div>

            {/* Info Text */}
            <p className="text-gray-500 text-sm text-center mt-6">
              <strong>Join {config.shortName}</strong> to send and receive money instantly,
              or claim directly to your bank account.
            </p>
          </div>
        </div>

        {/* Branding */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">Powered by</p>
          <p className="text-gray-600 font-semibold">{config.shortName}</p>
        </div>
      </div>
    </div>
  );
}
