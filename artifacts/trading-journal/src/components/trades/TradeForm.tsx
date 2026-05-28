'use client'
import { useState } from 'react'
import {
  useCreateTrade,
  useUpdateTrade,
  useListStrategies,
  getListTradesQueryKey,
  getListStrategiesQueryKey
} from '@workspace/api-client-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface TradeFormProps {
  initialData?: any
  onSuccess: () => void
}

export function TradeForm({ initialData, onSuccess }: TradeFormProps) {
  const [formData, setFormData] = useState({
    asset: initialData?.asset || '',
    assetType: initialData?.assetType || 'stock',
    direction: initialData?.direction || 'long',
    entryPrice: initialData?.entryPrice || '',
    exitPrice: initialData?.exitPrice || '',
    quantity: initialData?.quantity || '',
    fees: initialData?.fees || '0',
    entryDate: initialData?.entryDate
      ? new Date(initialData.entryDate).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    exitDate: initialData?.exitDate
      ? new Date(initialData.exitDate).toISOString().slice(0, 16)
      : '',
    strategyId: initialData?.strategyId?.toString() || 'none',
    notes: initialData?.notes || ''
  })

  const { data: strategies } = useListStrategies({ query: { queryKey: getListStrategiesQueryKey() } })
  const createTrade = useCreateTrade()
  const updateTrade = useUpdateTrade()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...formData,
      strategyId: formData.strategyId !== 'none' ? parseInt(formData.strategyId) : null,
      exitPrice: formData.exitPrice ? formData.exitPrice : null,
      exitDate: formData.exitDate ? new Date(formData.exitDate).toISOString() : null,
      entryDate: new Date(formData.entryDate).toISOString()
    }

    if (initialData) {
      updateTrade.mutate({ id: initialData.id, data: payload as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() })
          toast({ title: 'Trade updated' })
          onSuccess()
        }
      })
    } else {
      createTrade.mutate({ data: payload as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() })
          toast({ title: 'Trade logged' })
          onSuccess()
        }
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium">Asset</label>
          <Input
            required
            value={formData.asset}
            onChange={e => setFormData(f => ({ ...f, asset: e.target.value.toUpperCase() }))}
            placeholder="AAPL"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">Type</label>
          <Select value={formData.assetType} onValueChange={v => setFormData(f => ({ ...f, assetType: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="forex">Forex</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">Direction</label>
          <Select value={formData.direction} onValueChange={v => setFormData(f => ({ ...f, direction: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">Strategy</label>
          <Select value={formData.strategyId} onValueChange={v => setFormData(f => ({ ...f, strategyId: v }))}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {strategies?.map(s => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium">Entry Price</label>
          <Input type="number" step="any" required value={formData.entryPrice} onChange={e => setFormData(f => ({ ...f, entryPrice: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">Size</label>
          <Input type="number" step="any" required value={formData.quantity} onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">Exit Price</label>
          <Input type="number" step="any" value={formData.exitPrice} onChange={e => setFormData(f => ({ ...f, exitPrice: e.target.value }))} placeholder="Open" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">Fees</label>
          <Input type="number" step="any" required value={formData.fees} onChange={e => setFormData(f => ({ ...f, fees: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium">Entry Date</label>
          <Input type="datetime-local" required value={formData.entryDate} onChange={e => setFormData(f => ({ ...f, entryDate: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">Exit Date</label>
          <Input type="datetime-local" value={formData.exitDate} onChange={e => setFormData(f => ({ ...f, exitDate: e.target.value }))} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium">Notes</label>
        <Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="What went well? Mistakes?" rows={3} />
      </div>

      <div className="flex justify-end pt-4 gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={createTrade.isPending || updateTrade.isPending}>
          {initialData ? 'Save Changes' : 'Log Trade'}
        </Button>
      </div>
    </form>
  )
}
