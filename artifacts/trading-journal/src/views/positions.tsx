'use client'
import { useQuery } from '@tanstack/react-query'
import { customFetch } from '@workspace/api-client-react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, RefreshCw, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Position {
  id: number
  asset: string
  assetType: string
  direction: string
  entryPrice: string
  quantity: string
  entryDate: string
  currentPrice: number | null
  unrealizedPnl: number | null
  pctMove: number | null
  priceError?: string
}

async function fetchPositions(): Promise<Position[]> {
  return customFetch<Position[]>('/api/positions')
}

export default function Positions() {
  const { data: positions, isLoading, dataUpdatedAt, error } = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    refetchInterval: 30_000,
    staleTime: 25_000,
  })

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Open Positions</h1>
          <p className="text-muted-foreground mt-1">Live unrealized P&L for all open trades.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          {lastUpdated
            ? `Updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}`
            : 'Loading...'}
          <span className="text-muted-foreground/50">· refreshes every 30s</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-4">Asset</th>
                  <th className="px-4 py-4">Direction</th>
                  <th className="px-4 py-4 text-right">Entry Price</th>
                  <th className="px-4 py-4 text-right">Current Price</th>
                  <th className="px-4 py-4 text-right">Qty</th>
                  <th className="px-4 py-4 text-right">Unrealized P&L</th>
                  <th className="px-4 py-4 text-right">% Move</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <Activity className="h-5 w-5 mx-auto mb-2 animate-pulse" />
                      Fetching live prices…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-destructive">
                      Failed to load positions.
                    </td>
                  </tr>
                ) : !positions || positions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <TrendingUp className="h-10 w-10 opacity-20" />
                        <p className="font-medium text-base">No open positions</p>
                        <p className="text-xs">All trades have been closed. Open a new trade to see it here.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  positions.map((pos) => (
                    <PositionRow key={pos.id} position={pos} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {positions && positions.length > 0 && (
        <PositionsSummary positions={positions} />
      )}
    </div>
  )
}

function PositionRow({ position: pos }: { position: Position }) {
  const isLong = pos.direction === 'long'
  const hasPnl = pos.unrealizedPnl != null
  const isProfit = hasPnl && pos.unrealizedPnl! >= 0

  const formatPrice = (price: string | number | null | undefined) => {
    if (price == null) return '—'
    const num = typeof price === 'string' ? parseFloat(price) : price
    if (isNaN(num)) return '—'
    if (num < 0.01) return `$${num.toFixed(6)}`
    if (num < 1) return `$${num.toFixed(4)}`
    return `$${num.toFixed(2)}`
  }

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="font-bold">{pos.asset}</div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{pos.assetType}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-sm text-xs font-bold uppercase ${isLong ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
          {pos.direction}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatPrice(pos.entryPrice)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {pos.currentPrice != null
          ? formatPrice(pos.currentPrice)
          : <span className="text-muted-foreground text-xs" title={pos.priceError}>Unavailable</span>
        }
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {parseFloat(pos.quantity)}
      </td>
      <td className={`px-4 py-3 text-right font-bold tabular-nums ${hasPnl ? (isProfit ? 'text-primary' : 'text-destructive') : 'text-muted-foreground'}`}>
        {hasPnl ? (
          <span className="flex items-center justify-end gap-1">
            {isProfit
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />
            }
            {isProfit ? '+' : ''}${Math.abs(pos.unrealizedPnl!).toFixed(2)}
          </span>
        ) : '—'}
      </td>
      <td className={`px-4 py-3 text-right tabular-nums font-medium ${hasPnl ? (isProfit ? 'text-primary' : 'text-destructive') : 'text-muted-foreground'}`}>
        {pos.pctMove != null
          ? `${pos.pctMove >= 0 ? '+' : ''}${pos.pctMove.toFixed(2)}%`
          : '—'
        }
      </td>
    </tr>
  )
}

function PositionsSummary({ positions }: { positions: Position[] }) {
  const withPnl = positions.filter((p) => p.unrealizedPnl != null)
  const totalPnl = withPnl.reduce((sum, p) => sum + p.unrealizedPnl!, 0)
  const winners = withPnl.filter((p) => p.unrealizedPnl! > 0).length
  const losers = withPnl.filter((p) => p.unrealizedPnl! < 0).length

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Unrealized P&L</p>
          <p className={`text-2xl font-bold tabular-nums ${totalPnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toFixed(2)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Open Positions</p>
          <p className="text-2xl font-bold">{positions.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Winning / Losing</p>
          <p className="text-2xl font-bold">
            <span className="text-primary">{winners}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-destructive">{losers}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
