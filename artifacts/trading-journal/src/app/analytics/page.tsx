'use client'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import Analytics from '@/views/analytics'

export default function AnalyticsPage() {
  return (
    <ProtectedLayout>
      <Analytics />
    </ProtectedLayout>
  )
}
