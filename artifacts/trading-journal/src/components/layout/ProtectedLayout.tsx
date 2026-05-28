'use client'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AppLayout } from './AppLayout'
import { ErrorBoundary } from './ErrorBoundary'

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/sign-in')
    }
  }, [isSignedIn, isLoaded, router])

  if (!isLoaded) {
    return <div className="min-h-screen bg-background" />
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <AppLayout>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppLayout>
  )
}
