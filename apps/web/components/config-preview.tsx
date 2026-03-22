"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CoopConfigPreviewProps {
  config: {
    name: string;
    shortName: string;
    tagline: string;
    description: string;
    primaryColor: string;
    accentColor: string;
    quorumPercent: number;
    approvalThresholdPercent: number;
    votingWindowDays: number;
    screeningPassThreshold: number;
    minPaymentAmount: number;
    maxPaymentAmount: number;
    p2pFeePercent: number;
    withdrawalFeePercent: number;
  };
}

export function CoopConfigPreview({ config }: CoopConfigPreviewProps) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">Configuration Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-muted/50 rounded">
            <p className="text-muted-foreground text-xs">Name</p>
            <p className="font-medium">{config.name || "Not set"}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded">
            <p className="text-muted-foreground text-xs">Short Name</p>
            <p className="font-medium">{config.shortName || "Not set"}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded col-span-2">
            <p className="text-muted-foreground text-xs">Tagline</p>
            <p className="font-medium">{config.tagline || "Not set"}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded">
            <p className="text-muted-foreground text-xs">Quorum</p>
            <p className="font-medium">{config.quorumPercent}%</p>
          </div>
          <div className="p-3 bg-muted/50 rounded">
            <p className="text-muted-foreground text-xs">Approval</p>
            <p className="font-medium">{config.approvalThresholdPercent}%</p>
          </div>
          <div className="p-3 bg-muted/50 rounded">
            <p className="text-muted-foreground text-xs">Voting Window</p>
            <p className="font-medium">{config.votingWindowDays} days</p>
          </div>
          <div className="p-3 bg-muted/50 rounded">
            <p className="text-muted-foreground text-xs">AI Threshold</p>
            <p className="font-medium">{config.screeningPassThreshold}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded flex items-center gap-2">
            <div
              className="w-8 h-8 rounded"
              style={{ backgroundColor: config.primaryColor }}
            />
            <div>
              <p className="text-muted-foreground text-xs">Primary</p>
              <p className="font-mono text-xs">{config.primaryColor}</p>
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded flex items-center gap-2">
            <div
              className="w-8 h-8 rounded"
              style={{ backgroundColor: config.accentColor }}
            />
            <div>
              <p className="text-muted-foreground text-xs">Accent</p>
              <p className="font-mono text-xs">{config.accentColor}</p>
            </div>
          </div>
        </div>

        {config.description && (
          <div className="p-3 bg-muted/50 rounded">
            <p className="text-muted-foreground text-xs mb-1">Description</p>
            <p className="text-sm">{config.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
