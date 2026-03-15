'use client';

import { useEffect } from 'react';

/**
 * Landing page for Stripe Connect return_url.
 * Stripe redirects here after a user completes (or exits) the hosted onboarding flow.
 * The mobile app opens onboarding via WebBrowser — users just close this tab to return.
 */
export default function BusinessDashboardPage() {
  useEffect(() => {
    // Attempt to close the tab automatically (works in some in-app browsers)
    window.close();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center px-6 py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          You&apos;re all set!
        </h1>
        <p className="text-gray-600 mb-6">
          Your payment setup is complete. You can close this tab and return to the app to check your status.
        </p>
        <button
          onClick={() => window.close()}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Close this tab
        </button>
      </div>
    </div>
  );
}
