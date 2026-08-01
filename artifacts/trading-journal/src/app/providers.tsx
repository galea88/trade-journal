'use client'
import { ClerkProvider } from '@clerk/nextjs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { clerkAppearance } from '@/lib/clerk-appearance'
import { initSentry } from '@/lib/sentry'
import {ApiAuthInitializer} from '../components/ApiAuthInitializer'

initSentry()

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      appearance={clerkAppearance}
    >
      <ApiAuthInitializer>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ApiAuthInitializer>
    </ClerkProvider>
  )
}
