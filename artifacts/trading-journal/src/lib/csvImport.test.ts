// Force a fixed timezone so normalizeDate's local-time formatting is deterministic across machines/CI.
process.env.TZ = 'UTC'

import {
  normalizeHeader,
  headerMatches,
  parseCsv,
  resolveFieldMapping,
  normalizeDirection,
  normalizeAssetType,
  normalizeDate,
  validateRow,
} from './csvImport'

describe('normalizeHeader', () => {
  it('lowercases and strips non-alphanumeric characters', () => {
    expect(normalizeHeader('Open Rate')).toBe('openrate')
    expect(normalizeHeader('Long / Short')).toBe('longshort')
    expect(normalizeHeader('P&L (USD)')).toBe('plusd')
  })
})

describe('headerMatches', () => {
  it('matches exact normalized headers', () => {
    expect(headerMatches('Open Rate', 'open rate')).toBe(true)
  })

  it('matches when the header contains the alias', () => {
    expect(headerMatches('Open Rate (USD)', 'open rate')).toBe(true)
  })

  it('matches when the alias contains the header', () => {
    expect(headerMatches('Rate', 'open rate')).toBe(true)
  })

  it('returns false for unrelated strings', () => {
    expect(headerMatches('Symbol', 'open rate')).toBe(false)
  })

  it('returns false when either side is empty after normalization', () => {
    expect(headerMatches('', 'open rate')).toBe(false)
    expect(headerMatches('***', 'open rate')).toBe(false)
  })
})

describe('parseCsv', () => {
  it('parses headers and rows', () => {
    const csv = 'asset,direction,quantity\nAAPL,long,10\nMSFT,short,5'
    const result = parseCsv(csv)
    expect(result.headers).toEqual(['asset', 'direction', 'quantity'])
    expect(result.rows).toEqual([
      { asset: 'AAPL', direction: 'long', quantity: '10' },
      { asset: 'MSFT', direction: 'short', quantity: '5' },
    ])
  })

  it('handles quoted fields containing commas', () => {
    const csv = 'asset,notes\nAAPL,"Breakout, high volume"'
    const result = parseCsv(csv)
    expect(result.rows[0].notes).toBe('Breakout, high volume')
  })

  it('unescapes doubled quotes inside quoted fields', () => {
    const csv = 'asset,notes\nAAPL,"He said ""buy""."'
    const result = parseCsv(csv)
    expect(result.rows[0].notes).toBe('He said "buy".')
  })

  it('normalizes CRLF and lone CR line endings', () => {
    const crlf = parseCsv('asset,quantity\r\nAAPL,10\r\nMSFT,5')
    expect(crlf.rows).toHaveLength(2)

    const cr = parseCsv('asset,quantity\rAAPL,10\rMSFT,5')
    expect(cr.rows).toHaveLength(2)
  })

  it('returns empty result when fewer than 2 lines are present', () => {
    expect(parseCsv('')).toEqual({ headers: [], normalizedHeaders: [], rows: [] })
    expect(parseCsv('asset,direction')).toEqual({ headers: [], normalizedHeaders: [], rows: [] })
  })
})

describe('resolveFieldMapping', () => {
  it('infers mappings via column aliases', () => {
    const mapping = resolveFieldMapping(['Action', 'Open Rate', 'Close Rate', 'Amount'])
    expect(mapping.asset).toBe('Action')
    expect(mapping.entryPrice).toBe('Open Rate')
    expect(mapping.exitPrice).toBe('Close Rate')
    expect(mapping.quantity).toBe('Amount')
  })

  it('leaves unmatched fields as null', () => {
    const mapping = resolveFieldMapping(['Action'])
    expect(mapping.notes).toBeNull()
    expect(mapping.stopLoss).toBeNull()
  })
})

describe('normalizeDirection', () => {
  it.each([
    ['buy', 'long'],
    ['Long', 'long'],
    ['b', 'long'],
    ['sell', 'short'],
    ['SHORT', 'short'],
    ['s', 'short'],
  ])('maps %s to %s', (input, expected) => {
    expect(normalizeDirection(input)).toBe(expected)
  })

  it('passes unrecognized values through unchanged (lowercased/trimmed)', () => {
    expect(normalizeDirection('  Sideways  ')).toBe('sideways')
  })
})

