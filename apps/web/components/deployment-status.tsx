"use client";

import { CheckCircle2, Loader2, XCircle, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";

export type DeploymentStepStatus = "pending" | "deploying" | "completed" | "failed";

export interface DeploymentStepProps {
  name: string;
  description: string;
  status: DeploymentStepStatus;
  txHash?: string;
  contractAddress?: string;
  error?: string;
  explorerUrl: string;
  stepId: string;
}

export function DeploymentStep({
  name,
  description,
  status,
  txHash,
  contractAddress,
  error,
  explorerUrl,
  stepId,
}: DeploymentStepProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
        status === "completed"
          ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
          : status === "deploying"
          ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 shadow-lg"
          : status === "failed"
          ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
          : "bg-muted/30 border-muted"
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        {status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
        {status === "deploying" && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
        {status === "failed" && <XCircle className="w-5 h-5 text-red-600" />}
        {status === "pending" && (
          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-medium">{name}</h4>
          {status === "deploying" && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
              Deploying...
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>

        {txHash && (
          <a
            href={`${explorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2"
          >
            View transaction <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {contractAddress && (
          <div className="mt-2 p-2 bg-background rounded border">
            <p className="text-xs text-muted-foreground mb-1">Contract Address:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono flex-1 truncate">
                {contractAddress}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(contractAddress)}
                className="h-6 w-6 p-0 flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

export interface ContractCardProps {
  name: string;
  address: string;
  description: string;
  explorerUrl: string;
}

export function ContractCard({ name, address, description, explorerUrl }: ContractCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium">{name}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <a
          href={`${explorerUrl}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono flex-1 truncate bg-background px-2 py-1 rounded border">
          {address}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(address)}
          className="h-7 flex-shrink-0"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-600" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
