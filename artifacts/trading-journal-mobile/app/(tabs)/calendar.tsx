import { useGetCalendarDaily } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import type { DailyPnl } from "@workspace/api-client-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { data: dailyData = [], isLoading, refetch } = useGetCalendarDaily(
    { year, month: month + 1 },
    { query: { queryKey: ["calendar", year, month] } }
  );

  const pnlByDate: Record<string, DailyPnl> = {};
  dailyData.forEach((d) => { pnlByDate[d.date] = d; });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const goBack = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const goForward = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPadding + 16, paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 }}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.heading, { color: colors.foreground }]}>Calendar</Text>
      </View>

      <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.navRow}>
          <Pressable onPress={goBack} style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: colors.foreground }]}>
            {MONTHS[month]} {year}
          </Text>
          <Pressable onPress={goForward} style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}>
            <Feather name="chevron-right" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.dayLabels}>
          {DAYS.map((d) => (
            <Text key={d} style={[styles.dayLabel, { color: colors.mutedForeground }]}>{d}</Text>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.grid}>
            {Array.from({ length: totalCells }, (_, i) => {
              const dayNum = i - firstDay + 1;
              const isValid = dayNum >= 1 && dayNum <= daysInMonth;
              const dateStr = isValid
                ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                : null;
              const pnlEntry = dateStr ? pnlByDate[dateStr] : null;
              const isToday = isValid && dayNum === now.getDate() && month === now.getMonth() && year === now.getFullYear();

              let cellBg = "transparent";
              let pnlText: string | null = null;
              if (pnlEntry) {
                cellBg = pnlEntry.pnl >= 0 ? "#00FF4120" : "#FF444420";
                pnlText = `${pnlEntry.pnl >= 0 ? "+" : ""}$${Math.abs(pnlEntry.pnl).toFixed(0)}`;
              }

              return (
                <View
                  key={i}
                  style={[
                    styles.cell,
                    { backgroundColor: cellBg },
                    isToday && { borderWidth: 1, borderColor: colors.primary },
                  ]}
                >
                  {isValid && (
                    <>
                      <Text style={[
                        styles.cellDay,
                        { color: isToday ? colors.primary : colors.foreground },
                      ]}>
                        {dayNum}
                      </Text>
                      {pnlEntry && (
                        <Text style={[
                          styles.cellPnl,
                          { color: pnlEntry.pnl >= 0 ? "#00FF41" : "#FF4444" },
                        ]}>
                          {pnlText}
                        </Text>
                      )}
                      {pnlEntry && (
                        <Text style={[styles.cellCount, { color: colors.mutedForeground }]}>
                          {pnlEntry.tradeCount}t
                        </Text>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={[styles.legend, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#00FF4150" }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Profitable day</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FF444450" }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Loss day</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { paddingHorizontal: 20, marginBottom: 16 },
  heading: { fontSize: 26, fontFamily: "Inter_700Bold" },
  calendarCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  navBtn: { padding: 6 },
  monthTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  dayLabels: { flexDirection: "row", marginBottom: 8 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontFamily: "Inter_500Medium" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.28%", aspectRatio: 1, borderRadius: 6, alignItems: "center", justifyContent: "center", padding: 2 },
  cellDay: { fontSize: 12, fontFamily: "Inter_500Medium" },
  cellPnl: { fontSize: 8, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  cellCount: { fontSize: 7, fontFamily: "Inter_400Regular" },
  legend: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", gap: 20 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  pressed: { opacity: 0.7 },
});
