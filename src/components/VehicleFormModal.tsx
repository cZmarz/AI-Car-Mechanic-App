import { useEffect, useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { FuelType, Vehicle } from '../types';
import { useAppData } from '../context/AppDataContext';
import { type ColorScheme } from '../theme/colors';

const FUEL_TYPES: FuelType[] = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Other'];

const BLANK = { make: '', model: '', year: '', engine: '', fuelType: 'Petrol' as FuelType, registration: '', mileage: '' };

interface Props {
  visible: boolean;
  initialValue: Vehicle | null; // null = adding a new vehicle
  onClose: () => void;
  onSave: (vehicle: Omit<Vehicle, 'id'>) => void;
}

export default function VehicleFormModal({ visible, initialValue, onClose, onSave }: Props) {
  const { colors } = useAppData();
  const styles = makeStyles(colors);
  const [form, setForm] = useState(BLANK);

  useEffect(() => {
    if (visible) {
      setForm(initialValue ? { ...initialValue } : BLANK);
    }
  }, [visible, initialValue]);

  const canSave = form.make.trim() && form.model.trim() && form.year.trim();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!canSave) return;
    onSave({
      make: form.make.trim(),
      model: form.model.trim(),
      year: form.year.trim(),
      engine: form.engine.trim(),
      fuelType: form.fuelType,
      registration: form.registration.trim().toUpperCase(),
      mileage: form.mileage.trim(),
    });
  }

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={Keyboard.dismiss}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{initialValue ? 'Edit vehicle' : 'Add vehicle'}</Text>

          <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
            <Field label="Make *" value={form.make} onChangeText={(v) => set('make', v)} placeholder="Honda" colors={colors} />
            <Field label="Model *" value={form.model} onChangeText={(v) => set('model', v)} placeholder="Civic" colors={colors} />
            <Field
              label="Year *"
              value={form.year}
              onChangeText={(v) => set('year', v)}
              placeholder="2016"
              keyboardType="number-pad"
              maxLength={4}
              colors={colors}
            />
            <Field
              label="Engine"
              value={form.engine}
              onChangeText={(v) => set('engine', v)}
              placeholder="1.6 VTEC"
              colors={colors}
            />

            <Text style={styles.label}>Fuel type</Text>
            <View style={styles.chipRow}>
              {FUEL_TYPES.map((ft) => (
                <Pressable
                  key={ft}
                  style={[styles.chip, form.fuelType === ft && styles.chipActive]}
                  onPress={() => set('fuelType', ft)}
                >
                  <Text style={[styles.chipText, form.fuelType === ft && styles.chipTextActive]}>{ft}</Text>
                </Pressable>
              ))}
            </View>

            <Field
              label="Registration"
              value={form.registration}
              onChangeText={(v) => set('registration', v)}
              placeholder="AB12 CDE"
              autoCapitalize="characters"
              colors={colors}
            />
            <Field
              label="Mileage"
              value={form.mileage}
              onChangeText={(v) => set('mileage', v)}
              placeholder="45000"
              keyboardType="number-pad"
              colors={colors}
            />
          </ScrollView>

          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, !canSave && styles.primaryButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={styles.primaryButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function Field({
  label,
  colors,
  ...inputProps
}: {
  label: string;
  colors: ColorScheme;
} & React.ComponentProps<typeof TextInput>) {
  const styles = makeStyles(colors);
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.textMuted} {...inputProps} />
    </>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '85%',
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
    },
    scroll: {
      flexGrow: 0,
    },
    label: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 15,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    chipTextActive: {
      color: colors.primaryText,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 20,
      paddingBottom: 12,
    },
    secondaryButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    secondaryButtonText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
    },
    primaryButtonDisabled: {
      opacity: 0.4,
    },
    primaryButtonText: {
      color: colors.primaryText,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
