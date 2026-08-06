"use client";
import { useState } from "react";
import {
  useListTrades,
  useDeleteTrade,
  getListTradesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload } from "lucide-react";
import { format } from "date-fns";
import { TradeForm } from "@/components/trades/TradeForm";
import { CsvImportDialog } from "@/components/trades/CsvImportDialogEnhanced";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DepositWithdrawalForm } from "@/components/trades/addTransactionForm";

export default function Trades() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");

  const { data: trades, isLoading } = useListTrades(
    {
      assetType:
        assetTypeFilter !== "all" ? (assetTypeFilter as any) : undefined,
    },
    {
      query: {
        queryKey: getListTradesQueryKey({
          assetType:
            assetTypeFilter !== "all" ? (assetTypeFilter as any) : undefined,
        }),
      },
    },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade Log</h1>
          <p className="text-muted-foreground mt-1">Review your execution.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Assets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets</SelectItem>
              <SelectItem value="stock">Stocks</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="forex">Forex</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Import CSV
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Import Trades
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Log New Trade</DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="trade">Trade</TabsTrigger>
                  <TabsTrigger value="deposit-withdrawal">
                    Deposit / Withdrawal
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="trade" className="space-y-4 pt-4">
                  <TradeForm onSuccess={() => setIsCreateOpen(false)} />
                </TabsContent>

                <TabsContent
                  value="deposit-withdrawal"
                  className="space-y-4 pt-4"
                >
                  <DepositWithdrawalForm
                    onSuccess={() => setIsCreateOpen(false)}
                  />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <CsvImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Asset</th>
                  <th className="px-4 py-4">Dir</th>
                  <th className="px-4 py-4 text-right">Entry</th>
                  <th className="px-4 py-4 text-right">Exit</th>
                  <th className="px-4 py-4 text-right">Size</th>
                  <th className="px-4 py-4 text-right">P&L</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Loading trades...
                    </td>
                  </tr>
                ) : trades?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No trades found.
                    </td>
                  </tr>
                ) : (
                  trades?.map((trade) => (
                    <TradeRow key={trade.id} trade={trade} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TradeRow({ trade }: { trade: any }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const deleteTrade = useDeleteTrade();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = () => {
    if (confirm("Delete this trade?")) {
      deleteTrade.mutate(
        { id: trade.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListTradesQueryKey(),
            });
            toast({ title: "Trade deleted" });
          },
        },
      );
    }
  };

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap">
        {format(new Date(trade.entryDate), "MMM d, yy HH:mm")}
      </td>
      <td className="px-4 py-3 font-bold">
        <div className="flex items-center gap-2">
          {trade.asset}
          {trade.source === "ibkr" && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/20">
              IBKR
            </span>
          )}
        </div>
        <span className="block text-[10px] text-muted-foreground font-normal uppercase tracking-wider">
          {trade.assetType}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-0.5 rounded-sm text-xs font-bold uppercase ${trade.direction === "long" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}
        >
          {trade.direction}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        ${Number(trade.entryPrice).toFixed(2)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {trade.exitPrice ? (
          `$${Number(trade.exitPrice).toFixed(2)}`
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{trade.quantity}</td>
      <td
        className={`px-4 py-3 text-right font-bold tabular-nums ${trade.pnl != null ? (trade.pnl >= 0 ? "text-primary" : "text-destructive") : ""}`}
      >
        {trade.pnl != null
          ? (trade.pnl >= 0 ? "+" : "") + "$" + Math.abs(trade.pnl).toFixed(2)
          : "-"}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Trade</DialogTitle>
              </DialogHeader>
              <TradeForm
                initialData={trade}
                onSuccess={() => setIsEditOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            Del
          </Button>
        </div>
      </td>
    </tr>
  );
}
