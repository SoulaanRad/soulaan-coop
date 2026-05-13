"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

interface TrackPageViewProps {
  event: string;
  properties?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Drop into any server-rendered page to fire a PostHog event on mount.
 * Renders nothing — purely for analytics side-effects.
 */
export function TrackPageView({ event, properties }: TrackPageViewProps) {
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog) {
      posthog.capture(event, properties);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
