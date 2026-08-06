import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { depositsTable, withdrawalsTable } from "@workspace/db/schema";
import { requireAuth } from "./auth";
import type { Request } from "express";

type AuthedRequest = Request & { userId: string };

const router = Router();

router.get("/deposits", requireAuth, async (_req, res) => {
  const rows = await db
    .select()
    .from(depositsTable)
    .orderBy(depositsTable.depositCreatedAt);

  res.json(rows);
});

router.get("/withdrawals", requireAuth, async (req, res) => {
  const rows = await db.select().from(withdrawalsTable);

  res.json(rows);
});

router.post("/deposits", requireAuth, async (req, res) => {
  const body = req.body;

  const [transaction] = await db
    .insert(depositsTable)
    .values({ depositAmount: body.depositAmount })
    .returning();
});

router.post("/withdrawals", requireAuth, async (req, res) => {
  const body = req.body;

  const [withdrawal] = await db
    .insert(withdrawalsTable)
    .values({
      withdrawalAmount: body.withdrawalAmount,
    })
    .returning();

  res.status(201).json(withdrawal);
});

export default router;
