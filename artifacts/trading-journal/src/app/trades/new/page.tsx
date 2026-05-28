'use client'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { TradeForm } from '@/components/trades/TradeForm'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NewTradePage() {
  const router = useRouter()

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/trades')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trade Log
          </Button>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log New Trade</h1>
          <p className="text-muted-foreground mt-1">Record your trade execution details.</p>
        </div>
        <div className="max-w-2xl">
          <TradeForm onSuccess={() => router.push('/trades')} />
        </div>
      </div>
    </ProtectedLayout>
  )
}
