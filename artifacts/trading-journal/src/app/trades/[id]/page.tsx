'use client'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { TradeForm } from '@/components/trades/TradeForm'
import { useGetTrade, getGetTradeQueryKey } from '@workspace/api-client-react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function TradeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const { data: trade, isLoading } = useGetTrade(id, {
    query: { queryKey: getGetTradeQueryKey(id), enabled: !!id }
  })

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
          <h1 className="text-3xl font-bold tracking-tight">Edit Trade</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : trade ? `${trade.asset} — ${trade.direction.toUpperCase()}` : 'Trade not found'}
          </p>
        </div>
        {isLoading ? (
          <div className="max-w-2xl space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : trade ? (
          <div className="max-w-2xl">
            <TradeForm initialData={trade} onSuccess={() => router.push('/trades')} />
          </div>
        ) : (
          <p className="text-muted-foreground">Trade not found.</p>
        )}
      </div>
    </ProtectedLayout>
  )
}
