import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

export type TradeFieldKey = 'asset' | 'assetType' | 'direction' | 'entryPrice' | 'exitPrice' | 'quantity' | 'entryDate' | 'exitDate' | 'fees' | 'stopLoss' | 'takeProfit' | 'notes'

export interface TradeFieldDefinition {
  key: TradeFieldKey
  label: string
  required: boolean
}

export type RowStatus = 'ok' | 'warn' | 'error'

export interface ParsedRow {
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

export const TRADE_FIELDS: TradeFieldDefinition[] = [
  { key: 'asset', label: 'Asset', required: true },
  { key: 'assetType', label: 'Asset type', required: false },
  { key: 'direction', label: 'Direction', required: true },
  { key: 'entryPrice', label: 'Entry price', required: true },
  { key: 'exitPrice', label: 'Exit price', required: false },
  { key: 'quantity', label: 'Quantity', required: true },
  { key: 'entryDate', label: 'Entry date', required: true },
  { key: 'exitDate', label: 'Exit date', required: false },
  { key: 'fees', label: 'Fees', required: false },
  { key: 'stopLoss', label: 'Stop loss', required: false },
  { key: 'takeProfit', label: 'Take profit', required: false },
  { key: 'notes', label: 'Notes', required: false },
]

export const COLUMN_ALIASES: Partial<Record<TradeFieldKey, string[]>> = {
    asset: ['action'],
    assetType: ['type'],
    direction: ['Long / Short'],
    entryPrice: ['open rate'],
    exitPrice: ['close rate'],
    quantity: ['amount'],
    entryDate: ['open date'],
    exitDate: ['close date'],
    fees: ['spread fees'],
    stopLoss: ['stop loss rate'],
    takeProfit: ['take profit rate'],
    notes: ['notes', 'comment', 'comments', 'remarks']
}

export function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function headerMatches(headerValue: string, alias: string): boolean {
  const normalizedHeader = normalizeHeader(headerValue)
  const normalizedAlias = normalizeHeader(alias)
  if (!normalizedHeader || !normalizedAlias) return false
  return normalizedHeader === normalizedAlias || normalizedHeader.includes(normalizedAlias) || normalizedAlias.includes(normalizedHeader)
}

export function parseCsv(text: string): { headers: string[]; normalizedHeaders: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((line) => line.trim())
  if (lines.length < 2) return { headers: [], normalizedHeaders: [], rows: [] }

  function splitLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let index = 0; index < line.length; index += 1) {
      const ch = line[index]
      if (ch === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"'
          index += 1
        } else {
          inQuotes = !inQuotes
        }
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

  const headers = splitLine(lines[0])
  const normalizedHeaders = headers.map((header) => normalizeHeader(header))
  const rows = lines.slice(1).map((line) => {
    const values = splitLine(line)
    const row: Record<string, string> = {}
    normalizedHeaders.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    return row
  })

  return { headers, normalizedHeaders, rows }
}

export function resolveFieldMapping(headers: string[], brokerName?: string): Record<TradeFieldKey, string | null> {
  const map: Record<TradeFieldKey, string | null> = {
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
  }

  for (const field of TRADE_FIELDS) {
    const aliases = COLUMN_ALIASES[field.key] ?? []
    const match = headers.find((header) => aliases.some((alias) => headerMatches(header, alias)))
    if (match) map[field.key] = match
  }

  return map
}

export function normalizeDirection(value: string): string {
  const normalized = value.toLowerCase().trim()
  if (['buy', 'long', 'b'].includes(normalized)) return 'long'
  if (['sell', 'short', 's'].includes(normalized)) return 'short'
  return normalized
}

export function normalizeAssetType(value: string): string {
  const normalized = value.toLowerCase().trim()
  if (['stock', 'stocks', 'equity', 'equities'].includes(normalized)) return 'stock'
  if (['crypto', 'cryptocurrency', 'btc', 'eth'].includes(normalized)) return 'crypto'
  if (['forex', 'fx', 'currency'].includes(normalized)) return 'forex'
  return 'stock'
}

export function normalizeDate(value: string | number): string {
  if (!value) {
     return '';
    }

  const targetFormats = [
    'DD/MM/YYYY HH:mm:ss',
    'DD/MM/YYYY',
    'YYYY-MM-DD',
    'MM/DD/YYYY'
  ];

  const parsed = dayjs(value, targetFormats, true);

  //Fallback if it is a seconds-based Unix timestamp (10 digits) instead of milliseconds
  if (!parsed.isValid() && typeof value === 'number' && String(value).length === 10) {
    return dayjs.unix(value).format('YYYY-MM-DD');
  }

  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
}

export function validateRow(raw: Record<string, string>, fieldMap: Record<TradeFieldKey, string | null>): ParsedRow {
  const get = (field: TradeFieldKey) => {
    const sourceHeader = fieldMap[field]
    if (!sourceHeader) return ''
    return (raw[normalizeHeader(sourceHeader)] ?? '').trim()
  }

  const asset = get('asset')
  const direction = normalizeDirection(get('direction'))
  const entryPrice = get('entryPrice').replace(/[,$]/g, '')
  const exitPrice = get('exitPrice').replace(/[,$]/g, '')
  const quantity = get('quantity').replace(/,/g, '')
  const entryDate = normalizeDate(get('entryDate'))
  const exitDate = normalizeDate(get('exitDate'))
  const assetType = normalizeAssetType(get('assetType') || 'stock')
  const fees = get('fees').replace(/[,$]/g, '') || '0'
  const stopLoss = get('stopLoss').replace(/[,$]/g, '')
  const takeProfit = get('takeProfit').replace(/[,$]/g, '')
  const notes = get('notes')

  const errors: string[] = []
  if (!asset) errors.push('asset is required')
  if (!['long', 'short'].includes(direction)) errors.push(`direction "${direction}" must be long or short`)
  if (!entryPrice || Number.isNaN(parseFloat(entryPrice))) errors.push('invalid entryPrice')
  if (!quantity || Number.isNaN(parseFloat(quantity))) errors.push('invalid quantity')
  if (!entryDate || Number.isNaN(new Date(entryDate).getTime())) errors.push('invalid entryDate')
  if (exitPrice && Number.isNaN(parseFloat(exitPrice))) errors.push('invalid exitPrice')

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

  return {
    asset,
    assetType,
    direction,
    entryPrice,
    exitPrice,
    quantity,
    entryDate,
    exitDate,
    fees,
    stopLoss,
    takeProfit,
    notes,
    status,
    errors,
    pnl,
  }
}
