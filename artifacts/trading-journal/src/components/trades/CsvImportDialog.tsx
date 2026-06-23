'use client'
import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getListTradesQueryKey } from '@workspace/api-client-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Upload, FileText, X, CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react'

// ---------------------------------------------------------------------------
// CSV parser — handles quoted fields and trims whitespace
// ---------------------------------------------------------------------------
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  function splitLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ''))
  const rows = lines.slice(1).map(line => {
    const vals = splitLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })
  return { headers, rows }
}

// ---------------------------------------------------------------------------
// Column aliases — tolerant of common broker export formats
// ---------------------------------------------------------------------------
const ALIASES: Record<string, string[]> = {
  asset:       ['asset', 'symbol', 'ticker', 'instrument'],
  assetType:   ['assettype', 'asset_type', 'type', 'market'],
  direction:   ['direction', 'side', 'type', 'action'],
  entryPrice:  ['entryprice', 'entry_price', 'entry', 'open', 'openprice'],
  exitPrice:   ['exitprice', 'exit_price', 'exit', 'close', 'closeprice'],
  quantity:    ['quantity', 'qty', 'size', 'amount', 'shares', 'contracts'],
  entryDate:   ['entrydate', 'entry_date', 'opendate', 'open_date', 'date', 'opentime'],
  exitDate:    ['exitdate', 'exit_date', 'closedate', 'close_date', 'closetime'],
  fees:        ['fees', 'commission', 'cost', 'fee'],
  stopLoss:    ['stoploss', 'stop_loss', 'sl'],
  takeProfit:  ['takeprofit', 'take_profit', 'tp'],
  notes:       ['notes', 'comment', 'comments', 'remarks'],
}

function resolveHeaders(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const [field, aliases] of Object.entries(ALIASES)) {
    const match = headers.find(h => aliases.includes(h))
    if (match) map[field] = match
  }
  return map
}

function normalizeDirection(val: string): string {
  const v = val.toLowerCase().trim()
  if (['buy', 'long', 'b'].includes(v)) return 'long'
  if (['sell', 'short', 's'].includes(v)) return 'short'
  return v
}

