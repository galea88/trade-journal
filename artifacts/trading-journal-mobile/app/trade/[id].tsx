import {
  useGetTrade,
  useUpdateTrade,
  useListStrategies,
  getListTradesQueryKey,
  getGetTradeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

type AssetType = "stock" | "forex" | "crypto";
type Direction = "long" | "short";

function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  colors: c,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[segStyles.row, { borderColor: c.border }]}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          style={[segStyles.btn, value === opt && { backgroundColor: c.primary }]}
          onPress={() => onChange(opt)}
        >
          <Text style={[segStyles.text, { color: value === opt ? c.primaryForeground : c.mutedForeground }]}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const segStyles = StyleSheet.create({
  row: { flexDirection: "row", borderWidth: 1, borderRadius: 8, padding: 3, gap: 3 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  text: { fontSize: 13, fontFamily: "Inter_500Medium" },
});

export default function EditTradeScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tradeId = Number(id);

  const { data: trade, isLoading } = useGetTrade(tradeId);
  const { data: strategies = [] } = useListStrategies();
  const { mutate: updateTrade, isPending } = useUpdateTrade();

  const [asset, setAsset] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [direction, setDirection] = useState<Direction>("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [fees, setFees] = useState("0");
  const [entryDate, setEntryDate] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [notes, setNotes] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [strategyId, setStrategyId] = useState<number | null>(null);

  useEffect(() => {
    if (trade) {
      setAsset(trade.asset);
      setAssetType(trade.assetType as AssetType);
      setDirection(trade.direction as Direction);
      setEntryPrice(trade.entryPrice);
      setExitPrice(trade.exitPrice ?? "");
      setQuantity(trade.quantity);
      setFees(trade.fees);
      setEntryDate(trade.entryDate.split("T")[0]);
      setExitDate(trade.exitDate ? trade.exitDate.split("T")[0] : "");
      setNotes(trade.notes ?? "");
      setStopLoss(trade.stopLoss ?? "");
      setTakeProfit(trade.takeProfit ?? "");
      setStrategyId(trade.strategyId ?? null);
    }
  }, [trade]);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateTrade(
      {
        id: tradeId,
        data: {
          asset: asset.trim().toUpperCase(),
          assetType,
          direction,
          entryPrice,
          exitPrice: exitPrice || null,
          quantity,
          fees: fees || "0",
          entryDate: new Date(entryDate).toISOString(),
          exitDate: exitDate ? new Date(exitDate).toISOString() : null,
          notes: notes || null,
          stopLoss: stopLoss || null,
          takeProfit: takeProfit || null,
          strategyId: strategyId ?? null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTradeQueryKey(tradeId) });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: () => {
          Alert.alert("Error", "Failed to update trade. Please try again.");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!trade) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Trade not found</Text>
      </View>
    );
  }

  const pnl = trade.pnl;
  const inputStyle = [styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }];

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      {pnl !== null && pnl !== undefined && (
        <View style={[styles.pnlBanner, { backgroundColor: pnl >= 0 ? "#00FF4115" : "#FF444415", borderColor: pnl >= 0 ? "#00FF4130" : "#FF444430" }]}>
          <Text style={[styles.pnlBannerText, { color: pnl >= 0 ? "#00FF41" : "#FF4444" }]}>
            P&L: {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
          </Text>
          {trade.riskReward && (
            <Text style={[styles.pnlBannerSub, { color: colors.mutedForeground }]}>R:R {trade.riskReward.toFixed(2)}</Text>
          )}
        </View>
      )}

      <Field label="ASSET">
        <TextInput style={inputStyle} value={asset} onChangeText={setAsset} placeholder="AAPL" placeholderTextColor={colors.mutedForeground} autoCapitalize="characters" />
      </Field>

      <Field label="ASSET TYPE">
        <SegmentControl options={["stock", "forex", "crypto"] as AssetType[]} value={assetType} onChange={setAssetType} colors={colors} />
      </Field>

      <Field label="DIRECTION">
        <SegmentControl options={["long", "short"] as Direction[]} value={direction} onChange={setDirection} colors={colors} />
      </Field>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="ENTRY PRICE">
            <TextInput style={inputStyle} value={entryPrice} onChangeText={setEntryPrice} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="EXIT PRICE">
            <TextInput style={inputStyle} value={exitPrice} onChangeText={setExitPrice} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
          </Field>
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="QUANTITY">
            <TextInput style={inputStyle} value={quantity} onChangeText={setQuantity} placeholder="100" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="FEES">
            <TextInput style={inputStyle} value={fees} onChangeText={setFees} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
          </Field>
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="ENTRY DATE">
            <TextInput style={inputStyle} value={entryDate} onChangeText={setEntryDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="EXIT DATE">
            <TextInput style={inputStyle} value={exitDate} onChangeText={setExitDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />
          </Field>
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="STOP LOSS">
            <TextInput style={inputStyle} value={stopLoss} onChangeText={setStopLoss} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="TAKE PROFIT">
            <TextInput style={inputStyle} value={takeProfit} onChangeText={setTakeProfit} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
          </Field>
        </View>
      </View>

      {strategies.length > 0 && (
        <Field label="STRATEGY">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.strategyRow}>
              <Pressable
                style={[styles.strategyChip, strategyId === null && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setStrategyId(null)}
              >
                <Text style={[styles.strategyChipText, { color: strategyId === null ? colors.primaryForeground : colors.mutedForeground }]}>None</Text>
              </Pressable>
              {strategies.map((s) => (
                <Pressable
                  key={s.id}
                  style={[styles.strategyChip, { borderColor: colors.border }, strategyId === s.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setStrategyId(s.id)}
                >
                  <Text style={[styles.strategyChipText, { color: strategyId === s.id ? colors.primaryForeground : colors.mutedForeground }]}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Field>
      )}

      <Field label="NOTES">
        <TextInput style={[inputStyle, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Setup notes..." placeholderTextColor={colors.mutedForeground} multiline numberOfLines={3} />
      </Field>

      <Pressable
        style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.primary }, pressed && styles.pressed, isPending && styles.disabled]}
        onPress={handleSave}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="save" size={18} color={colors.primaryForeground} />
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Save Changes</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  pnlBanner: { borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pnlBannerText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  pnlBannerSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  field: { marginBottom: 14 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { height: 70, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  strategyRow: { flexDirection: "row", gap: 8 },
  strategyChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  strategyChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 16, marginTop: 8 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
