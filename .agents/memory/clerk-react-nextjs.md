---
name: Clerk React in Next.js App Router (client-side only)
description: How to use @clerk/react (not @clerk/nextjs) in a Next.js App Router project with client-side-only auth.
---

# Clerk React in Next.js App Router

## Rule: Use NEXT_PUBLIC_ env vars, not VITE_ for Next.js builds

**Why:** `VITE_*` env vars are injected by Vite at bundle time and not available in Next.js. `NEXT_PUBLIC_*` vars are injected by Next.js at build time.

**How to apply:** Dev script in package.json:
```
"dev": "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY NEXT_PUBLIC_CLERK_PROXY_URL=${CLERK_PROXY_URL:-} next dev -p $PORT"
```
The base secret is `CLERK_PUBLISHABLE_KEY` (auto-provisioned). Pass it through the script.

## ClerkProvider with Next.js routing
```tsx
// app/providers.tsx - 'use client'
const router = useRouter() // from next/navigation
<ClerkProvider
  publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''}
  routerPush={(to) => router.push(to)}
  routerReplace={(to) => router.replace(to)}
  signInUrl="/sign-in"
  signUpUrl="/sign-up"
>
```

## Navigation: next/link + usePathname instead of wouter
- AppLayout: `usePathname()` from next/navigation for active state, `Link` from next/link
- DO NOT use wouter in Next.js App Router projects
