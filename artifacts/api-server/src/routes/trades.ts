import { Router } from "express";
import { eq, and, desc, gte, lt } from "drizzle-orm";
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

function calcRR(
  direction: string,
  entryPrice: string,
  stopLoss: string | null | undefined,
  takeProfit: string | null | undefined,
): number | null {
  if (!stopLoss || !takeProfit) return null;
  const entry = parseFloat(entryPrice);
  const sl = parseFloat(stopLoss);
  const tp = parseFloat(takeProfit);
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk === 0) return null;
  return reward / risk;
}

function enrichTrade(trade: (typeof tradesTable.$inferSelect)) {
  return {
    ...trade,
    pnl: calcPnl(
      trade.direction,
      trade.entryPrice,
      trade.exitPrice,
      trade.quantity,
      trade.fees,
    ),
    riskReward: calcRR(
      trade.direction,
      trade.entryPrice,
      trade.stopLoss,
      trade.takeProfit,
    ),
  };
}

router.get("/trades", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const { assetType, strategyId, date } = req.query;

  const conditions = [eq(tradesTable.userId, userId)];
  if (assetType && typeof assetType === "string") {
    conditions.push(eq(tradesTable.assetType, assetType));
  }
  if (strategyId) {
    conditions.push(
      eq(tradesTable.strategyId, parseInt(strategyId as string, 10)),
    );
  }
  if (date && typeof date === "string") {
    const start = new Date(date + "T00:00:00.000Z");
    const nextDay = new Date(start);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    conditions.push(gte(tradesTable.exitDate, start));
    conditions.push(lt(tradesTable.exitDate, nextDay));
  }

  const trades = await db
    .select()
    .from(tradesTable)
    .where(and(...conditions))
    .orderBy(desc(tradesTable.entryDate));

  res.json(trades.map(enrichTrade));
});

router.post("/trades", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const body = req.body;

  const [trade] = await db
    .insert(tradesTable)
    .values({
      userId,
      strategyId: body.strategyId ?? null,
      asset: body.asset,
      assetType: body.assetType,
      direction: body.direction,
      entryPrice: body.entryPrice,
      exitPrice: body.exitPrice ?? null,
      quantity: body.quantity,
      fees: body.fees ?? "0",
      entryDate: new Date(body.entryDate),
      exitDate: body.exitDate ? new Date(body.exitDate) : null,
      notes: body.notes ?? null,
      stopLoss: body.stopLoss ?? null,
      takeProfit: body.takeProfit ?? null,
    })
    .returning();

  res.status(201).json(enrichTrade(trade));
});

router.get("/trades/:id", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const id = parseInt(req.params.id, 10);

  const [trade] = await db
    .select()
    .from(tradesTable)
    .where(and(eq(tradesTable.id, id), eq(tradesTable.userId, userId)));

  if (!trade) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(enrichTrade(trade));
});

router.put("/trades/:id", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const id = parseInt(req.params.id, 10);
  const body = req.body;

  const existing = await db
    .select()
    .from(tradesTable)
    .where(and(eq(tradesTable.id, id), eq(tradesTable.userId, userId)));

  if (!existing[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [trade] = await db
    .update(tradesTable)
    .set({
      strategyId: body.strategyId ?? null,
      asset: body.asset,
      assetType: body.assetType,
      direction: body.direction,
      entryPrice: body.entryPrice,
      exitPrice: body.exitPrice ?? null,
      quantity: body.quantity,
      fees: body.fees ?? "0",
      entryDate: new Date(body.entryDate),
      exitDate: body.exitDate ? new Date(body.exitDate) : null,
      notes: body.notes ?? null,
      stopLoss: body.stopLoss ?? null,
      takeProfit: body.takeProfit ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(tradesTable.id, id), eq(tradesTable.userId, userId)))
    .returning();

  res.json(enrichTrade(trade));
});

router.delete("/trades/:id", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const id = parseInt(req.params.id, 10);

  const existing = await db
    .select()
    .from(tradesTable)
    .where(and(eq(tradesTable.id, id), eq(tradesTable.userId, userId)));

  if (!existing[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db
    .delete(tradesTable)
    .where(and(eq(tradesTable.id, id), eq(tradesTable.userId, userId)));

  res.status(204).send();
});

export default router;
