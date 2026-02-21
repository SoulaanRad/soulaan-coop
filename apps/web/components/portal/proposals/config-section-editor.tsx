"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil } from "lucide-react";

interface ConfigSectionEditorProps {
  title: string;
  children: React.ReactNode;
  onSave: (reason: string) => Promise<void>;
  isSaving: boolean;
}

export function ConfigSectionEditor({ title, children, onSave, isSaving }: ConfigSectionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [reason, setReason] = useState("");

  const handleSave = async () => {
    if (!reason.trim() || reason.length < 3) return;
    await onSave(reason);
    setReason("");
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{title}</h3>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-gray-400 hover:text-white"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {children}

      {isEditing && (
        <div className="pt-3 border-t border-slate-700 space-y-3">
          <div>
            <Label className="text-gray-400 text-xs">Reason for change (required)</Label>
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
              Save Changes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIsEditing(false); setReason(""); }}
              className="text-gray-400"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
