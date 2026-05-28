import { useGetDashboardSummary } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useClerk } from "@clerk/expo";
import type { Trade } from "@workspace/api-client-react";

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean | null }) {
  const colors = useColors();
  const valueColor = positive === true ? colors.profit : positive === false ? colors.loss : colors.foreground;
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      {sub && <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{sub}</Text>}
    </View>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const colors = useColors();
  const router = useRouter();
  const pnl = trade.pnl ?? 0;
  const isProfit = pnl >= 0;
  const isClosed = trade.exitPrice != null;

  return (
    <Pressable
      style={({ pressed }) => [styles.tradeRow, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
      onPress={() => router.push(`/trade/${trade.id}` as any)}
    >
      <View style={styles.tradeLeft}>
        <View style={[styles.directionBadge, { backgroundColor: trade.direction === "long" ? "#00FF4120" : "#FF444420" }]}>
          <Feather name={trade.direction === "long" ? "trending-up" : "trending-down"} size={12} color={trade.direction === "long" ? "#00FF41" : "#FF4444"} />
        </View>
        <View>
          <Text style={[styles.tradeAsset, { color: colors.foreground }]}>{trade.asset}</Text>
          <Text style={[styles.tradeMeta, { color: colors.mutedForeground }]}>
            {trade.assetType} · {new Date(trade.entryDate).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.tradeRight}>
        {isClosed && (
          <Text style={[styles.tradePnl, { color: isProfit ? colors.profit : colors.loss }]}>
            {isProfit ? "+" : ""}${pnl.toFixed(2)}
          </Text>
        )}
        {!isClosed && <Text style={[styles.tradeOpen, { color: colors.mutedForeground }]}>Open</Text>}
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const router = useRouter();

  const { data: summary, isLoading, refetch, isRefetching } = useGetDashboardSummary();

  const totalPnl = summary?.totalPnl ?? 0;
  const winRate = (summary?.winRate ?? 0) * 100;
  const isRefreshing = isRefetching;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPadding + 16, paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 }}
      refreshControl={<RefreshControl refreshing={!!isRefreshing} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>NEXUS TRADING</Text>
          <Text style={[styles.heading, { color: colors.foreground }]}>Dashboard</Text>
        </View>
        <Pressable onPress={() => signOut()} style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={[styles.pnlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.pnlLabel, { color: colors.mutedForeground }]}>Total P&L</Text>
            <Text style={[styles.pnlValue, { color: totalPnl >= 0 ? colors.profit : colors.loss }]}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
            </Text>
            <Text style={[styles.pnlSub, { color: colors.mutedForeground }]}>
              {summary?.closedTrades ?? 0} closed · {summary?.openTrades ?? 0} open
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              label="Win Rate"
              value={`${winRate.toFixed(1)}%`}
              positive={winRate > 50 ? true : winRate < 40 ? false : null}
            />
            <StatCard label="Total Trades" value={`${summary?.totalTrades ?? 0}`} />
            <StatCard
              label="Avg Win"
              value={`$${(summary?.avgWin ?? 0).toFixed(2)}`}
              positive={true}
            />
            <StatCard
              label="Avg Loss"
              value={`$${(summary?.avgLoss ?? 0).toFixed(2)}`}
              positive={false}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Trades</Text>
            <Pressable onPress={() => router.push("/trades" as any)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>

          {(summary?.recentTrades ?? []).length === 0 ? (
            <View style={[styles.emptyState, { borderColor: colors.border }]}>
              <Feather name="activity" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No trades yet</Text>
              <Pressable
                style={[styles.addTradeBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/add-trade" as any)}
              >
                <Text style={[styles.addTradeBtnText, { color: colors.primaryForeground }]}>Log Your First Trade</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.tradeList, { borderColor: colors.border }]}>
              {(summary?.recentTrades ?? []).map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, marginBottom: 20 },
  greeting: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2, marginBottom: 2 },
  heading: { fontSize: 26, fontFamily: "Inter_700Bold" },
  signOutBtn: { padding: 8 },
  pnlCard: {
    marginHorizontal: 20, borderRadius: 12, padding: 20,
    borderWidth: 1, marginBottom: 16, alignItems: "center",
  },
  pnlLabel: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 1, marginBottom: 8 },
  pnlValue: { fontSize: 42, fontFamily: "Inter_700Bold", marginBottom: 4 },
  pnlSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  statCard: { flex: 1, minWidth: "45%", borderRadius: 10, borderWidth: 1, padding: 14 },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginBottom: 6 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 2 },
  statSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
  tradeList: { marginHorizontal: 20, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  tradeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: 1 },
  tradeLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  directionBadge: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  tradeAsset: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  tradeMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  tradeRight: { alignItems: "flex-end" },
  tradePnl: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  tradeOpen: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyState: { marginHorizontal: 20, borderRadius: 12, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_400Regular" },
  addTradeBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  addTradeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  pressed: { opacity: 0.7 },
});
