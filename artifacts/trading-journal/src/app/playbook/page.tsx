'use client'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import Playbook from '@/views/playbook'

export default function PlaybookPage() {
  return (
    <ProtectedLayout>
      <Playbook />
    </ProtectedLayout>
  )
}
