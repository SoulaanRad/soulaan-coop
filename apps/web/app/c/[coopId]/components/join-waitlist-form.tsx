"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface JoinWaitlistFormProps {
  coopId: string;
  coopName: string;
  primaryColor?: string;
}

export function JoinWaitlistForm({ coopId, coopName, primaryColor }: JoinWaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name,
          source: "hero",
          suggestedCoop: coopName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to join waitlist");
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="bg-white/10 backdrop-blur-sm border-white/20" id="join">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-green-500 p-3">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">
            You&apos;re on the list!
          </h3>
          <p className="mt-2 text-white/80">
            We&apos;ll notify you when membership opens for {coopName}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20" id="join">
      <CardHeader>
        <CardTitle className="text-white">Join the Waitlist</CardTitle>
        <CardDescription className="text-white/70">
          Be the first to know when new member spots open up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white"
            />
          </div>
          {error && (
            <p className="text-sm text-red-200">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full bg-white hover:bg-white/90"
            style={primaryColor ? { color: primaryColor } : undefined}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Waitlist"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
