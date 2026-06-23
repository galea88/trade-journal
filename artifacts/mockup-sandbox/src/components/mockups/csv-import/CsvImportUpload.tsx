import { useState } from 'react'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'

export function CsvImportUpload() {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center p-6">
      <div className="w-full max-w-[520px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#2a2a2a]">
          <h2 className="text-[#f9f9f9] font-bold text-xl">Import Trades from CSV</h2>
          <p className="text-[#888] text-sm mt-1">Upload a CSV file to bulk-import your trade history.</p>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Drop Zone */}
          <div
            onMouseEnter={() => setDragging(true)}
            onMouseLeave={() => setDragging(false)}
            className={`relative border-2 border-dashed rounded-md transition-colors cursor-pointer ${
              dragging
                ? 'border-[#00ff41] bg-[#00ff41]/5'
                : file
                ? 'border-[#00ff41]/40 bg-[#00ff41]/5'
                : 'border-[#2a2a2a] hover:border-[#444]'
            }`}
            style={{ padding: '2rem 1.5rem' }}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              {file ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#00ff41]/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#00ff41]" />
                  </div>
                  <div>
                    <p className="text-[#f9f9f9] font-medium text-sm">{file}</p>
                    <p className="text-[#888] text-xs mt-0.5">CSV · 3 trades detected</p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#f9f9f9] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                    <Upload className="w-6 h-6 text-[#888]" />
                  </div>
                  <div>
                    <p className="text-[#f9f9f9] text-sm font-medium">
                      Drop your CSV here, or{' '}
                      <span
                        className="text-[#00ff41] cursor-pointer hover:underline"
                        onClick={() => setFile('my_trades_june.csv')}
                      >
                        browse
                      </span>
                    </p>
                    <p className="text-[#888] text-xs mt-1">Supports .csv files up to 10 MB</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Expected columns */}
          <div className="rounded-md bg-[#111] border border-[#2a2a2a] p-4">
            <p className="text-[#888] text-xs font-semibold uppercase tracking-wider mb-3">Expected columns</p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
              {[
                ['asset', 'required'],
                ['direction', 'required'],
                ['entryDate', 'required'],
                ['entryPrice', 'required'],
                ['quantity', 'required'],
                ['exitPrice', 'optional'],
                ['exitDate', 'optional'],
                ['stopLoss', 'optional'],
                ['takeProfit', 'optional'],
                ['fees', 'optional'],
                ['assetType', 'optional'],
                ['notes', 'optional'],
              ].map(([col, req]) => (
                <div key={col} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${req === 'required' ? 'bg-[#00ff41]' : 'bg-[#444]'}`} />
                  <span className="text-xs font-mono text-[#ccc]">{col}</span>
                </div>
              ))}
            </div>
            <p className="text-[#555] text-xs mt-3">
              <a href="#" className="text-[#00ff41] hover:underline">Download template</a> to get started.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-900/20 border border-red-800/40 p-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2a2a2a] flex items-center justify-between">
          <button className="text-sm text-[#888] hover:text-[#f9f9f9] transition-colors">Cancel</button>
          <button
            disabled={!file}
            className={`px-4 py-2 rounded text-sm font-bold transition-colors ${
              file
                ? 'bg-[#00ff41] text-black hover:bg-[#00e03a] cursor-pointer'
                : 'bg-[#2a2a2a] text-[#555] cursor-not-allowed'
            }`}
          >
            Preview Trades →
          </button>
        </div>
      </div>
    </div>
  )
}
