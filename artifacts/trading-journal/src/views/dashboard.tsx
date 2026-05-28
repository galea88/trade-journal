import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Activity, Target, Hash, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const totalTrades = summary?.totalTrades ?? 0;
  const totalPnl = summary?.totalPnl ?? 0;
  const winRate = summary?.winRate ?? 0;
  const closedTrades = summary?.closedTrades ?? 0;
  const openTrades = summary?.openTrades ?? 0;
  const avgWin = summary?.avgWin ?? 0;
  const avgLoss = summary?.avgLoss ?? 0;
  const pnlIsPositive = totalPnl >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net P&amp;L</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pnlIsPositive ? 'text-primary' : 'text-destructive'}`}>
              ${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              {pnlIsPositive ? <ArrowUpRight className="h-3 w-3 mr-1 text-primary" /> : <ArrowDownRight className="h-3 w-3 mr-1 text-destructive" />}
              All time performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(winRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {closedTrades} closed trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrades}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {openTrades} currently open
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Win / Loss</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">${avgWin.toFixed(2)}</div>
            <div className="text-xl font-bold text-destructive">${avgLoss.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.recentTrades && summary.recentTrades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Dir</th>
                    <th className="px-4 py-3">Entry Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{trade.asset}</td>
                      <td className="px-4 py-3 capitalize">{trade.assetType}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-sm text-xs font-bold ${trade.direction === 'long' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                          {trade.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">{new Date(trade.entryDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {trade.exitDate ? 'Closed' : <span className="text-primary animate-pulse">Open</span>}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${trade.pnl != null ? (trade.pnl >= 0 ? 'text-primary' : 'text-destructive') : ''}`}>
                        {trade.pnl != null ? (trade.pnl >= 0 ? '+' : '') + '$' + Math.abs(trade.pnl).toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <p className="text-muted-foreground">No trades yet — log your first trade to get started.</p>
              <Link href="/trades">
                <Button variant="outline" className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Add Your First Trade
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
