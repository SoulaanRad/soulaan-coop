'use client'

import { env } from '@/env'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: '/ingest',
      ui_host: 'https://us.i.posthog.com',
      defaults: '2025-05-24',
      capture_exceptions: true,
      debug: env.NODE_ENV === 'development',
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}