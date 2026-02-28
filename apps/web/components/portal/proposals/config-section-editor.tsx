"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Clock } from "lucide-react";
import Link from "next/link";

interface PendingAmendment {
  id: string;
  reason: string;
  proposedBy: string;
  proposedAt: string;
}

interface ConfigSectionEditorProps {
  title: string;
  /** Description shown under the title */
  description?: string;
  children: React.ReactNode;
  /** Pass true when the user has made local edits — reveals the submit footer */
  isDirty?: boolean;
  onSave: (reason: string) => Promise<void>;
  isSaving: boolean;
  /** Pass a pending amendment if one exists for this section */
  pendingAmendment?: PendingAmendment | null;
  /** Unused — kept for API compatibility */
  onAcknowledge?: (amendmentId: string) => Promise<void>;
  onReject?: (amendmentId: string, reason: string) => Promise<void>;
  isReviewing?: boolean;
}

export function ConfigSectionEditor({
  title,
  description,
  children,
  isDirty,
  onSave,
  isSaving,
  pendingAmendment,
}: ConfigSectionEditorProps) {
  const [reason, setReason] = useState("");

  const handleSave = async () => {
    if (!reason.trim() || reason.length < 3) return;
    await onSave(reason);
    setReason("");
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{title}</h3>
            {pendingAmendment && (
              <Link
                href="/portal/proposals/config/amendments"
                className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 border border-amber-600/40 px-2 py-0.5 text-xs text-amber-300 font-medium hover:bg-amber-900/50 transition-colors"
              >
                <Clock className="h-3 w-3" />
                Pending Review
              </Link>
            )}
            {isDirty && !pendingAmendment && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-900/30 border border-blue-600/40 px-2 py-0.5 text-xs text-blue-300 font-medium">
                Unsaved changes
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {/* Section content — always visible for editing */}
      {children}

      {/* Submit footer — appears only when there are local unsaved changes and no pending proposal */}
      {isDirty && !pendingAmendment && (
        <div className="pt-3 border-t border-slate-700 space-y-3">
          <p className="text-xs text-gray-400">
            Your changes won't go live until acknowledged.{" "}
            <Link
              href="/portal/proposals/config/amendments"
              className="text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline"
            >
              View proposed changes
            </Link>
          </p>
          <div>
            <Label className="text-gray-400 text-xs">Reason for change <span className="text-red-400">*</span></Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why this change is being made..."
              className="bg-slate-900 border-slate-600 text-white mt-1"
              maxLength={500}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || reason.length < 3}
              className="bg-amber-600 hover:bg-amber-700"
              size="sm"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Submit for Review
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