function normalizeAssetType(val: string): string {
  const v = val.toLowerCase().trim()
  if (['stock', 'stocks', 'equity', 'equities'].includes(v)) return 'stock'
  if (['crypto', 'cryptocurrency', 'btc', 'eth'].includes(v)) return 'crypto'
  if (['forex', 'fx', 'currency'].includes(v)) return 'forex'
  return 'stock'
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RowStatus = 'ok' | 'warn' | 'error'

interface ParsedRow {
  asset: string
  assetType: string
  direction: string
  entryPrice: string
  exitPrice: string
  quantity: string
  entryDate: string
  exitDate: string
  fees: string
  stopLoss: string
  takeProfit: string
  notes: string
  status: RowStatus
  errors: string[]
  pnl: number | null
}

function validateRow(raw: Record<string, string>, fieldMap: Record<string, string>): ParsedRow {
  const get = (field: string) => (raw[fieldMap[field]] ?? '').trim()

  const asset = get('asset')
  const direction = normalizeDirection(get('direction'))
  const entryPrice = get('entryPrice').replace(/[,$]/g, '')
  const exitPrice = get('exitPrice').replace(/[,$]/g, '')
  const quantity = get('quantity').replace(/,/g, '')
  const entryDate = get('entryDate')
  const exitDate = get('exitDate')
  const assetType = normalizeAssetType(get('assetType') || 'stock')
  const fees = get('fees').replace(/[,$]/g, '') || '0'
  const stopLoss = get('stopLoss').replace(/[,$]/g, '')
  const takeProfit = get('takeProfit').replace(/[,$]/g, '')
  const notes = get('notes')

  const errors: string[] = []
  if (!asset) errors.push('asset is required')
  if (!['long', 'short'].includes(direction)) errors.push(`direction "${direction}" must be long or short`)
  if (!entryPrice || isNaN(parseFloat(entryPrice))) errors.push('invalid entryPrice')
  if (!quantity || isNaN(parseFloat(quantity))) errors.push('invalid quantity')
  if (!entryDate || isNaN(new Date(entryDate).getTime())) errors.push('invalid entryDate')
  if (exitPrice && isNaN(parseFloat(exitPrice))) errors.push('invalid exitPrice')

  let status: RowStatus = 'ok'
  if (errors.length > 0) status = 'error'
  else if (!exitPrice) status = 'warn'

  let pnl: number | null = null
  if (status !== 'error' && exitPrice) {
    const entry = parseFloat(entryPrice)
    const exit = parseFloat(exitPrice)
    const qty = parseFloat(quantity)
    const fee = parseFloat(fees) || 0
    pnl = direction === 'long' ? (exit - entry) * qty - fee : (entry - exit) * qty - fee
  }

  return { asset, assetType, direction, entryPrice, exitPrice, quantity, entryDate, exitDate,
    fees, stopLoss, takeProfit, notes, status, errors, pnl }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  const [parseError, setParseError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const reset = useCallback(() => {
    setStep('upload')
    setFileName(null)
    setRows([])
    setSkipped(new Set())
    setParseError(null)
  }, [])

  const handleClose = useCallback((val: boolean) => {
    if (!val) reset()
    onOpenChange(val)
  }, [reset, onOpenChange])

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a .csv file.')
      return
    }
    setParseError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows: rawRows } = parseCsv(text)
      if (headers.length === 0) {
        setParseError('Could not parse CSV — file appears empty or malformed.')
        return
      }
      const fieldMap = resolveHeaders(headers)
      if (!fieldMap.asset || !fieldMap.entryPrice || !fieldMap.quantity) {
        setParseError('Missing required columns: asset, entryPrice (or entry/open), quantity (or qty/size).')
        return
      }
      const parsed = rawRows.map(r => validateRow(r, fieldMap))
      setRows(parsed)
      setSkipped(new Set(parsed.map((r, i) => r.status === 'error' ? i : -1).filter(i => i >= 0)))
      setFileName(file.name)
      setStep('preview')
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const importMutation = useMutation({
    mutationFn: async (trades: ParsedRow[]) => {
      const payload = trades.map(r => ({
        asset: r.asset,
        assetType: r.assetType,
        direction: r.direction,
        entryPrice: r.entryPrice,
        exitPrice: r.exitPrice || null,
        quantity: r.quantity,
        fees: r.fees || '0',
        entryDate: r.entryDate,
        exitDate: r.exitDate || null,
        stopLoss: r.stopLoss || null,
        takeProfit: r.takeProfit || null,
        notes: r.notes || null,
      }))
      const res = await fetch('/api/trades/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades: payload }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }
      return res.json() as Promise<{ imported: number; skipped: number }>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() })
      toast({ title: `Imported ${data.imported} trade${data.imported !== 1 ? 's' : ''}` +
        (data.skipped > 0 ? ` (${data.skipped} skipped)` : '') })
      handleClose(false)
    },
    onError: (err: Error) => {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' })
    },
  })

  const readyRows = rows.filter((_, i) => !skipped.has(i))
  const okCount = readyRows.length
  const errorCount = rows.filter(r => r.status === 'error').length
  const warnCount = rows.filter(r => r.status === 'warn').length

  const toggleSkip = (i: number) => {
    setSkipped(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            {step === 'preview' && (
              <button onClick={() => setStep('upload')} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <DialogTitle>{step === 'upload' ? 'Import Trades from CSV' : 'Preview Import'}</DialogTitle>
              {step === 'preview' && fileName && (
                <p className="text-muted-foreground text-sm mt-0.5">
                  <span className="font-mono text-foreground/70">{fileName}</span> · {rows.length} row{rows.length !== 1 ? 's' : ''} detected
                </p>
              )}
              {step === 'upload' && (
                <p className="text-muted-foreground text-sm mt-0.5">Upload a CSV file to bulk-import your trade history.</p>
              )}
            </div>
          </div>
        </DialogHeader>

        {step === 'upload' ? (
          <>
            <div className="px-6 py-6 space-y-5">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-md transition-colors cursor-pointer p-10 flex flex-col items-center gap-3 text-center ${
                  dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-muted/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
                />
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Drop your CSV here, or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">Supports .csv files up to 10 MB</p>
                </div>
              </div>

              {/* Expected columns reference */}
              <div className="rounded-md bg-muted/40 border border-border p-4">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3">Expected columns</p>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
                  {([
                    ['asset', true], ['direction', true], ['entryDate', true],
                    ['entryPrice', true], ['quantity', true], ['exitPrice', false],
                    ['exitDate', false], ['stopLoss', false], ['takeProfit', false],
                    ['fees', false], ['assetType', false], ['notes', false],
                  ] as [string, boolean][]).map(([col, req]) => (
                    <div key={col} className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${req ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                      <span className="text-xs font-mono text-foreground/80">{col}</span>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground/60 text-xs mt-3">
                  Column names are flexible — common aliases (symbol, side, qty, open/close, etc.) are recognised automatically.
                </p>
              </div>

              {parseError && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/40 p-3">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-destructive text-sm">{parseError}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
            </div>
          </>
        ) : (
          <>
            {/* Summary badges */}
            <div className="px-6 py-3 border-b border-border flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> {okCount} ready
              </div>
              {warnCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" /> {warnCount} open trade{warnCount !== 1 ? 's' : ''}
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium bg-destructive/10 text-destructive px-2.5 py-1 rounded-full">
                  <XCircle className="w-3.5 h-3.5" /> {errorCount} invalid — skipped
                </div>
              )}
            </div>

            {/* Preview table */}
            <div className="overflow-auto max-h-[380px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border">
                    <th className="w-8 px-3 py-2.5" />
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wider">Asset</th>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wider">Dir</th>
                    <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wider">Entry</th>
                    <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wider">Exit</th>
                    <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wider">Qty</th>
                    <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wider">P&L</th>
                    <th className="w-8 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const isSkipped = skipped.has(i)
                    return (
                      <tr
                        key={i}
                        title={row.errors.length ? row.errors.join(', ') : undefined}
                        className={`border-b border-border/50 transition-colors ${
                          isSkipped ? 'opacity-30' : row.status === 'error' ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/40'
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          {row.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                          {row.status === 'warn' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                          {row.status === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-foreground">{row.asset}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            row.direction === 'long' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                          }`}>
                            {row.direction.toUpperCase()}
                          </span>
                        </td>
                        <td className={`px-3 py-2.5 text-right font-mono text-xs ${row.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {row.entryPrice || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">
                          {row.exitPrice || <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">{row.quantity}</td>
                        <td className={`px-3 py-2.5 text-right font-mono text-xs font-bold ${
                          row.pnl == null ? 'text-muted-foreground/40' :
                          row.pnl >= 0 ? 'text-primary' : 'text-destructive'
                        }`}>
                          {row.pnl == null ? '—' : (row.pnl >= 0 ? '+' : '') + row.pnl.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => toggleSkip(i)}
                            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors text-base leading-none"
                            title={isSkipped ? 'Include row' : 'Skip row'}
                          >
                            {isSkipped ? '+' : '×'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4">
              <p className="text-muted-foreground/60 text-xs">
                Rows with errors are skipped automatically. Open trades import without an exit price.
              </p>
              <Button
                disabled={okCount === 0 || importMutation.isPending}
                onClick={() => importMutation.mutate(readyRows)}
              >
                {importMutation.isPending ? 'Importing…' : `Import ${okCount} Trade${okCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
