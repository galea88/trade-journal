import { useGetAnalyticsSummary, getGetAnalyticsSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function Analytics() {
  const { data: summary, isLoading } = useGetAnalyticsSummary({
    query: { queryKey: getGetAnalyticsSummaryQueryKey() }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading analytics...</div>;
  }

  const hasData = summary && (
    (summary.equityCurve?.length ?? 0) > 0 ||
    (summary.byAssetType?.length ?? 0) > 0 ||
    (summary.byStrategy?.length ?? 0) > 0
  );

  const profitFactor = summary?.profitFactor ?? 0;
  const winRate = summary?.winRate ?? 0;
  const avgWin = summary?.avgWin ?? 0;
  const avgLoss = summary?.avgLoss ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your edge.</p>
        </div>
      </div>

      {!hasData ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg bg-muted/10 space-y-4">
          <p className="text-lg font-medium text-foreground">No trades yet</p>
          <p className="text-muted-foreground">Log your first trade to start seeing analytics and performance data.</p>
          <Link href="/trades">
            <Button className="gap-2 mt-2">
              <PlusCircle className="h-4 w-4" />
              Add Your First Trade
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profit Factor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profitFactor.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Gross Win / Gross Loss</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(winRate * 100).toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Win</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">${avgWin.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">${avgLoss.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {summary?.equityCurve && summary.equityCurve.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary.equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(135 100% 50%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(135 100% 50%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `$${val}`}
                      />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative P&L']}
                      />
                      <Area type="stepAfter" dataKey="cumulativePnl" stroke="hsl(135 100% 50%)" fillOpacity={1} fill="url(#colorPnl)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Asset Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  {summary?.byAssetType && summary.byAssetType.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.byAssetType} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="label" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                        />
                        <Bar dataKey="pnl" fill="hsl(135 100% 50%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance by Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  {summary?.byStrategy && summary.byStrategy.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.byStrategy} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="label" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                        />
                        <Bar dataKey="pnl" fill="hsl(210 100% 60%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
