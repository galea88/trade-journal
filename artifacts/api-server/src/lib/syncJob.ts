import { db } from "@workspace/db";
import { brokerConnectionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { runSyncForConnection } from "./ibkrFlex";
import { logger } from "./logger";

const SYNC_INTERVAL_MS = 60 * 60 * 1000;

async function runAllSyncs(): Promise<void> {
  try {
    const connections = await db
      .select()
      .from(brokerConnectionsTable)
      .where(eq(brokerConnectionsTable.enabled, true));

    logger.info({ count: connections.length }, "Starting scheduled IBKR sync");

    for (const conn of connections) {
      await runSyncForConnection(conn.id);
    }
  } catch (err) {
    logger.error({ err }, "Error during scheduled sync");
  }
}

export function startSyncJob(): void {
  logger.info("IBKR background sync job registered (interval: 60 min)");
  setInterval(runAllSyncs, SYNC_INTERVAL_MS);
}
