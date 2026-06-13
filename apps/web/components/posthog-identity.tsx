"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePostHog } from "posthog-js/react";

import { env } from "@/env";

interface SessionResponse {
  isLoggedIn?: boolean;
  address?: string | null;
  userId?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  hasProfile?: boolean;
  activeCoopId?: string | null;
  isAdmin?: boolean;
  adminRole?: string | null;
}

function compactProperties<T extends Record<string, unknown>>(properties: T) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

export function PostHogIdentity() {
  const posthog = usePostHog();
  const pathname = usePathname();
  const currentIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    if (!env.NEXT_PUBLIC_POSTHOG_KEY) return;

    const controller = new AbortController();

    async function syncIdentity() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;

        const session = (await response.json()) as SessionResponse;

        if (session.isLoggedIn) {
          const distinctId = session.userId || session.email || session.address;
          if (!distinctId) return;

          const identityKey = `user:${distinctId}:${session.activeCoopId ?? ""}`;
          const properties = compactProperties({
            user_id: session.userId,
            email: session.email,
            wallet_address: session.address,
            login_method: session.loginMethod,
            has_profile: session.hasProfile,
            active_coop_id: session.activeCoopId,
            is_admin: session.isAdmin,
            admin_role: session.adminRole,
            user_type: "member",
            auth_state: "authenticated",
          });

          if (currentIdentityRef.current !== identityKey) {
            posthog.identify(distinctId, properties);
            currentIdentityRef.current = identityKey;
          }

          posthog.register(properties);
          return;
        }

        const anonymousId = posthog.get_distinct_id();
        const identityKey = `anonymous:${anonymousId}`;
        const properties = compactProperties({
          anonymous_id: anonymousId,
          user_type: "anonymous",
          auth_state: "anonymous",
          is_logged_in: false,
        });

        if (anonymousId && currentIdentityRef.current !== identityKey) {
          posthog.identify(anonymousId, properties, {
            first_seen_as_anonymous_at: new Date().toISOString(),
          });
          currentIdentityRef.current = identityKey;
        }

        posthog.register(properties);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("PostHog identity sync error:", error);
      }
    }

    void syncIdentity();

    return () => controller.abort();
  }, [pathname, posthog]);

  return null;
}
