import { Router } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "@workspace/db";
import { tradesTable } from "@workspace/db/schema";
import { requireAuth } from "./auth";
import type { Request } from "express";

type AuthedRequest = Request & { userId: string };

const router = Router();

function calcPnl(
  direction: string,
  entryPrice: string,
  exitPrice: string | null | undefined,
  quantity: string,
  fees: string,
): number | null {
  if (!exitPrice) return null;
  const entry = parseFloat(entryPrice);
  const exit = parseFloat(exitPrice);
  const qty = parseFloat(quantity);
  const fee = parseFloat(fees);
  const gross =
    direction === "long" ? (exit - entry) * qty : (entry - exit) * qty;
  return gross - fee;
}

router.get("/calendar/daily", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
  const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;

  const start = month
    ? new Date(year, month - 1, 1)
    : new Date(year, 0, 1);
  const end = month
    ? new Date(year, month, 1)
    : new Date(year + 1, 0, 1);

  const trades = await db
    .select()
    .from(tradesTable)
    .where(
      and(
        eq(tradesTable.userId, userId),
        gte(tradesTable.exitDate, start),
        lte(tradesTable.exitDate, end),
      ),
    );

  const byDay = new Map<string, { pnl: number; tradeCount: number; wins: number; losses: number }>();

  for (const trade of trades) {
    if (!trade.exitDate) continue;
    const date = new Date(trade.exitDate).toISOString().split("T")[0];
    const pnl = calcPnl(trade.direction, trade.entryPrice, trade.exitPrice, trade.quantity, trade.fees);
    if (pnl === null) continue;

    if (!byDay.has(date)) {
      byDay.set(date, { pnl: 0, tradeCount: 0, wins: 0, losses: 0 });
    }
    const entry = byDay.get(date)!;
    entry.pnl += pnl;
    entry.tradeCount += 1;
    if (pnl > 0) entry.wins += 1;
    else entry.losses += 1;
  }

  const result = Array.from(byDay.entries())
    .map(([date, data]) => ({
      date,
      pnl: Math.round(data.pnl * 100) / 100,
      tradeCount: data.tradeCount,
      wins: data.wins,
      losses: data.losses,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json(result);
});

export default router;
