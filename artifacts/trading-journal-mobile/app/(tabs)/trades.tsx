import {
  useListTrades,
  useDeleteTrade,
  getListTradesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
  PanResponder,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import type { Trade } from "@workspace/api-client-react";

const SWIPE_THRESHOLD = -80;

function SwipeableTradeRow({
  trade,
  onDelete,
  onPress,
}: {
  trade: Trade;
  onDelete: () => void;
  onPress: () => void;
}) {
  const colors = useColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dy) < 30,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          translateX.setValue(Math.max(gesture.dx, SWIPE_THRESHOLD - 10));
        } else if (swiped) {
          translateX.setValue(Math.min(gesture.dx + SWIPE_THRESHOLD, 0));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < SWIPE_THRESHOLD / 2) {
          Animated.spring(translateX, { toValue: SWIPE_THRESHOLD, useNativeDriver: true }).start();
          setSwiped(true);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          setSwiped(false);
        }
      },
    })
  ).current;

  const resetSwipe = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setSwiped(false);
  };

  const pnl = trade.pnl ?? 0;
  const isClosed = trade.exitPrice != null;

  return (
    <View style={styles.swipeContainer}>
      <View style={[styles.deleteBackground, { backgroundColor: "#FF4444" }]}>
        <Feather name="trash-2" size={20} color="#fff" />
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <Pressable
          style={[styles.tradeRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            if (swiped) { resetSwipe(); return; }
            onPress();
          }}
        >
          <View style={styles.tradeLeft}>
            <View style={[
              styles.directionBadge,
              { backgroundColor: trade.direction === "long" ? "#00FF4115" : "#FF444415" }
            ]}>
              <Feather
                name={trade.direction === "long" ? "trending-up" : "trending-down"}
                size={14}
                color={trade.direction === "long" ? "#00FF41" : "#FF4444"}
              />
            </View>
            <View>
              <Text style={[styles.tradeAsset, { color: colors.foreground }]}>{trade.asset}</Text>
              <Text style={[styles.tradeMeta, { color: colors.mutedForeground }]}>
                {trade.assetType} · {trade.direction} · {new Date(trade.entryDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={styles.tradeRight}>
            {isClosed ? (
              <Text style={[styles.tradePnl, { color: pnl >= 0 ? "#00FF41" : "#FF4444" }]}>
                {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
              </Text>
            ) : (
              <View style={[styles.openBadge, { backgroundColor: "#00FF4115" }]}>
                <Text style={[styles.openText, { color: "#00FF41" }]}>OPEN</Text>
              </View>
            )}
            <Text style={[styles.tradeSub, { color: colors.mutedForeground }]}>
              {trade.quantity} @ ${trade.entryPrice}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
      {swiped && (
        <Pressable
          style={styles.deleteButton}
          onPress={() => {
            resetSwipe();
            onDelete();
          }}
        >
          <Feather name="trash-2" size={20} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

export default function TradesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<"all" | "long" | "short">("all");

  const { data: trades = [], isLoading, refetch, isRefetching } = useListTrades();
  const { mutate: deleteTrade } = useDeleteTrade();

  const filtered = filter === "all" ? trades : trades.filter((t) => t.direction === filter);

  const handleDelete = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete Trade", "Remove this trade from your journal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteTrade({ id }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() });
            },
          });
        },
      },
    ]);
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.heading, { color: colors.foreground }]}>Trades</Text>
        <Pressable
          style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
          onPress={() => router.push("/add-trade" as any)}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <View style={[styles.filterRow, { borderColor: colors.border }]}>
        {(["all", "long", "short"] as const).map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterBtn,
              filter === f && { backgroundColor: colors.primary },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterText,
              { color: filter === f ? colors.primaryForeground : colors.mutedForeground },
            ]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
            flexGrow: 1,
          }}
          refreshControl={<RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          scrollEnabled={!!filtered.length}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <SwipeableTradeRow
              trade={item}
              onDelete={() => handleDelete(item.id)}
              onPress={() => router.push(`/trade/${item.id}` as any)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="inbox" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No trades yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Tap + to log your first trade
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  heading: { fontSize: 26, fontFamily: "Inter_700Bold" },
  addButton: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, borderRadius: 10, borderWidth: 1, padding: 3, gap: 3 },
  filterBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: "center" },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  swipeContainer: { position: "relative" },
  deleteBackground: { position: "absolute", right: 0, top: 0, bottom: 0, width: 80, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  deleteButton: { position: "absolute", right: 0, top: 0, bottom: 0, width: 80, alignItems: "center", justifyContent: "center" },
  tradeRow: { borderRadius: 10, borderWidth: 1, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tradeLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  directionBadge: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tradeAsset: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  tradeMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  tradeRight: { alignItems: "flex-end", gap: 4 },
  tradePnl: { fontSize: 16, fontFamily: "Inter_700Bold" },
  openBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  openText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  tradeSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_500Medium" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  pressed: { opacity: 0.75 },
});
