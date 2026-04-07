"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Check, X } from "lucide-react";

interface CompactImageUploadProps {
  uploadType: "product" | "store" | "profile";
  coopId: string;
  resourceId: string;
  label: string;
  onUploadComplete: (url: string) => void;
}

export function CompactImageUpload({
  uploadType,
  coopId,
  resourceId,
  label,
  onUploadComplete,
}: CompactImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadSuccess(false);

    try {
      const presignedResponse = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Coop-Id": coopId,
        },
        body: JSON.stringify({
          uploadType,
          resourceId,
          contentType: file.type,
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { presignedUrl, publicUrl } = await presignedResponse.json();

      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      onUploadComplete(publicUrl);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id={`compact-upload-${label}`}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="border-slate-700 text-gray-300 hover:bg-slate-800"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Uploading...
          </>
        ) : uploadSuccess ? (
          <>
            <Check className="h-3 w-3 mr-1 text-green-500" />
            {label}
          </>
        ) : (
          <>
            <Upload className="h-3 w-3 mr-1" />
            {label}
          </>
        )}
      </Button>
      {error && (
        <div className="flex items-center gap-1">
          <X className="h-3 w-3 text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}
    </div>
  );
}
