"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface MinIOImageUploadProps {
  onUploadComplete: (url: string) => void;
  uploadType: "profile" | "store" | "product";
  coopId: string;
  resourceId?: string;
  label?: string;
  description?: string;
  aspectRatio?: string;
  currentImageUrl?: string | null;
}

export function MinIOImageUpload({
  onUploadComplete,
  uploadType,
  coopId,
  resourceId = "temp",
  label = "Upload Image",
  description = "Select an image to upload",
  aspectRatio = "aspect-square",
  currentImageUrl = null,
}: MinIOImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      // Step 1: Get presigned URL from API
      const presignedResponse = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Coop-Id": coopId,
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          uploadType,
          resourceId,
        }),
      });

      const presignedData = await presignedResponse.json();

      if (!presignedData.success) {
        throw new Error(presignedData.error || "Failed to get presigned URL");
      }

      // Step 2: Upload file directly to MinIO using presigned URL
      const uploadResponse = await fetch(presignedData.presignedUrl, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }

      // Success!
      setUploadedUrl(presignedData.publicUrl);
      onUploadComplete(presignedData.publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">{label}</Label>
        {description && (
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        )}
      </div>

      {/* Preview */}
      {previewUrl ? (
        <div className="relative">
          <div className={`relative ${aspectRatio} w-full max-w-md overflow-hidden rounded-lg border border-slate-700`}>
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
          {!uploadedUrl && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        /* Upload area */
        <div
          className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:border-slate-600 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-400 mb-2">Click to select an image</p>
          <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Upload button */}
      {selectedFile && !uploadedUrl && (
        <Button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </>
          )}
        </Button>
      )}

      {/* Success message */}
      {uploadedUrl && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
          <p className="text-sm text-green-400">✓ Image uploaded successfully</p>
        </div>
      )}
    </div>
  );
}
