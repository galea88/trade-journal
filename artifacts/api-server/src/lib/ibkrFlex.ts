import { XMLParser } from "fast-xml-parser";
import { db } from "@workspace/db";
import { tradesTable, brokerConnectionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { decryptCredentials } from "./credentialsCrypto";
import { logger } from "./logger";

const SEND_REQUEST_URL =
  "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest";
const GET_STATEMENT_URL =
  "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/GetStatement";

export interface IbkrCredentials {
  token: string;
  queryId: string;
}

interface IbkrTrade {
  execID: string;
  symbol: string;
  assetCategory: string;
  buySell: string;
  quantity: string;
  tradePrice: string;
  ibCommission: string;
  tradeDate: string;
  tradeTime?: string;
  openCloseIndicator: string;
  cost?: string;
  proceeds?: string;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from IBKR: ${await res.text()}`);
  }
  return res.text();
}

async function sendFlexRequest(
  token: string,
  queryId: string,
): Promise<string> {
  const url = `${SEND_REQUEST_URL}?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=3`;
  const text = await fetchText(url);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const result = parser.parse(text);
  const status = result?.FlexStatementResponse?.Status;
  const refCode = result?.FlexStatementResponse?.ReferenceCode;

  if (status !== "Success" || !refCode) {
    const errMsg =
      result?.FlexStatementResponse?.ErrorMessage ||
      result?.FlexStatementResponse?.ErrorCode ||
      "Unknown IBKR error";
    throw new Error(`IBKR SendRequest failed: ${errMsg}`);
  }

  return String(refCode);
}

async function pollFlexStatement(
  refCode: string,
  token: string,
  maxAttempts = 10,
  delayMs = 3000,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const url = `${GET_STATEMENT_URL}?q=${encodeURIComponent(refCode)}&t=${encodeURIComponent(token)}&v=3`;
    const text = await fetchText(url);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
    const result = parser.parse(text);

    if (result?.FlexQueryResponse) {
      return text;
    }

    const status = result?.FlexStatementResponse?.Status;
    const errorCode = String(
      result?.FlexStatementResponse?.ErrorCode ?? "",
    );

    const isNotReady =
      status === "Warn" ||
      errorCode === "1019" ||
      errorCode === "1020";

    if (isNotReady) {
      logger.info(
        { refCode, attempt },
        "IBKR statement not ready yet, retrying...",
      );
      continue;
    }

    const errMsg =
      result?.FlexStatementResponse?.ErrorMessage ||
      errorCode ||
      "Unknown error";
    throw new Error(`IBKR GetStatement failed: ${errMsg}`);
  }

  throw new Error("IBKR statement timed out after maximum attempts");
}

function mapAssetCategory(cat: string): string {
  switch (cat?.toUpperCase()) {
    case "STK":
      return "stock";
    case "OPT":
      return "option";
    case "FUT":
      return "futures";
    case "CASH":
      return "forex";
    case "CRYPTO":
      return "crypto";
    default:
      return "stock";
  }
}

function parseDatetime(date: string, time?: string): Date {
  if (!date) return new Date();
  const dateStr = String(date).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
  if (time) {
    const timeStr = String(time).replace(/(\d{2})(\d{2})(\d{2})/, "$1:$2:$3");
    return new Date(`${dateStr}T${timeStr}Z`);
  }
  return new Date(`${dateStr}T00:00:00Z`);
}

function parseFlexXml(xml: string): IbkrTrade[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    isArray: (name) => name === "Trade",
  });

  const result = parser.parse(xml);

  const statements =
    result?.FlexQueryResponse?.FlexStatements?.FlexStatement;
  if (!statements) return [];

  const stmtArray = Array.isArray(statements) ? statements : [statements];
  const trades: IbkrTrade[] = [];

  for (const stmt of stmtArray) {
    const tradeElements = stmt?.Trades?.Trade;
    if (!tradeElements) continue;
    const arr = Array.isArray(tradeElements)
      ? tradeElements
      : [tradeElements];
    for (const t of arr) {
      if (!t?.execID) continue;
      trades.push({
        execID: String(t.execID),
        symbol: String(t.symbol || ""),
        assetCategory: String(t.assetCategory || "STK"),
        buySell: String(t.buySell || t.side || ""),
        quantity: String(t.quantity || "0"),
        tradePrice: String(t.tradePrice || "0"),
        ibCommission: String(
          Math.abs(parseFloat(t.ibCommission || "0")),
        ),
        tradeDate: String(t.tradeDate || ""),
        tradeTime: t.tradeTime ? String(t.tradeTime) : undefined,
        openCloseIndicator: String(t.openCloseIndicator || ""),
        cost: t.cost != null ? String(t.cost) : undefined,
        proceeds: t.proceeds != null ? String(t.proceeds) : undefined,
      });
    }
  }

  return trades;
}

export async function testIbkrConnection(
  credentials: IbkrCredentials,
): Promise<void> {
  const refCode = await sendFlexRequest(credentials.token, credentials.queryId);
  await pollFlexStatement(refCode, credentials.token);
}

export async function syncIbkrTrades(
  userId: string,
  _connectionId: number,
  credentials: IbkrCredentials,
): Promise<number> {
  const refCode = await sendFlexRequest(
    credentials.token,
    credentials.queryId,
  );
  const xml = await pollFlexStatement(refCode, credentials.token);
  const ibkrTrades = parseFlexXml(xml);

  const closingTrades = ibkrTrades.filter((t) =>
    t.openCloseIndicator?.toUpperCase().includes("C"),
  );

  if (closingTrades.length === 0) {
    return 0;
  }

  const existingRows = await db
    .select({ externalId: tradesTable.externalId })
    .from(tradesTable)
    .where(eq(tradesTable.userId, userId));

  const existingSet = new Set(
    existingRows
      .map((r) => r.externalId)
      .filter(Boolean) as string[],
  );

  let imported = 0;
  for (const t of closingTrades) {
    if (existingSet.has(t.execID)) continue;

    const direction = t.buySell.toUpperCase().startsWith("S")
      ? "long"
      : "short";
    const assetType = mapAssetCategory(t.assetCategory);
    const exitDate = parseDatetime(t.tradeDate, t.tradeTime);
    const qty = Math.abs(parseFloat(t.quantity));
    const exitPrice = parseFloat(t.tradePrice);
    const fees = parseFloat(t.ibCommission);

    if (isNaN(qty) || isNaN(exitPrice) || qty === 0 || exitPrice === 0)
      continue;

    const costBasis = t.cost != null ? parseFloat(t.cost) : null;
    const entryPrice =
      costBasis != null && qty > 0
        ? Math.abs(costBasis) / qty
        : exitPrice;

    await db.insert(tradesTable).values({
      userId,
      asset: t.symbol,
      assetType,
      direction,
      entryPrice: String(entryPrice),
      exitPrice: String(exitPrice),
      quantity: String(qty),
      fees: String(fees),
      entryDate: exitDate,
      exitDate,
      notes: `Imported from IBKR (execID: ${t.execID})`,
      externalId: t.execID,
      source: "ibkr",
    });

    existingSet.add(t.execID);
    imported++;
  }

  return imported;
}

export async function runSyncForConnection(
  connectionId: number,
): Promise<void> {
  const [conn] = await db
    .select()
    .from(brokerConnectionsTable)
    .where(eq(brokerConnectionsTable.id, connectionId));

  if (!conn || !conn.enabled) return;

  try {
    const credentials: IbkrCredentials = JSON.parse(
      decryptCredentials(conn.encryptedCredentials),
    );
    const count = await syncIbkrTrades(conn.userId, conn.id, credentials);

    await db
      .update(brokerConnectionsTable)
      .set({
        lastSyncAt: new Date(),
        lastSyncCount: count,
        lastSyncError: null,
        updatedAt: new Date(),
      })
      .where(eq(brokerConnectionsTable.id, conn.id));

    logger.info(
      { connectionId, userId: conn.userId, count },
      "IBKR sync complete",
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ connectionId, err }, "IBKR sync failed");

    const isCredentialError =
      errMsg.includes("1003") ||
      errMsg.includes("1004") ||
      errMsg.toLowerCase().includes("invalid token") ||
      errMsg.toLowerCase().includes("unauthorized");

    await db
      .update(brokerConnectionsTable)
      .set({
        lastSyncAt: new Date(),
        lastSyncError: errMsg,
        enabled: isCredentialError ? false : conn.enabled,
        updatedAt: new Date(),
      })
      .where(eq(brokerConnectionsTable.id, conn.id));
  }
}
