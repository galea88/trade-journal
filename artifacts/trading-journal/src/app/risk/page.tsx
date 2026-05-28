'use client'
import { useState } from 'react'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from '@workspace/api-client-react'
import { ShieldAlert, TrendingDown, Calculator, DollarSign } from 'lucide-react'

function RiskCalculator() {
  const [accountSize, setAccountSize] = useState('10000')
  const [riskPercent, setRiskPercent] = useState('1')
  const [entryPrice, setEntryPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')

  const acc = parseFloat(accountSize) || 0
  const risk = parseFloat(riskPercent) || 0
  const entry = parseFloat(entryPrice) || 0
  const stop = parseFloat(stopPrice) || 0

  const riskAmount = (acc * risk) / 100
  const stopDistance = Math.abs(entry - stop)
  const positionSize = stopDistance > 0 ? Math.floor(riskAmount / stopDistance) : 0
  const totalExposure = positionSize * entry
  const exposurePercent = acc > 0 ? (totalExposure / acc) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Position Size Calculator
        </CardTitle>
        <CardDescription>Determine your optimal position size based on your risk tolerance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Account Size ($)</label>
            <Input
              type="number"
              step="any"
              value={accountSize}
              onChange={e => setAccountSize(e.target.value)}
              placeholder="10000"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Risk per Trade (%)</label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              value={riskPercent}
              onChange={e => setRiskPercent(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Entry Price ($)</label>
            <Input
              type="number"
              step="any"
              value={entryPrice}
              onChange={e => setEntryPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Stop Loss Price ($)</label>
            <Input
              type="number"
              step="any"
              value={stopPrice}
              onChange={e => setStopPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="border border-border rounded-md p-4 bg-card space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Results</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Risk Amount</p>
              <p className="text-xl font-bold text-destructive">${riskAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stop Distance</p>
              <p className="text-xl font-bold">${stopDistance.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Position Size</p>
              <p className="text-xl font-bold text-primary">{positionSize.toLocaleString()} shares</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Exposure</p>
              <p className="text-xl font-bold">${totalExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">{exposurePercent.toFixed(1)}% of account</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground border border-border/50 rounded p-3 bg-muted/10">
          <strong className="text-foreground">Formula:</strong> Position Size = (Account × Risk%) ÷ |Entry − Stop|
        </div>
      </CardContent>
    </Card>
  )
}

function RiskMetrics() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  })

  const closedTrades = summary?.closedTrades ?? 0
  const winRate = ((summary?.winRate ?? 0) * 100).toFixed(1)
  const avgWin = summary?.avgWin ?? 0
  const avgLoss = summary?.avgLoss ?? 0
  const rr = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '—'

  if (!isLoading && closedTrades === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-border rounded-lg bg-muted/10 space-y-2">
        <p className="text-muted-foreground font-medium">No closed trades yet</p>
        <p className="text-sm text-muted-foreground">Risk metrics will appear here once you log and close your first trade.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Win Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {isLoading ? '—' : `${winRate}%`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Based on {closedTrades} closed trades</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Avg Loss
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {isLoading ? '—' : `$${avgLoss.toFixed(2)}`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Average losing trade</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Risk/Reward
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? '—' : `${rr}:1`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Avg Win ÷ Avg Loss</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RiskPage() {
  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Risk Management</h1>
          <p className="text-muted-foreground mt-1">Protect your capital. Size positions based on your edge.</p>
        </div>
        <RiskMetrics />
        <RiskCalculator />
      </div>
    </ProtectedLayout>
  )
}
