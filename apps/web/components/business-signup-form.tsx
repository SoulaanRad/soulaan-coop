"use client"

import type React from "react"

import { useState } from "react"
import { submitBusinessSignup } from "@/actions/waitlist"

export function BusinessSignupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setResult(null)

    const formData = new FormData(e.currentTarget)

    try {
      const response = await submitBusinessSignup(formData)
      setResult(response)

      if (response.success) {
        // Reset form on success
        e.currentTarget?.reset()
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Error submitting business signup. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-slate-700 border border-slate-600 rounded-lg overflow-hidden">
      <div className="p-6 border-b border-slate-600">
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
            className="w-6 h-6 text-purple-400"
          >
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
            <path d="M2 7h20" />
            <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
          </svg>
          <h2 className="text-white text-xl font-semibold">Business Partnership Interest</h2>
        </div>
        <p className="text-slate-300 text-sm mt-2">
          Ready to accept Unity Coin and earn rewards? Tell us about your business and we'll get you started.
        </p>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="ownerName" className="block text-white text-sm">
                Your Name *
              </label>
              <input
                id="ownerName"
                name="ownerName"
                type="text"
                placeholder="John Smith"
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="ownerEmail" className="block text-white text-sm">
                Your Email *
              </label>
              <input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                placeholder="john@yourbusiness.com"
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="businessName" className="block text-white text-sm">
              Business Name *
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              placeholder="Smith's Corner Store"
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="businessAddress" className="block text-white text-sm">
              Business Address *
            </label>
            <input
              id="businessAddress"
              name="businessAddress"
              type="text"
              placeholder="123 Main St, Atlanta, GA 30309"
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="businessType" className="block text-white text-sm">
                Business Type *
              </label>
              <select
                id="businessType"
                name="businessType"
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
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
              <label htmlFor="monthlyRevenue" className="block text-white text-sm">
                Monthly Revenue Range
              </label>
              <select
                id="monthlyRevenue"
                name="monthlyRevenue"
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">Select range (optional)</option>
                <option value="under-5k">Under $5,000</option>
                <option value="5k-15k">$5,000 - $15,000</option>
                <option value="15k-50k">$15,000 - $50,000</option>
                <option value="50k-100k">$50,000 - $100,000</option>
                <option value="over-100k">Over $100,000</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-white text-sm">
              Tell us more about your business (optional)
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="What products/services do you offer? How many customers do you serve? Any questions about Unity Coin integration?"
              disabled={isSubmitting}
              rows={3}
              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-md flex items-center justify-center"
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
                  className="w-4 h-4 mr-2"
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
              className={`flex items-center gap-2 text-sm p-3 rounded ${
                result.success ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
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
                  className="w-4 h-4"
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
                  className="w-4 h-4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              {result.message}
            </div>
          )}

          <p className="text-xs text-slate-400">
            * Required fields. We'll contact you within 5 business days to discuss partnership opportunities and help
            you get set up to accept Unity Coin.
          </p>
        </form>
      </div>
    </div>
  )
}
