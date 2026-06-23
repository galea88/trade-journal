import yahooFinance from "yahoo-finance2";

interface QuoteResult {
  symbol: string;
  price: number | null;
  error?: string;
}

const cache = new Map<string, { price: number; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

function yahooSymbol(asset: string, assetType: string): string {
  const upper = asset.toUpperCase().trim();

  if (assetType === "crypto") {
    // Normalise separators: BTC/USD, BTC-USD, BTCUSD → BTC-USD
    const withoutSep = upper.replace(/[/\-_]/, "");
    // If it already looks like BASE-USD, return as-is
    if (upper.match(/^[A-Z]+-(USD|USDT|USDC|BTC|ETH)$/)) return upper;
    // Common quote currencies
    const quoteMatch = withoutSep.match(/^(.+?)(USD|USDT|USDC|BTC|ETH)$/);
    if (quoteMatch) return `${quoteMatch[1]}-${quoteMatch[2]}`;
    // Fallback: append -USD
    return `${withoutSep}-USD`;
  }

  if (assetType === "forex") {
    // Accept: EURUSD, EUR/USD, EUR_USD, EUR-USD → EURUSD=X
    const clean = upper.replace(/[/\-_]/, "");
    return `${clean}=X`;
  }

  // Stocks/ETFs: pass through as-is (Yahoo uses plain ticker)
  return upper;
}

export async function getQuotes(
  symbols: { asset: string; assetType: string }[],
): Promise<QuoteResult[]> {
  const now = Date.now();
  const toFetch: { asset: string; assetType: string; yahooSym: string }[] = [];
  const results: Map<string, QuoteResult> = new Map();

  for (const s of symbols) {
    const key = `${s.assetType}:${s.asset}`;
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      results.set(key, { symbol: s.asset, price: cached.price });
    } else {
      toFetch.push({ ...s, yahooSym: yahooSymbol(s.asset, s.assetType) });
    }
  }

  if (toFetch.length > 0) {
    const fetchMap = new Map<string, { asset: string; assetType: string }>();
    for (const s of toFetch) {
      fetchMap.set(s.yahooSym, { asset: s.asset, assetType: s.assetType });
    }

    const yahooSymbols = [...fetchMap.keys()];

    await Promise.allSettled(
      yahooSymbols.map(async (sym) => {
        const entry = fetchMap.get(sym)!;
        const key = `${entry.assetType}:${entry.asset}`;
        try {
          const quote = await yahooFinance.quote(sym);
          const price =
            quote?.regularMarketPrice ??
            quote?.ask ??
            quote?.bid ??
            null;
          if (price != null) {
            cache.set(key, { price, expiresAt: now + CACHE_TTL_MS });
            results.set(key, { symbol: entry.asset, price });
          } else {
            results.set(key, { symbol: entry.asset, price: null, error: "No price available" });
          }
        } catch (err) {
          results.set(key, {
            symbol: entry.asset,
            price: null,
            error: err instanceof Error ? err.message : "Fetch failed",
          });
        }
      }),
    );
  }

  return symbols.map((s) => {
    const key = `${s.assetType}:${s.asset}`;
    return results.get(key) ?? { symbol: s.asset, price: null, error: "Not fetched" };
  });
}
