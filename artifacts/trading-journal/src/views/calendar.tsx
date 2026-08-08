import { useState } from "react";
import {
  useGetCalendarDaily,
  getGetCalendarDailyQueryKey,
  useListTrades,
  getListTradesQueryKey,
  useListStrategies,
  getListStrategiesQueryKey,
  Trade,
  Strategy,
} from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, CalendarDays, ExternalLink, TrendingUp, TrendingDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { TradeForm } from "@/components/trades/TradeForm";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: dailyData, isLoading } = useGetCalendarDaily(
    { year, month },
    { query: { queryKey: getGetCalendarDailyQueryKey({ year, month }) } }
  );

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getDayData = (day: number) => {
    if (!dailyData) return null;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dailyData.find(d => d.date === dateStr);
  };

  const hasData = dailyData && dailyData.length > 0;

  const handleDayClick = (day: number) => {
    const data = getDayData(day);
    if (!data) return;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">Review your performance by day.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-xl font-bold min-w-[150px] text-center">
            {monthNames[month - 1]} {year}
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground">Loading calendar...</div>
          ) : !hasData ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg bg-muted/10 space-y-4">
              <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-lg font-medium text-foreground">No trades logged this month</p>
              <p className="text-muted-foreground">Log a trade in {monthNames[month - 1]} to see your daily P&amp;L here.</p>
              <Link href="/trades">
                <Button className="gap-2 mt-2">
                  <PlusCircle className="h-4 w-4" />
                  Log a Trade
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground">
                  {day}
                </div>
              ))}

              {days.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="bg-background min-h-[100px]" />;
                }

                const data = getDayData(day);
                const pnl = data?.pnl ?? 0;
                const hasTradeData = !!data;

                let bgClass = "bg-background";
                let cursorClass = "";
                if (hasTradeData) {
                  cursorClass = "cursor-pointer";
                  if (pnl > 0) bgClass = "bg-primary/20 hover:bg-primary/30 text-primary";
                  else if (pnl < 0) bgClass = "bg-destructive/20 hover:bg-destructive/30 text-destructive";
                  else bgClass = "bg-muted/50 hover:bg-muted/70 text-foreground";
                }

                return (
                  <div
                    key={`day-${day}`}
                    className={`${bgClass} ${cursorClass} min-h-[100px] p-2 flex flex-col justify-between transition-colors`}
                    onClick={() => hasTradeData && handleDayClick(day)}
                  >
                    <div className="text-sm font-medium opacity-50">{day}</div>
                    {hasTradeData && (
                      <div className="text-right">
                        <div className="font-bold text-sm">
                          {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {data.wins ?? 0}W / {data.losses ?? 0}L
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DayDetailSheet
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  );
}

function DayDetailSheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { data: response, isLoading: tradesLoading } = useListTrades(
    { date: date ?? undefined, limit: 100 },
    {
      query: {
        queryKey: getListTradesQueryKey({ date: date ?? undefined, limit: 100 }),
        enabled: !!date,
      }
    }
  );

  const trades = response?.data;

  const { data: strategies } = useListStrategies(
    { query: { queryKey: getListStrategiesQueryKey(), enabled: !!date } }
  );

  const strategyMap = new Map<number, string>(
    (strategies ?? []).map(s => [s.id, s.name])
  );

  const totalPnl = trades?.reduce((sum, t) => sum + (t.pnl ?? 0), 0) ?? 0;
  const formattedDate = date
    ? format(new Date(date + "T12:00:00"), "EEEE, MMMM d, yyyy")
    : "";

  return (
    <Sheet open={!!date} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{formattedDate}</SheetTitle>
          <SheetDescription>
            {tradesLoading
              ? "Loading trades..."
              : `${trades?.length ?? 0} trade${(trades?.length ?? 0) !== 1 ? "s" : ""} closed this day`}
          </SheetDescription>
        </SheetHeader>

        {!tradesLoading && trades && trades.length > 0 && (
          <>
            <div className={`rounded-lg p-3 mb-4 flex items-center justify-between ${totalPnl >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
              <span className="text-sm font-medium text-muted-foreground">Day P&L</span>
              <span className={`text-lg font-bold ${totalPnl >= 0 ? "text-primary" : "text-destructive"}`}>
                {totalPnl >= 0 ? "+" : "-"}${Math.abs(totalPnl).toFixed(2)}
              </span>
            </div>

            <div className="space-y-3">
              {trades.map((trade) => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  strategyName={trade.strategyId != null ? strategyMap.get(trade.strategyId) : undefined}
                  selectedDate={date}
                />
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <Link href="/trades" onClick={onClose}>
                <Button variant="outline" className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View Full Trade Log
                </Button>
              </Link>
            </div>
          </>
        )}

        {!tradesLoading && (!trades || trades.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            No closed trades found for this day.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TradeCard({
  trade,
  strategyName,
  selectedDate,
}: {
  trade: Trade;
  strategyName: string | undefined;
  selectedDate: string | null;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const pnl = trade.pnl ?? null;
  const isWin = pnl != null && pnl > 0;
  const isLoss = pnl != null && pnl < 0;

  return (
    <>
      <div className="rounded-lg border border-border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">{trade.asset}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold uppercase ${trade.direction === "long" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
              {trade.direction}
            </span>
            <span className="text-xs text-muted-foreground uppercase">{trade.assetType}</span>
          </div>
          <div className="flex items-center gap-2">
            {pnl != null && (
              <div className={`flex items-center gap-1 font-bold text-sm ${isWin ? "text-primary" : isLoss ? "text-destructive" : "text-foreground"}`}>
                {isWin ? <TrendingUp className="h-3.5 w-3.5" /> : isLoss ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                {pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toFixed(2)}
              </div>
            )}
            {pnl == null && (
              <span className="text-xs text-muted-foreground italic">Open</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit trade</span>
            </Button>
          </div>
        </div>

        {strategyName && (
          <div className="text-xs text-muted-foreground">
            Strategy: <span className="font-medium text-foreground">{strategyName}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div>
            <div className="font-medium text-foreground">${Number(trade.entryPrice).toFixed(2)}</div>
            <div>Entry</div>
          </div>
          <div>
            <div className="font-medium text-foreground">
              {trade.exitPrice ? `$${Number(trade.exitPrice).toFixed(2)}` : "—"}
            </div>
            <div>Exit</div>
          </div>
          <div>
            <div className="font-medium text-foreground">{trade.quantity}</div>
            <div>Size</div>
          </div>
        </div>

        {trade.notes && (
          <p className="text-xs text-muted-foreground border-t border-border pt-2 line-clamp-2">{trade.notes}</p>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Trade — {trade.asset}</DialogTitle>
          </DialogHeader>
          <TradeForm
            initialData={trade}
            onSuccess={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
