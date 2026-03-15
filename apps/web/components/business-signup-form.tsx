"use client";

import type React from "react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function BusinessSignupFormContent() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coopInterest, setCoopInterest] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const coopFromQuery = searchParams.get("coop");
    if (coopFromQuery) {
      setCoopInterest(coopFromQuery);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    
    const businessData = {
      ownerName: formData.get("ownerName") as string,
      ownerEmail: formData.get("ownerEmail") as string,
      businessName: formData.get("businessName") as string,
      businessAddress: formData.get("businessAddress") as string,
      businessType: formData.get("businessType") as string,
      coopInterest: formData.get("coopInterest") as string,
      description: formData.get("description") as string,
    };

    try {
      const response = await fetch("/api/business-waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(businessData),
      });

      const data = await response.json();
      console.log("business-form response", data);
      setResult(data);

      if (data.success) {
        // Reset form on success
        e.currentTarget.reset();
        setCoopInterest(searchParams.get("coop") ?? "");
      }
    } catch {
      setResult({
        success: false,
        message: "Error submitting business signup. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80">
      <div className="border-b border-white/10 p-6">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-orange-300"
          >
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
            <path d="M2 7h20" />
            <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
          </svg>
          <h2 className="text-xl font-semibold text-white">
            Business Partnership Interest
          </h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Tell us about your business, the coop you want to support, and how
          you want to participate in the network.
        </p>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="coopInterest" className="block text-sm text-white">
              Coop you want to support
            </label>
            <input
              id="coopInterest"
              name="coopInterest"
              type="text"
              list="business-coop-options"
              placeholder="Soulaan Black Wealth Coop, The SF Nightlife Coop, or your own idea"
              value={coopInterest}
              onChange={(event) => setCoopInterest(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-300/50"
              data-ph-capture-attribute-coopinterest="true"
            />
            <datalist id="business-coop-options">
              <option value="Soulaan Black Wealth Coop" />
              <option value="The SF Nightlife Coop" />
              <option value="I don't know yet" />
              <option value="New coop idea" />
            </datalist>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="ownerName" className="block text-sm text-white">
                Your Name *
              </label>
              <input
                id="ownerName"
                name="ownerName"
                type="text"
                placeholder="John Smith"
                required
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-300/50"
                data-ph-capture-attribute-ownername="true"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="ownerEmail" className="block text-sm text-white">
                Your Email *
              </label>
              <input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                placeholder="john@yourbusiness.com"
                required
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-300/50"
                data-ph-capture-attribute-owneremail="true"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="businessName" className="block text-sm text-white">
              Business Name *
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              placeholder="Smith's Corner Store"
              required
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
              data-ph-capture-attribute-businessname="true"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="businessAddress"
              className="block text-sm text-white"
            >
              Business Address *
            </label>
            <input
              id="businessAddress"
              name="businessAddress"
              type="text"
              placeholder="123 Main St, Atlanta, GA 30309"
              required
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
              data-ph-capture-attribute-businessaddress="true"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="businessType"
              className="block text-sm text-white"
            >
              Business Type *
            </label>
            <select
              id="businessType"
              name="businessType"
              required
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-300/50"
              data-ph-capture-attribute-businesstype="true"
            >
              <option value="">Select business type</option>
              <option value="restaurant">Restaurant/Food Service</option>
              <option value="retail">Retail Store</option>
              <option value="salon">Beauty/Hair Salon</option>
              <option value="automotive">Automotive Service</option>
              <option value="professional">Professional Services</option>
              <option value="health">Health/Wellness</option>
              <option value="construction">Construction/Trades</option>
              <option value="technology">Technology</option>
              <option value="entertainment">Entertainment/Events</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm text-white">
              Tell us more about your business (optional)
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="What products/services do you offer? How many customers do you serve? Any questions about Unity Coin integration?"
              disabled={isSubmitting}
              rows={3}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-300/50"
              data-ph-capture-attribute-description="true"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 font-medium text-slate-950 transition hover:bg-slate-200"
          >
            {isSubmitting ? (
              "Submitting..."
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                  <path d="M2 7h20" />
                  <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
                </svg>
                Submit Business Interest
              </>
            )}
          </button>

          {result && (
            <div
              className={`flex items-center gap-2 rounded p-3 text-sm ${
                result.success
                  ? "border border-orange-400/20 bg-orange-400/10 text-orange-200"
                  : "border border-red-400/20 bg-red-400/10 text-red-200"
              }`}
            >
              {result.success ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              {result.message}
            </div>
          )}

          <p className="text-xs leading-6 text-slate-500">
            * Required fields. You can choose an active coop above or type the
            coop you want your business to help build.
          </p>
        </form>
      </div>
    </div>
  );
}

export function BusinessSignupForm() {
  return (
    <Suspense fallback={<div className="text-slate-400">Loading form...</div>}>
      <BusinessSignupFormContent />
    </Suspense>
  );
}
