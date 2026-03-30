"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from "lucide-react";

const DashboardHybrid = dynamic(() => import('@/components/portal/dashboard-hybrid'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardHybrid />;
}

