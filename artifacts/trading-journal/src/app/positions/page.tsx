'use client'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import Positions from '@/views/positions'

export default function PositionsPage() {
  return (
    <ProtectedLayout>
      <Positions />
    </ProtectedLayout>
  )
}
