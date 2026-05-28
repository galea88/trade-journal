'use client'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import CalendarPage from '@/views/calendar'

export default function CalendarRoutePage() {
  return (
    <ProtectedLayout>
      <CalendarPage />
    </ProtectedLayout>
  )
}
