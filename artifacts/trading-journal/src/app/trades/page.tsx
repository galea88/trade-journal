'use client'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import Trades from '@/views/trades'

export default function TradesPage() {
  return (
    <ProtectedLayout>
      <Trades />
    </ProtectedLayout>
  )
}
