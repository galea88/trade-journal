import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { brokerConnectionsTable } from "@workspace/db/schema";
import { requireAuth } from "./auth";
import {
  testIbkrConnection,
  runSyncForConnection,
} from "../lib/ibkrFlex";
import {
  encryptCredentials,
  decryptCredentials,
} from "../lib/credentialsCrypto";
import type { Request } from "express";

type AuthedRequest = Request & { userId: string };

const router = Router();

router.get("/brokers/status", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;

  const connections = await db
    .select()
    .from(brokerConnectionsTable)
    .where(eq(brokerConnectionsTable.userId, userId));

  const conn = connections.find((c) => c.brokerType === "ibkr") ?? null;

  if (!conn) {
    res.json({ connected: false });
    return;
  }

  res.json({
    connected: true,
    enabled: conn.enabled,
    lastSyncAt: conn.lastSyncAt,
    lastSyncCount: conn.lastSyncCount,
    lastSyncError: conn.lastSyncError,
    connectionId: conn.id,
  });
});

router.post("/brokers/test", requireAuth, async (req, res) => {
  const { token, queryId } = req.body;

  if (!token || !queryId) {
    res.status(400).json({ error: "token and queryId are required" });
    return;
  }

  try {
    await testIbkrConnection({ token, queryId });
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection test failed";
    res.status(400).json({ error: msg });
  }
});

router.post("/brokers/connect", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const { token, queryId } = req.body;

  if (!token || !queryId) {
    res.status(400).json({ error: "token and queryId are required" });
    return;
  }

  const credentials = encryptCredentials(JSON.stringify({ token, queryId }));

  const existing = await db
    .select()
    .from(brokerConnectionsTable)
    .where(
      and(
        eq(brokerConnectionsTable.userId, userId),
        eq(brokerConnectionsTable.brokerType, "ibkr"),
      ),
    );

  if (existing.length > 0) {
    await db
      .update(brokerConnectionsTable)
      .set({
        encryptedCredentials: credentials,
        enabled: true,
        lastSyncError: null,
        updatedAt: new Date(),
      })
      .where(eq(brokerConnectionsTable.id, existing[0].id));

    res.json({ connected: true, connectionId: existing[0].id });
  } else {
    const [conn] = await db
      .insert(brokerConnectionsTable)
      .values({
        userId,
        brokerType: "ibkr",
        encryptedCredentials: credentials,
        enabled: true,
      })
      .returning();

    res.json({ connected: true, connectionId: conn.id });
  }
});

router.post("/brokers/sync", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;

  const [conn] = await db
    .select()
    .from(brokerConnectionsTable)
    .where(
      and(
        eq(brokerConnectionsTable.userId, userId),
        eq(brokerConnectionsTable.brokerType, "ibkr"),
      ),
    );

  if (!conn) {
    res.status(404).json({ error: "No IBKR connection found" });
    return;
  }

  try {
    await runSyncForConnection(conn.id);

    const [updated] = await db
      .select()
      .from(brokerConnectionsTable)
      .where(eq(brokerConnectionsTable.id, conn.id));

    res.json({
      success: !updated.lastSyncError,
      lastSyncAt: updated.lastSyncAt,
      lastSyncCount: updated.lastSyncCount,
      error: updated.lastSyncError,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    res.status(500).json({ error: msg });
  }
});

router.delete("/brokers/disconnect", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;

  await db
    .delete(brokerConnectionsTable)
    .where(
      and(
        eq(brokerConnectionsTable.userId, userId),
        eq(brokerConnectionsTable.brokerType, "ibkr"),
      ),
    );

  res.json({ connected: false });
});

export default router;
