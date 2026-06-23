import { Router } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { tradesTable } from "@workspace/db/schema";
import { requireAuth } from "./auth";
import { getQuotes } from "../lib/marketData";
import type { Request } from "express";

type AuthedRequest = Request & { userId: string };

const router = Router();

router.get("/positions", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;

  const openTrades = await db
    .select()
    .from(tradesTable)
    .where(and(eq(tradesTable.userId, userId), isNull(tradesTable.exitDate)));

  if (openTrades.length === 0) {
    res.json([]);
    return;
  }

  const symbolInputs = openTrades.map((t) => ({
    asset: t.asset,
    assetType: t.assetType,
  }));

  const quotes = await getQuotes(symbolInputs);

  const quoteMap = new Map<string, { price: number | null; error?: string }>();
  quotes.forEach((q, i) => {
    const key = `${symbolInputs[i].assetType}:${symbolInputs[i].asset}`;
    quoteMap.set(key, { price: q.price, error: q.error });
  });

  const positions = openTrades.map((trade) => {
    const key = `${trade.assetType}:${trade.asset}`;
    const quote = quoteMap.get(key);
    const currentPrice = quote?.price ?? null;

    const entryPrice = parseFloat(trade.entryPrice);
    const quantity = parseFloat(trade.quantity);
    const fees = parseFloat(trade.fees ?? "0");

    let unrealizedPnl: number | null = null;
    let pctMove: number | null = null;

    if (currentPrice != null && !isNaN(entryPrice) && !isNaN(quantity)) {
      const gross =
        trade.direction === "long"
          ? (currentPrice - entryPrice) * quantity
          : (entryPrice - currentPrice) * quantity;
      unrealizedPnl = gross - fees;
      pctMove =
        entryPrice !== 0
          ? trade.direction === "long"
            ? ((currentPrice - entryPrice) / entryPrice) * 100
            : ((entryPrice - currentPrice) / entryPrice) * 100
          : null;
    }

    return {
      id: trade.id,
      asset: trade.asset,
      assetType: trade.assetType,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      quantity: trade.quantity,
      entryDate: trade.entryDate,
      strategyId: trade.strategyId,
      notes: trade.notes,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      currentPrice,
      unrealizedPnl,
      pctMove,
      ...(quote?.error ? { priceError: quote.error } : {}),
    };
  });

  res.json(positions);
});

export default router;
