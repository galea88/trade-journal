import {
  useListStrategies,
  useCreateStrategy,
  useDeleteStrategy,
  getListStrategiesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import type { Strategy } from "@workspace/api-client-react";

function StrategyCard({ strategy, onDelete }: { strategy: Strategy; onDelete: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.strategyIcon, { backgroundColor: "#00FF4115" }]}>
        <Feather name="zap" size={18} color="#00FF41" />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.strategyName, { color: colors.foreground }]}>{strategy.name}</Text>
        {strategy.description && (
          <Text style={[styles.strategyDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {strategy.description}
          </Text>
        )}
        <Text style={[styles.strategyDate, { color: colors.mutedForeground }]}>
          Added {new Date(strategy.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
        onPress={onDelete}
      >
        <Feather name="trash-2" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

export default function PlaybookScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: strategies = [], isLoading, refetch, isRefetching } = useListStrategies();
  const { mutate: createStrategy, isPending } = useCreateStrategy();
  const { mutate: deleteStrategy } = useDeleteStrategy();

  const handleCreate = () => {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createStrategy(
      { data: { name: name.trim(), description: description.trim() || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStrategiesQueryKey() });
          setName("");
          setDescription("");
          setShowModal(false);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete Strategy", "Remove this strategy from your playbook?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteStrategy({ id }, {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: getListStrategiesQueryKey() }),
          });
        },
      },
    ]);
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <View>
          <Text style={[styles.heading, { color: colors.foreground }]}>Playbook</Text>
          <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
            {strategies.length} {strategies.length === 1 ? "strategy" : "strategies"}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
          onPress={() => setShowModal(true)}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={strategies}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
            flexGrow: 1,
          }}
          refreshControl={<RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          scrollEnabled={!!strategies.length}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <StrategyCard strategy={item} onDelete={() => handleDelete(item.id)} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="book-open" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No strategies yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Tap + to document your first setup
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalWrapper}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Strategy</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Breakout Momentum"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the setup, rules, and criteria..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
            />
            <Pressable
              style={({ pressed }) => [
                styles.createBtn, { backgroundColor: colors.primary },
                pressed && styles.pressed,
                (!name.trim() || isPending) && styles.disabled,
              ]}
              onPress={handleCreate}
              disabled={!name.trim() || isPending}
            >
              {isPending ? <ActivityIndicator color="#000" /> : <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>Save Strategy</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingBottom: 16 },
  heading: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subheading: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  addButton: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  strategyIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1 },
  strategyName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  strategyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4, lineHeight: 18 },
  strategyDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  deleteBtn: { padding: 6 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_500Medium" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  modalWrapper: { backgroundColor: "transparent" },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 14 },
  textArea: { height: 80, textAlignVertical: "top" },
  createBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  createBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
});
