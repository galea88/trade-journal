'use client'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Home from '@/views/home'

export default function HomePage() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/dashboard')
    }
  }, [isSignedIn, isLoaded, router])

  if (!isLoaded) return <div className="min-h-screen bg-background" />
  if (isSignedIn) return null

  return <Home />
}
