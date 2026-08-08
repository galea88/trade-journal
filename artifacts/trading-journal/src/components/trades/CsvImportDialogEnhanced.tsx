'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bulkTradeImport, getBrokers, getListTradesQueryKey, type Broker } from '@workspace/api-client-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, ArrowLeft, CheckCircle2, Upload, XCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  TRADE_FIELDS,
  parseCsv,
  resolveFieldMapping,
  validateRow,
  type TradeFieldKey,
  type ParsedRow,
} from '@/lib/csvImport'

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TEMPLATE_HEADERS = ['asset', 'assetType', 'direction', 'entryDate', 'entryPrice', 'quantity', 'exitDate', 'exitPrice', 'fees', 'stopLoss', 'takeProfit', 'notes']
const TEMPLATE_ROWS = [
  ['AAPL', 'stock', 'long', '2025-06-10T09:30:00', '182.50', '50', '2025-06-15T14:00:00', '191.20', '4.95', '179.00', '195.00', 'Breakout setup'],
  ['BTC', 'crypto', 'short', '2025-06-12T13:00:00', '67800', '0.5', '2025-06-13T10:00:00', '65100', '0', '69000', '63000', ''],
  ['EURUSD', 'forex', 'long', '2025-06-18T08:00:00', '1.0850', '10000', '', '', '1.50', '1.0800', '1.0950', ''],
]

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS, ...TEMPLATE_ROWS].map((row) => row.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'trades_template.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [sourceHeaders, setSourceHeaders] = useState<string[]>([])
  const [sourceRows, setSourceRows] = useState<Record<string, string>[]>([])
  const [fieldMapping, setFieldMapping] = useState<Record<TradeFieldKey, string | null>>({
    asset: null,
    assetType: null,
    direction: null,
    entryPrice: null,
    exitPrice: null,
    quantity: null,
    entryDate: null,
    exitDate: null,
    fees: null,
    stopLoss: null,
    takeProfit: null,
    notes: null,
  })
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  const [parseError, setParseError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const reset = useCallback(() => {
    setStep('upload')
    setFileName(null)
    setRows([])
    setSourceHeaders([])
    setSourceRows([])
    setFieldMapping({
      asset: null,
      assetType: null,
      direction: null,
      entryPrice: null,
      exitPrice: null,
      quantity: null,
      entryDate: null,
      exitDate: null,
      fees: null,
      stopLoss: null,
      takeProfit: null,
      notes: null,
    })
    setSkipped(new Set())
    setParseError(null)
  }, [])

  const handleClose = useCallback((value: boolean) => {
    if (!value) reset()
    onOpenChange(value)
  }, [onOpenChange, reset])

  const buildRows = useCallback((rawRows: Record<string, string>[], mapping: Record<TradeFieldKey, string | null>) => {
    const parsed = rawRows.map((row) => validateRow(row, mapping))
    setRows(parsed)
    setSkipped(new Set(parsed.map((row, index) => (row.status === 'error' ? index : -1)).filter((index) => index >= 0)))
  }, [])

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a .csv file.')
      return
    }

    setParseError(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const { headers, rows: rawRows } = parseCsv(text)
      if (headers.length === 0) {
        setParseError('Could not parse CSV — file appears empty or malformed.')
        return
      }

      const inferredMapping = resolveFieldMapping(headers)
      setSourceHeaders(headers)
      setSourceRows(rawRows)
      setFieldMapping(inferredMapping)
      setFileName(file.name)
      setStep('map')
      buildRows(rawRows, inferredMapping)
    }
    reader.readAsText(file)
  }, [buildRows])

  useEffect(() => {
    if (sourceRows.length === 0) return
    buildRows(sourceRows, fieldMapping)
  }, [buildRows, fieldMapping, sourceRows])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const updateFieldMapping = (field: TradeFieldKey, value: string) => {
    setFieldMapping((previous) => ({ ...previous, [field]: value === '__ignore__' ? null : value }))
  }

  const importMutation = useMutation({
    mutationFn: async (trades: ParsedRow[]) => {
      const payload = trades.map((row) => ({
        asset: row.asset,
        assetType: row.assetType,
        direction: row.direction,
        entryPrice: row.entryPrice,
        exitPrice: row.exitPrice || null,
        quantity: row.quantity,
        fees: row.fees || '0',
        entryDate: row.entryDate,
        exitDate: row.exitDate || null,
        stopLoss: row.stopLoss || null,
        takeProfit: row.takeProfit || null,
        notes: row.notes || null,
      }))

    const response = await bulkTradeImport({trades: payload})  
    return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() })
      toast({
        title: `Imported ${data.imported} trade${data.imported !== 1 ? 's' : ''}` + (data.skipped > 0 ? ` (${data.skipped} skipped)` : ''),
      })
      handleClose(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Import failed', description: error.message, variant: 'destructive' })
    },
  })

  const readyRows = rows.filter((_, index) => !skipped.has(index))
  const okCount = readyRows.length
  const errorCount = rows.filter((row) => row.status === 'error').length
  const warnCount = rows.filter((row) => row.status === 'warn').length
  const requiredMapped = ['asset', 'direction', 'entryPrice', 'quantity', 'entryDate'].every((field) => Boolean(fieldMapping[field as TradeFieldKey]))

  const toggleSkip = (index: number) => {
    setSkipped((previous) => {
      const next = new Set(previous)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            {(step === 'map' || step === 'preview') && (
              <button onClick={() => setStep(step === 'preview' ? 'map' : 'upload')} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <DialogTitle>{step === 'upload' ? 'Import Trades from CSV' : step === 'map' ? 'Map CSV Columns' : 'Preview Import'}</DialogTitle>
              {step === 'preview' && fileName && (
                <p className="text-muted-foreground text-sm mt-0.5">
                  <span className="font-mono text-foreground/70">{fileName}</span> · {rows.length} row{rows.length !== 1 ? 's' : ''} detected
                </p>
              )}
              {step === 'upload' && (
                <p className="text-muted-foreground text-sm mt-0.5">Upload a CSV file to bulk-import your trade history.</p>
              )}
              {step === 'map' && (
                <p className="text-muted-foreground text-sm mt-0.5">Choose which header in your file should map to each trade field.</p>
              )}
            </div>
          </div>
        </DialogHeader>

        {step === 'upload' ? (
          <>
            <div className="px-6 py-6 space-y-5">
              <div
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-md transition-colors cursor-pointer p-10 flex flex-col items-center gap-3 text-center ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-muted/30'}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) processFile(file)
                  }}
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

              <div className="rounded-md bg-muted/40 border border-border p-4">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3">Expected columns</p>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
                  {([
                    ['asset', true], ['direction', true], ['entryDate', true],
                    ['entryPrice', true], ['quantity', true], ['exitPrice', false],
                    ['exitDate', false], ['stopLoss', false], ['takeProfit', false],
                    ['fees', false], ['assetType', false], ['notes', false],
                  ] as [string, boolean][]).map(([column, required]) => (
                    <div key={column} className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${required ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                      <span className="text-xs font-mono text-foreground/80">{column}</span>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground/60 text-xs mt-3">
                  Column names are flexible — common aliases are recognised automatically.{' '}
                  <button type="button" onClick={downloadTemplate} className="text-primary hover:underline">
                    Download template
                  </button>
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
        ) : step === 'map' ? (
          <>
            <div className="px-6 py-5 border-b border-border">
              <div className="rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Select the header from your CSV that should populate each trade field. Optional fields can be left unmapped.
              </div>
            </div>
            <div className="px-6 py-5 space-y-3 max-h-[420px] overflow-auto">
              {sourceHeaders.length === 0 ? (
                <div className="text-sm text-muted-foreground">No columns detected yet.</div>
              ) : (
                TRADE_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      {field.label}
                      {field.required && <span className="text-[10px] uppercase tracking-wider text-primary">Required</span>}
                    </label>
                    <Select value={fieldMapping[field.key] ?? '__ignore__'} onValueChange={(value) => updateFieldMapping(field.key, value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ignore__">Ignore</SelectItem>
                        {sourceHeaders.map((header) => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4">
              <p className="text-muted-foreground/60 text-xs">Suggested mappings are pre-filled for common Etoro and IBKR exports.</p>
              <Button onClick={() => setStep('preview')} disabled={!requiredMapped}>
                Continue to preview
              </Button>
            </div>
          </>
        ) : (
          <>
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
                  {rows.map((row, index) => {
                    const isSkipped = skipped.has(index)
                    return (
                      <tr
                        key={index}
                        title={row.errors.length ? row.errors.join(', ') : undefined}
                        className={`border-b border-border/50 transition-colors ${isSkipped ? 'opacity-30' : row.status === 'error' ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/40'}`}
                      >
                        <td className="px-3 py-2.5">
                          {row.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                          {row.status === 'warn' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                          {row.status === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-foreground">{row.asset}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${row.direction === 'long' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
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
                        <td className={`px-3 py-2.5 text-right font-mono text-xs font-bold ${row.pnl == null ? 'text-muted-foreground/40' : row.pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {row.pnl == null ? '—' : (row.pnl >= 0 ? '+' : '') + row.pnl.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => toggleSkip(index)} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors text-base leading-none" title={isSkipped ? 'Include row' : 'Skip row'}>
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
              <p className="text-muted-foreground/60 text-xs">Rows with errors are skipped automatically. Open trades import without an exit price.</p>
              <Button disabled={okCount === 0 || importMutation.isPending} onClick={() => importMutation.mutate(readyRows)}>
                {importMutation.isPending ? 'Importing…' : `Import ${okCount} Trade${okCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
