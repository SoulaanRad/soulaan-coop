"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { coopConfig } from "@/lib/coop-config";

export default function ClaimToBankPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const config = coopConfig();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    message: string;
    eta: string;
  } | null>(null);

  // Form state
  const [accountHolderName, setAccountHolderName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!accountHolderName.trim()) {
      setError("Please enter the account holder name");
      return;
    }

    if (routingNumber.length !== 9) {
      setError("Routing number must be 9 digits");
      return;
    }

    if (accountNumber.length < 4 || accountNumber.length > 17) {
      setError("Please enter a valid account number");
      return;
    }

    if (accountNumber !== confirmAccountNumber) {
      setError("Account numbers do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/trpc/claim.claimToBank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimToken: token,
          accountHolderName: accountHolderName.trim(),
          routingNumber,
          accountNumber,
        }),
      });

      const result = await response.json();

      if (result.error) {
        setError(result.error.message || "Failed to claim funds");
        return;
      }

      setSuccessData(result.result?.data);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim funds");
    } finally {
      setLoading(false);
    }
  };

  if (success && successData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✓</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Claim Successful!
            </h1>
            <p className="text-gray-600 mb-4">{successData.message}</p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-blue-800 font-medium">
                Expected arrival: {successData.eta}
              </p>
            </div>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Back Link */}
        <Link
          href={`/claim/${token}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </Link>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Claim to Bank Account
          </h1>
          <p className="text-gray-600 mb-6">
            Enter your bank details to receive the funds via ACH transfer.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Holder Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>

            {/* Routing Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Routing Number
              </label>
              <input
                type="text"
                value={routingNumber}
                onChange={(e) =>
                  setRoutingNumber(e.target.value.replace(/\D/g, "").slice(0, 9))
                }
                placeholder="9 digits"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                maxLength={9}
                required
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="password"
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 17))
                }
                placeholder="Account number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                maxLength={17}
                required
              />
            </div>

            {/* Confirm Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Account Number
              </label>
              <input
                type="text"
                value={confirmAccountNumber}
                onChange={(e) =>
                  setConfirmAccountNumber(
                    e.target.value.replace(/\D/g, "").slice(0, 17)
                  )
                }
                placeholder="Re-enter account number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                maxLength={17}
                required
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Processing Time:</strong> Funds typically arrive in 1-3
                business days via ACH transfer.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                "Claim Funds"
              )}
            </button>
          </form>
        </div>

        {/* Security Note */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            🔒 Your bank details are encrypted and secure
          </p>
        </div>
      </div>
    </div>
  );
}
