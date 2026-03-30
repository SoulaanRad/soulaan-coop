"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CoopOption } from "@/app/api/coops/route";

interface WaitlistSignupFormProps {
  coops?: CoopOption[];
}

export function WaitlistSignupForm({ coops = [] }: WaitlistSignupFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [selectedCoop, setSelectedCoop] = useState("none");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const formElement = e.currentTarget;

    const waitlistData = {
      email: formData.get("email") as string,
      source: "hero",
      suggestedCoop: selectedCoop === "none" ? "" : selectedCoop,
    };

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(waitlistData),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          message: data.message || "Error joining waitlist. Please try again.",
        });
        return;
      }

      setResult(data);

      if (data.success) {
        formElement.reset();
        setSelectedCoop("none");
      }
    } catch (error) {
      console.error("Waitlist submission error:", error);
      setResult({
        success: false,
        message: "Error joining waitlist. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[#1a1a1a] font-semibold">
          Email address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="bg-white border-white/30 text-[#1a1a1a] placeholder:text-slate-400"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coop" className="text-[#1a1a1a] font-semibold">
          Interested in a specific coop?
        </Label>
        <Select value={selectedCoop} onValueChange={setSelectedCoop}>
          <SelectTrigger className="bg-white border-white/30 text-[#1a1a1a]">
            <SelectValue placeholder="Select a coop" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No preference</SelectItem>
            {coops.map((coop) => (
              <SelectItem key={coop.coopId} value={coop.coopId}>
                {coop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#1a1a1a] text-white hover:bg-[#252525] font-semibold"
      >
        {isSubmitting ? "Joining..." : "Join Waitlist"}
      </Button>

      {result && (
        <div
          className={`rounded-lg p-4 text-sm font-medium ${
            result.success
              ? "bg-white/20 text-[#1a1a1a] border border-[#1a1a1a]/30"
              : "bg-white/20 text-[#1a1a1a] border border-[#1a1a1a]/30"
          }`}
        >
          {result.message}
        </div>
      )}
    </form>
  );
}
