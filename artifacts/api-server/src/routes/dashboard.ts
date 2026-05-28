import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
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

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;

  const trades = await db
    .select()
    .from(tradesTable)
    .where(eq(tradesTable.userId, userId))
    .orderBy(desc(tradesTable.entryDate));

  const closed = trades.filter((t) => t.exitPrice != null);
  const pnls = closed
    .map((t) => calcPnl(t.direction, t.entryPrice, t.exitPrice, t.quantity, t.fees))
    .filter((p): p is number => p !== null);

  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);

  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const winRate = pnls.length > 0 ? wins.length / pnls.length : 0;
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;

  const recentTrades = trades.slice(0, 5).map((t) => ({
    ...t,
    pnl: calcPnl(t.direction, t.entryPrice, t.exitPrice, t.quantity, t.fees),
    riskReward: null,
  }));

  res.json({
    totalPnl,
    winRate,
    totalTrades: trades.length,
    openTrades: trades.filter((t) => !t.exitPrice).length,
    closedTrades: closed.length,
    avgWin,
    avgLoss,
    recentTrades,
  });
});

export default router;
