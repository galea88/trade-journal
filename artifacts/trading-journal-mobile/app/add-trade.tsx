import {
  useCreateTrade,
  useListStrategies,
  getListTradesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

export default function AddTradeScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: strategies = [] } = useListStrategies();
  const { mutate: createTrade, isPending } = useCreateTrade();

  const [asset, setAsset] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [direction, setDirection] = useState<Direction>("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [fees, setFees] = useState("0");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [exitDate, setExitDate] = useState("");
  const [notes, setNotes] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [strategyId, setStrategyId] = useState<number | null>(null);

  const isValid = asset.trim() && entryPrice && quantity && entryDate;

  const handleSubmit = () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    createTrade(
      {
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
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: () => {
          Alert.alert("Error", "Failed to save trade. Please try again.");
        },
      }
    );
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );

  const inputStyle = [styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Field label="ASSET">
        <TextInput
          style={inputStyle}
          value={asset}
          onChangeText={setAsset}
          placeholder="AAPL, EURUSD, BTC..."
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="characters"
        />
      </Field>

      <Field label="ASSET TYPE">
        <SegmentControl options={["stock", "forex", "crypto"] as AssetType[]} value={assetType} onChange={setAssetType} colors={colors} />
      </Field>

      <Field label="DIRECTION">
        <SegmentControl options={["long", "short"] as Direction[]} value={direction} onChange={setDirection} colors={colors} />
      </Field>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="ENTRY PRICE *">
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
          <Field label="QUANTITY *">
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
          <Field label="ENTRY DATE *">
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
        <TextInput
          style={[inputStyle, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Setup notes, observations..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={3}
        />
      </Field>

      <Pressable
        style={({ pressed }) => [
          styles.submitBtn,
          { backgroundColor: isValid ? colors.primary : colors.muted },
          pressed && styles.pressed,
          !isValid && styles.disabled,
        ]}
        onPress={handleSubmit}
        disabled={!isValid || isPending}
      >
        {isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="check" size={18} color={isValid ? colors.primaryForeground : colors.mutedForeground} />
            <Text style={[styles.submitText, { color: isValid ? colors.primaryForeground : colors.mutedForeground }]}>
              Log Trade
            </Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  field: { marginBottom: 14 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { height: 70, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  strategyRow: { flexDirection: "row", gap: 8 },
  strategyChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#1f1f1f" },
  strategyChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 16, marginTop: 8 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
