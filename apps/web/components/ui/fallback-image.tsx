"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

/**
 * Wraps next/image and hides itself on load error so any placeholder
 * rendered behind it (letter avatar, icon, gradient, etc.) shows through.
 */
export function FallbackImage({ onError, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <Image
      {...props}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
    />
  );
}
