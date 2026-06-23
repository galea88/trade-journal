import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react'

const MOCK_TRADES = [
  { asset: 'AAPL', dir: 'long', entry: '182.50', exit: '191.20', qty: '50', entryDate: 'Jun 10, 25', pnl: '+$435.00', status: 'ok' },
  { asset: 'BTC', dir: 'short', entry: '67,800', exit: '65,100', qty: '0.5', entryDate: 'Jun 12, 25', pnl: '+$1,350.00', status: 'ok' },
  { asset: 'TSLA', dir: 'long', entry: '245.00', exit: '', qty: '30', entryDate: 'Jun 15, 25', pnl: '—', status: 'warn' },
  { asset: 'ETH', dir: 'long', entry: '3,420', exit: '3,210', qty: '2', entryDate: 'Jun 18, 25', pnl: '-$420.00', status: 'ok' },
  { asset: 'NVDA', dir: 'short', entry: '???', exit: '875.00', qty: '10', entryDate: 'Jun 20, 25', pnl: '—', status: 'error' },
]

const STATUS_ICON = {
  ok: <CheckCircle2 className="w-4 h-4 text-[#00ff41]" />,
  warn: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
}

export function CsvImportPreview() {
  const [skipped, setSkipped] = useState<number[]>([4])

  const okCount = MOCK_TRADES.filter((t, i) => t.status !== 'error' && !skipped.includes(i)).length
  const errorCount = MOCK_TRADES.filter(t => t.status === 'error').length
  const warnCount = MOCK_TRADES.filter(t => t.status === 'warn').length

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center p-6">
      <div className="w-full max-w-[620px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <button className="text-[#888] hover:text-[#f9f9f9] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-[#f9f9f9] font-bold text-xl">Preview Import</h2>
              <p className="text-[#888] text-sm mt-0.5">
                <span className="font-mono text-[#aaa]">my_trades_june.csv</span> · 5 rows detected
              </p>
            </div>
          </div>
        </div>

        {/* Summary badges */}
        <div className="px-6 py-3 border-b border-[#2a2a2a] flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium bg-[#00ff41]/10 text-[#00ff41] px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {okCount} ready
          </div>
          {warnCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium bg-yellow-400/10 text-yellow-400 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5" />
              {warnCount} open trade
            </div>
          )}
          {errorCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium bg-red-400/10 text-red-400 px-2.5 py-1 rounded-full">
              <XCircle className="w-3.5 h-3.5" />
              {errorCount} invalid — will be skipped
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-2.5 text-[#888] font-medium text-xs uppercase tracking-wider w-8"></th>
                <th className="text-left px-3 py-2.5 text-[#888] font-medium text-xs uppercase tracking-wider">Asset</th>
                <th className="text-left px-3 py-2.5 text-[#888] font-medium text-xs uppercase tracking-wider">Dir</th>
                <th className="text-right px-3 py-2.5 text-[#888] font-medium text-xs uppercase tracking-wider">Entry</th>
                <th className="text-right px-3 py-2.5 text-[#888] font-medium text-xs uppercase tracking-wider">Exit</th>
                <th className="text-right px-3 py-2.5 text-[#888] font-medium text-xs uppercase tracking-wider">Qty</th>
                <th className="text-right px-3 py-2.5 text-[#888] font-medium text-xs uppercase tracking-wider">P&L</th>
                <th className="w-8 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TRADES.map((trade, i) => {
                const isSkipped = skipped.includes(i)
                return (
                  <tr
                    key={i}
                    className={`border-b border-[#222] transition-colors ${
                      isSkipped ? 'opacity-30' : 'hover:bg-[#222]'
                    } ${trade.status === 'error' ? 'bg-red-900/10' : ''}`}
                  >
                    <td className="px-4 py-3">{STATUS_ICON[trade.status as keyof typeof STATUS_ICON]}</td>
                    <td className="px-3 py-3 font-semibold text-[#f9f9f9]">{trade.asset}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        trade.dir === 'long'
                          ? 'bg-[#00ff41]/10 text-[#00ff41]'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {trade.dir.toUpperCase()}
                      </span>
                    </td>
                    <td className={`px-3 py-3 text-right font-mono text-xs ${trade.status === 'error' ? 'text-red-400' : 'text-[#ccc]'}`}>
                      {trade.entry}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-[#ccc]">
                      {trade.exit || <span className="text-[#555]">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-[#ccc]">{trade.qty}</td>
                    <td className={`px-3 py-3 text-right font-mono text-xs font-bold ${
                      trade.pnl.startsWith('+') ? 'text-[#00ff41]' :
                      trade.pnl.startsWith('-') ? 'text-red-400' : 'text-[#555]'
                    }`}>
                      {trade.pnl}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setSkipped(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])}
                        className="text-[#555] hover:text-[#888] transition-colors text-xs"
                        title={isSkipped ? 'Include' : 'Skip'}
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2a2a2a] flex items-center justify-between">
          <p className="text-[#555] text-xs">
            Rows with errors are automatically skipped. Open trades import without an exit price.
          </p>
          <button className="px-4 py-2 rounded text-sm font-bold bg-[#00ff41] text-black hover:bg-[#00e03a] transition-colors ml-4 whitespace-nowrap">
            Import {okCount} Trade{okCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
