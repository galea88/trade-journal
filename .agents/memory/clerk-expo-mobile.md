---
name: Clerk Expo mobile auth
description: Correct patterns for @clerk/expo v3 auth in Expo Go — ClerkProvider wiring, token getter, custom auth screens.
---

## Setup
- `tokenCache` from `@clerk/expo/token-cache` (confirmed export exists)
- `publishableKey` from `process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `proxyUrl` from `process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined` (empty in dev, auto-set in prod)
- Dev script must prepend: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY`

## Auth token for API calls (mobile only)
- In protected tab layout: `setAuthTokenGetter(() => getToken())` from `useAuth()`
- Called in `useEffect([getToken])`
- Do NOT use setAuthTokenGetter in web apps — cookies handle web auth

## Sign-out
- `useClerk()` from `@clerk/expo` provides `signOut()` — NOT `useAuth()`
- `useAuth()` does NOT expose `signOut` or `user`

## Custom auth screens (required — no native Clerk components in Expo Go)
- Email/password: `useSignIn()` → `signIn.password()`, `signUp.verifications.sendEmailCode()`
- OAuth: `useSSO()` → `startSSOFlow({ strategy: 'oauth_google', redirectUrl: AuthSession.makeRedirectUri() })`
- Verification state: `signUp.status === 'missing_requirements' && signUp.unverifiedFields.includes('email_address')`
- Finalize: `signUp.finalize({ navigate: ({ decorateUrl }) => router.replace(decorateUrl('/')) })`

**Why:** Clerk v3 Core SDK has breaking changes from v2. Native Clerk components crash in Expo Go.
