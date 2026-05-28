import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { strategiesTable } from "@workspace/db/schema";
import { requireAuth } from "./auth";
import type { Request } from "express";

type AuthedRequest = Request & { userId: string };

const router = Router();

router.get("/strategies", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const strategies = await db
    .select()
    .from(strategiesTable)
    .where(eq(strategiesTable.userId, userId))
    .orderBy(strategiesTable.name);
  res.json(strategies);
});

router.post("/strategies", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const { name, description } = req.body;

  const [strategy] = await db
    .insert(strategiesTable)
    .values({ userId, name, description: description ?? null })
    .returning();

  res.status(201).json(strategy);
});

router.put("/strategies/:id", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const id = parseInt(req.params.id, 10);
  const { name, description } = req.body;

  const existing = await db
    .select()
    .from(strategiesTable)
    .where(and(eq(strategiesTable.id, id), eq(strategiesTable.userId, userId)));

  if (!existing[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [strategy] = await db
    .update(strategiesTable)
    .set({ name, description: description ?? null, updatedAt: new Date() })
    .where(and(eq(strategiesTable.id, id), eq(strategiesTable.userId, userId)))
    .returning();

  res.json(strategy);
});

router.delete("/strategies/:id", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const id = parseInt(req.params.id, 10);

  const existing = await db
    .select()
    .from(strategiesTable)
    .where(and(eq(strategiesTable.id, id), eq(strategiesTable.userId, userId)));

  if (!existing[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db
    .delete(strategiesTable)
    .where(and(eq(strategiesTable.id, id), eq(strategiesTable.userId, userId)));

  res.status(204).send();
});

export default router;
