"use client";

import { useEffect, useState } from "react";
import TreasuryDashboard from "@/components/portal/treasury-dashboard";
import TreasuryDashboardHybrid from "@/components/portal/treasury-dashboard-hybrid";
import { api } from "@/lib/trpc/client";
import { Loader2 } from "lucide-react";

export default function TreasuryPage() {
  const [useHybrid, setUseHybrid] = useState<boolean | null>(null);

  // Check if hybrid architecture is enabled
  useEffect(() => {
    async function checkFeatureFlag() {
      try {
        const response = await fetch('/api/feature-flags/hybrid-architecture');
        const data = await response.json();
        setUseHybrid(data.enabled);
      } catch (error) {
        console.error('Failed to check feature flag:', error);
        setUseHybrid(false);
      }
    }
    checkFeatureFlag();
  }, []);

  if (useHybrid === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {useHybrid ? <TreasuryDashboardHybrid /> : <TreasuryDashboard />}
    </div>
  );
}
