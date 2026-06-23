'use client'
import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Plug, RefreshCw, Unplug, CheckCircle, XCircle,
  Clock, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { format } from 'date-fns'

interface BrokerStatus {
  connected: boolean
  enabled?: boolean
  lastSyncAt?: string | null
  lastSyncCount?: number | null
  lastSyncError?: string | null
  connectionId?: number
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? 'Request failed')
  }
  return res.json()
}

export default function IntegrationsPage() {
  const { toast } = useToast()

  const [status, setStatus] = useState<BrokerStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const [ibkrToken, setIbkrToken] = useState('')
  const [ibkrQueryId, setIbkrQueryId] = useState('')
  const [testing, setTesting] = useState(false)
  const [testPassed, setTestPassed] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiFetch('/api/brokers/status')
      setStatus(data)
    } catch (err) {
      console.error('Failed to fetch broker status', err)
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const resetTestState = () => setTestPassed(false)

  const handleTest = async () => {
    if (!ibkrToken.trim() || !ibkrQueryId.trim()) {
      toast({ title: 'Enter both Flex Token and Query ID', variant: 'destructive' })
      return
    }
    setTesting(true)
    setTestPassed(false)
    try {
      await apiFetch('/api/brokers/test', {
        method: 'POST',
        body: JSON.stringify({ token: ibkrToken.trim(), queryId: ibkrQueryId.trim() }),
      })
      setTestPassed(true)
      toast({ title: 'Connection test passed!' })
    } catch (err: any) {
      toast({ title: 'Test failed', description: err.message, variant: 'destructive' })
    } finally {
      setTesting(false)
    }
  }

  const handleConnect = async () => {
    if (!ibkrToken.trim() || !ibkrQueryId.trim()) return
    setConnecting(true)
    try {
      await apiFetch('/api/brokers/connect', {
        method: 'POST',
        body: JSON.stringify({ token: ibkrToken.trim(), queryId: ibkrQueryId.trim() }),
      })
      toast({ title: 'IBKR connected successfully' })
      setIbkrToken('')
      setIbkrQueryId('')
      setTestPassed(false)
      await fetchStatus()
    } catch (err: any) {
      toast({ title: 'Connection failed', description: err.message, variant: 'destructive' })
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await apiFetch('/api/brokers/sync', { method: 'POST' })
      if (result.error) {
        toast({ title: 'Sync failed', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: `Sync complete — ${result.lastSyncCount ?? 0} trades imported` })
      }
      await fetchStatus()
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' })
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect IBKR? Your imported trades will remain in the log.')) return
    setDisconnecting(true)
    try {
      await apiFetch('/api/brokers/disconnect', { method: 'DELETE' })
      toast({ title: 'IBKR disconnected' })
      setStatus({ connected: false })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setDisconnecting(false)
    }
  }

  const isConnected = status?.connected && status?.enabled !== false
  const hasCredentialError = status?.connected && status?.enabled === false

  return (
    <ProtectedLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground mt-1">Connect your broker to auto-import closed trades.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plug className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Interactive Brokers</CardTitle>
                  <CardDescription>Flex Web Service — no TWS/Gateway required</CardDescription>
                </div>
              </div>
              {!loadingStatus && status && (
                <Badge
                  variant={isConnected ? 'default' : 'secondary'}
                  className={isConnected ? 'bg-primary/20 text-primary border-primary/30' : ''}
                >
                  {isConnected ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                  ) : hasCredentialError ? (
                    <><AlertTriangle className="h-3 w-3 mr-1" /> Credentials invalid</>
                  ) : (
                    <><XCircle className="h-3 w-3 mr-1" /> Not connected</>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {loadingStatus ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : isConnected ? (
              <>
                <div className="rounded-md border border-border bg-muted/20 p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      {status?.lastSyncAt
                        ? <>Last synced {format(new Date(status.lastSyncAt), 'MMM d, yyyy HH:mm')} — {status.lastSyncCount ?? 0} trades imported</>
                        : 'Never synced yet'}
                    </span>
                  </div>
                  {status?.lastSyncError && (
                    <div className="flex items-start gap-2 text-destructive">
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>Last sync error: {status.lastSyncError}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSync} disabled={syncing} className="flex-1">
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing…' : 'Sync Now'}
                  </Button>
                  <Button variant="outline" onClick={handleDisconnect} disabled={disconnecting}>
                    <Unplug className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Auto-sync runs every hour in the background. Only closed trades are imported; duplicates are automatically skipped.
                </p>
              </>
            ) : (
              <>
                {hasCredentialError && status?.lastSyncError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Auto-sync paused: {status.lastSyncError}. Update your credentials below to reconnect.</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Flex Token</label>
                    <Input
                      type="password"
                      placeholder="Your IBKR Flex Web Service token"
                      value={ibkrToken}
                      onChange={(e) => { setIbkrToken(e.target.value); resetTestState() }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Flex Query ID</label>
                    <Input
                      placeholder="e.g. 123456"
                      value={ibkrQueryId}
                      onChange={(e) => { setIbkrQueryId(e.target.value); resetTestState() }}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={testing || !ibkrToken || !ibkrQueryId}
                    className="flex-1"
                  >
                    {testing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : testPassed ? (
                      <ShieldCheck className="h-4 w-4 mr-2 text-primary" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-2" />
                    )}
                    {testing ? 'Testing…' : testPassed ? 'Test passed ✓' : 'Test Connection'}
                  </Button>
                  <Button
                    onClick={handleConnect}
                    disabled={connecting || !ibkrToken || !ibkrQueryId}
                    className="flex-1"
                  >
                    <Plug className="h-4 w-4 mr-2" />
                    {connecting ? 'Saving…' : 'Save & Connect'}
                  </Button>
                </div>

                <div className="rounded-md border border-border/50 bg-muted/10 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">How to get your credentials:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Log in to <strong>Account Management</strong> on ibkr.com</li>
                    <li>Go to <strong>Reports → Flex Queries</strong></li>
                    <li>Create a Flex Query that includes <strong>Trades</strong> (execution-level detail)</li>
                    <li>Generate a <strong>Flex Web Service token</strong> from the same page</li>
                    <li>Enter the token and query ID above, then test before saving</li>
                  </ol>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
