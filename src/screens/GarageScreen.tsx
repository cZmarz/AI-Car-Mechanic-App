import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Vehicle } from '../types';
import { useAppData } from '../context/AppDataContext';
import { type ColorScheme } from '../theme/colors';
import VehicleFormModal from '../components/VehicleFormModal';

export default function GarageScreen() {
  const insets = useSafeAreaInsets();
  const { colors, vehicles, activeVehicleId, setActiveVehicleId, addVehicle, updateVehicle, deleteVehicle } =
    useAppData();
  const styles = makeStyles(colors);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);

  function openAdd() {
    setEditing(null);
    setFormVisible(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setFormVisible(true);
  }

  function handleSave(data: Omit<Vehicle, 'id'>) {
    if (editing) {
      updateVehicle({ ...data, id: editing.id });
    } else {
      addVehicle(data).then((created) => {
        if (!activeVehicleId) setActiveVehicleId(created.id);
      });
    }
    setFormVisible(false);
  }

  function confirmDelete(vehicle: Vehicle) {
    Alert.alert('Remove vehicle', `Remove ${vehicle.year} ${vehicle.make} ${vehicle.model} from your garage?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteVehicle(vehicle.id) },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Garage</Text>
        <Pressable style={styles.addButton} onPress={openAdd}>
          <Ionicons name="add" size={22} color={colors.primaryText} />
        </Pressable>
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No vehicles yet. Add one to start scanning.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.id === activeVehicleId;
          return (
            <Pressable
              style={[styles.card, isActive && styles.cardActive]}
              onPress={() => setActiveVehicleId(item.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {item.year} {item.make} {item.model}
                </Text>
                {isActive ? (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Active</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.detailGrid}>
                <Detail label="Engine" value={item.engine || '—'} colors={colors} />
                <Detail label="Fuel" value={item.fuelType} colors={colors} />
                <Detail label="Reg" value={item.registration || '—'} colors={colors} />
                <Detail label="Mileage" value={item.mileage ? `${item.mileage} mi` : '—'} colors={colors} />
              </View>

              <View style={styles.cardActions}>
                <Pressable style={styles.actionButton} onPress={() => openEdit(item)}>
                  <Ionicons name="pencil" size={16} color={colors.textMuted} />
                  <Text style={styles.actionText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => confirmDelete(item)}>
                  <Ionicons name="trash" size={16} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>Remove</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      <VehicleFormModal
        visible={formVisible}
        initialValue={editing}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

function Detail({ label, value, colors }: { label: string; value: string; colors: ColorScheme }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: { padding: 16, gap: 12 },
    empty: { alignItems: 'center', marginTop: 64, gap: 12, paddingHorizontal: 32 },
    emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    cardActive: { borderColor: colors.primary },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
    activePill: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    activePillText: { color: colors.primaryText, fontSize: 11, fontWeight: '700' },
    detailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 12 },
    detailItem: { width: '45%' },
    detailLabel: { color: colors.textMuted, fontSize: 11 },
    detailValue: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 2 },
    cardActions: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  });
}
