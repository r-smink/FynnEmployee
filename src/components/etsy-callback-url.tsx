'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// Etsy redirect URL for the domain the app is running on (empty during SSR to avoid a hydration mismatch)
export function EtsyCallbackUrl() {
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => '')
  return <>{origin}/api/etsy/callback</>
}
