---
name: Trading Journal Next.js setup
description: Key architectural decisions for the trading-journal artifact's Next.js conversion.
---

# Trading Journal Next.js Architecture

## Rule: Never use `src/pages/` for component files in Next.js App Router projects

Next.js treats ANY `.tsx` file in `src/pages/` as a Pages Router route, which conflicts with App Router `app/` directory files of the same route name. This is a naming convention conflict, not a content conflict — even blank files trigger it.

**Why:** Next.js 15 App Router scans both `pages/` and `src/pages/` for Pages Router routes. If you also have `app/` routes, same-named routes create an unresolvable conflict.

**How to apply:** Keep page component files in `src/views/` (not `src/pages/`). App Router thin-wrapper pages live in `app/[route]/page.tsx` and import from `src/views/`.

## Pattern: App Router thin wrapper pages
- `app/[route]/page.tsx` — 'use client', renders `<ProtectedLayout><PageComponent /></ProtectedLayout>`
- `src/views/[route].tsx` — actual page component with business logic
- `src/components/layout/ProtectedLayout.tsx` — auth guard using useUser + useRouter

## Tailwind CSS v4 + Next.js
- Use `@tailwindcss/postcss` (not `@tailwindcss/vite`) with `postcss.config.mjs`
- CSS goes in `app/globals.css`, imported in `app/layout.tsx`
- `@custom-variant dark (&:is(.dark *))` + `class="dark"` on `<html>` for forced dark mode
