"use client"

import type React from "react"

import { useState } from "react"
import { joinWaitlist } from "@/actions/waitlist"

interface WaitlistFormProps {
  source: "hero" | "contact"
  variant?: "hero" | "card"
  className?: string
}

export function WaitlistForm({ source, variant = "hero", className = "" }: WaitlistFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setResult(null)

    const formData = new FormData(e.currentTarget)
    formData.append("source", source)

    try {
      const response = await joinWaitlist(formData)
      setResult(response)

      if (response.success) {
        if (e.currentTarget) {
          // Reset form on success
          e.currentTarget?.reset()
        }
      }
    } catch (error) {
      console.error("Error joining waitlist", error)
      setResult({
        success: false,
        message: "Error joining waitlist. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (variant === "hero") {
    return (
      <div className={`max-w-md mx-auto ${className}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              name="name"
              placeholder="Your Name (Optional)"
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={isSubmitting}
            />
            <input
              type="email"
              name="email"
              placeholder="Your Email"
              required
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-medium rounded-md"
            >
              {isSubmitting ? (
                "Joining..."
              ) : (
                <>
                  Join Waitlist
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
                    className="ml-2 w-4 h-4 inline"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {result && (
            <div className={`flex items-center gap-2 text-sm ${result.success ? "text-green-400" : "text-red-400"}`}>
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

          <p className="text-xs text-slate-400 text-center">
            Be the first to know about launch dates, community events, and new features.
          </p>
        </form>
      </div>
    )
  }

  return (
    <div className="bg-slate-700 border border-slate-600 rounded-lg overflow-hidden p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <input
            type="text"
            name="name"
            placeholder="Your Name (Optional)"
            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={isSubmitting}
          />
          <input
            type="email"
            name="email"
            placeholder="Your Email"
            required
            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-medium rounded-md flex items-center justify-center"
          >
            {isSubmitting ? (
              "Joining..."
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
                  <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z" />
                  <polyline points="15,9 18,9 18,6" />
                  <path d="M18 9 9 18" />
                </svg>
                Join Waitlist
              </>
            )}
          </button>
        </div>

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
          Ready to build with us? Fill out the form, tell a friend, and let's put Black dollars to work for the whole
          community.
        </p>
      </form>
    </div>
  )
}
