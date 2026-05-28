import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { tradesTable, strategiesTable } from "@workspace/db/schema";
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

router.get("/analytics/summary", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;

  const [trades, strategies] = await Promise.all([
    db.select().from(tradesTable).where(eq(tradesTable.userId, userId)),
    db.select().from(strategiesTable).where(eq(strategiesTable.userId, userId)),
  ]);

  const closed = trades
    .filter((t) => t.exitPrice != null)
    .map((t) => ({
      ...t,
      pnl: calcPnl(t.direction, t.entryPrice, t.exitPrice, t.quantity, t.fees)!,
    }))
    .filter((t) => t.pnl !== null);

  const pnls = closed.map((t) => t.pnl);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);

  const winRate = pnls.length > 0 ? wins.length / pnls.length : 0;
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
  const grossWins = wins.reduce((a, b) => a + b, 0);
  const grossLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  const rrs = closed
    .map((t) => {
      if (!t.stopLoss || !t.takeProfit) return null;
      const entry = parseFloat(t.entryPrice);
      const sl = parseFloat(t.stopLoss);
      const tp = parseFloat(t.takeProfit);
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(tp - entry);
      return risk > 0 ? reward / risk : null;
    })
    .filter((r): r is number => r !== null);
  const avgRiskReward = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;

  // Equity curve — sorted by exit date
  const sortedClosed = [...closed].sort(
    (a, b) =>
      new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime(),
  );
  let cumPnl = 0;
  const equityCurve = sortedClosed.map((t) => {
    cumPnl += t.pnl;
    return {
      date: new Date(t.exitDate!).toISOString().split("T")[0],
      cumulativePnl: Math.round(cumPnl * 100) / 100,
      tradeCount: 1,
    };
  });

  // Breakdown by asset type
  const assetTypes = ["stock", "forex", "crypto"] as const;
  const byAssetType = assetTypes.map((type) => {
    const group = closed.filter((t) => t.assetType === type);
    const groupPnls = group.map((t) => t.pnl);
    const groupWins = groupPnls.filter((p) => p > 0);
    return {
      label: type,
      pnl: Math.round(groupPnls.reduce((a, b) => a + b, 0) * 100) / 100,
      tradeCount: group.length,
      winRate: groupPnls.length > 0 ? groupWins.length / groupPnls.length : 0,
    };
  }).filter((g) => g.tradeCount > 0);

  // Breakdown by strategy
  const strategyMap = new Map(strategies.map((s) => [s.id, s.name]));
  const strategyIds = [...new Set(closed.map((t) => t.strategyId))];
  const byStrategy = strategyIds.map((sid) => {
    const group = closed.filter((t) => t.strategyId === sid);
    const groupPnls = group.map((t) => t.pnl);
    const groupWins = groupPnls.filter((p) => p > 0);
    return {
      label: sid != null ? (strategyMap.get(sid) ?? `Strategy ${sid}`) : "No strategy",
      pnl: Math.round(groupPnls.reduce((a, b) => a + b, 0) * 100) / 100,
      tradeCount: group.length,
      winRate: groupPnls.length > 0 ? groupWins.length / groupPnls.length : 0,
    };
  });

  res.json({
    winRate,
    profitFactor,
    avgWin,
    avgLoss,
    avgRiskReward,
    equityCurve,
    byAssetType,
    byStrategy,
  });
});

export default router;