describe('normalizeAssetType', () => {
  it.each([
    ['stock', 'stock'],
    ['Equities', 'stock'],
    ['crypto', 'crypto'],
    ['BTC', 'crypto'],
    ['forex', 'forex'],
    ['FX', 'forex'],
  ])('maps %s to %s', (input, expected) => {
    expect(normalizeAssetType(input)).toBe(expected)
  })

  it('defaults unrecognized values to stock', () => {
    expect(normalizeAssetType('option')).toBe('stock')
  })
})

describe('normalizeDate', () => {
  it('parses DD/MM/YYYY', () => {
    expect(normalizeDate('25/12/2025')).toBe('2025-12-25')
  })

  it('parses DD/MM/YYYY HH:mm:ss', () => {
    expect(normalizeDate('25/12/2025 14:30:00')).toBe('2025-12-25')
  })

  it('parses YYYY-MM-DD', () => {
    expect(normalizeDate('2025-06-10')).toBe('2025-06-10')
  })

  it('parses MM/DD/YYYY only when DD/MM/YYYY is not a valid date', () => {
    // 13 can't be a month, so DD/MM/YYYY fails and MM/DD/YYYY (month=12, day=13) is used
    expect(normalizeDate('12/13/2025')).toBe('2025-12-13')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeDate('')).toBe('')
  })

  it('returns empty string for unparseable input', () => {
    expect(normalizeDate('not-a-date')).toBe('')
  })

  it('falls back to Unix-seconds parsing for 10-digit numeric input', () => {
    // 1750000000 seconds -> 2025-06-15T14:13:20Z
    expect(normalizeDate(1750000000)).toBe('2025-06-15')
  })
})

describe('validateRow', () => {
  // Built directly rather than via resolveFieldMapping, since COLUMN_ALIASES only
  // recognizes broker-specific header names (e.g. "open rate"), not the field keys themselves.
  const fieldMap = {
    asset: 'asset',
    assetType: null,
    direction: 'direction',
    entryPrice: 'entryPrice',
    exitPrice: 'exitPrice',
    quantity: 'quantity',
    entryDate: 'entryDate',
    exitDate: null,
    fees: 'fees',
    stopLoss: null,
    takeProfit: null,
    notes: null,
  } as const

  it('returns status ok with correct pnl for a long trade', () => {
    const row = validateRow(
      { asset: 'AAPL', direction: 'long', entryprice: '100', exitprice: '110', quantity: '10', entrydate: '2025-06-10', fees: '5' },
      fieldMap,
    )
    expect(row.status).toBe('ok')
    expect(row.pnl).toBeCloseTo((110 - 100) * 10 - 5)
    expect(row.errors).toEqual([])
  })

  it('returns status ok with correct pnl for a short trade', () => {
    const row = validateRow(
      { asset: 'AAPL', direction: 'short', entryprice: '100', exitprice: '90', quantity: '10', entrydate: '2025-06-10', fees: '5' },
      fieldMap,
    )
    expect(row.status).toBe('ok')
    expect(row.pnl).toBeCloseTo((100 - 90) * 10 - 5)
  })

  it('returns status warn when exitPrice is missing (open trade)', () => {
    const row = validateRow(
      { asset: 'AAPL', direction: 'long', entryprice: '100', exitprice: '', quantity: '10', entrydate: '2025-06-10', fees: '' },
      fieldMap,
    )
    expect(row.status).toBe('warn')
    expect(row.pnl).toBeNull()
  })

  it('returns status error when required fields are missing or invalid', () => {
    const row = validateRow(
      { asset: '', direction: 'sideways', entryprice: 'abc', exitprice: '', quantity: '', entrydate: '', fees: '' },
      fieldMap,
    )
    expect(row.status).toBe('error')
    expect(row.errors).toEqual(
      expect.arrayContaining([
        'asset is required',
        'direction "sideways" must be long or short',
        'invalid entryPrice',
        'invalid quantity',
        'invalid entryDate',
      ]),
    )
    expect(row.pnl).toBeNull()
  })

  it('strips $ and , from numeric fields', () => {
    const row = validateRow(
      { asset: 'AAPL', direction: 'long', entryprice: '$1,200.50', exitprice: '$1,300.00', quantity: '10', entrydate: '2025-06-10', fees: '$5.00' },
      fieldMap,
    )
    expect(row.entryPrice).toBe('1200.50')
    expect(row.exitPrice).toBe('1300.00')
    expect(row.status).toBe('ok')
  })
})
