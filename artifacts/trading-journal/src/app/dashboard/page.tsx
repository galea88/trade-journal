'use client'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import Dashboard from '@/views/dashboard'

export default function DashboardPage() {
  return (
    <ProtectedLayout>
      <Dashboard />
    </ProtectedLayout>
  )
}
