import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useAppData } from '../context/AppDataContext';
import { getSeverityColor, type ColorScheme } from '../theme/colors';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

function timeAgo(ms: number): string {
  const diffMinutes = Math.floor((Date.now() - ms) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, vehicles, activeVehicle, setActiveVehicleId, scans, pendingScans, profile } = useAppData();
  const styles = makeStyles(colors);
  const severityColor = getSeverityColor(colors);
  const [vehiclePickerVisible, setVehiclePickerVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const recentScans = useMemo(() => scans.slice(0, 3), [scans]);
  const aiReady = Boolean(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

  function goToScan() {
    navigation.getParent()?.navigate('ScanFlow', { screen: 'Scan' });
  }

  function goToPendingScan(pendingScanId: string) {
    navigation.getParent()?.navigate('ScanFlow', { screen: 'Processing', params: { mode: 'audio', pendingScanId } });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{profile.name ? `Hi, ${profile.name.split(' ')[0]}` : 'AI Car Mechanic'}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: aiReady ? colors.low : colors.medium }]} />
            <Text style={styles.statusText}>{aiReady ? 'AI Ready' : 'AI Not Configured'}</Text>
          </View>
        </View>
        <Pressable style={styles.bellButton} onPress={() => setNotificationsVisible(true)}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {pendingScans.length > 0 ? (
          <View style={styles.pendingBanner}>
            {pendingScans.map((p) => (
              <Pressable key={p.id} style={styles.pendingRow} onPress={() => goToPendingScan(p.id)}>
                <Ionicons
                  name={p.status === 'failed' ? 'alert-circle' : 'sync'}
                  size={18}
                  color={p.status === 'failed' ? colors.danger : colors.medium}
                />
                <View style={styles.pendingTextWrap}>
                  <Text style={styles.pendingTitle}>
                    {p.status === 'failed' ? 'Scan failed — tap to retry' : 'Scan pending — retrying automatically'}
                  </Text>
                  <Text style={styles.pendingMeta}>{p.vehicleLabel}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <Pressable style={styles.vehicleSelector} onPress={() => setVehiclePickerVisible(true)}>
          <Ionicons name="car" size={18} color={colors.primary} />
          <Text style={styles.vehicleSelectorText}>
            {activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : 'Select a vehicle'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </Pressable>

        <Pressable style={styles.scanButton} onPress={goToScan}>
          <Ionicons name="mic" size={40} color={colors.primaryText} />
          <Text style={styles.scanButtonText}>Start Scan</Text>
        </Pressable>

        <View style={styles.quickActionsRow}>
          <QuickAction
            colors={colors}
            icon="car-outline"
            label="My Garage"
            onPress={() => navigation.navigate('Garage')}
          />
          <QuickAction
            colors={colors}
            icon="time-outline"
            label="History"
            onPress={() => navigation.navigate('History')}
          />
          <QuickAction
            colors={colors}
            icon="person-outline"
            label="Profile"
            onPress={() => navigation.navigate('ProfileStack', { screen: 'Profile' })}
          />
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Previous Scans</Text>
          <Pressable onPress={() => navigation.navigate('History')}>
            <Text style={styles.sectionLink}>View all</Text>
          </Pressable>
        </View>

        {recentScans.length === 0 ? (
          <View style={styles.emptyScans}>
            <Text style={styles.emptyScansText}>No scans yet — tap Start Scan to run your first diagnosis.</Text>
          </View>
        ) : (
          recentScans.map((scan) => {
            const top = scan.diagnosis?.issues[0];
            return (
              <View key={scan.id} style={styles.scanCard}>
                <View style={styles.scanCardHeader}>
                  <Text style={styles.scanCardFault}>{top?.fault ?? 'Scan failed'}</Text>
                  {top ? (
                    <View style={[styles.severityPill, { backgroundColor: severityColor[top.severity] }]}>
                      <Text style={styles.severityText}>{top.severity}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.scanCardMeta}>
                  {scan.vehicleLabel} · {timeAgo(scan.createdAt)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Vehicle selector modal */}
      <Modal visible={vehiclePickerVisible} animationType="fade" transparent onRequestClose={() => setVehiclePickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setVehiclePickerVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select vehicle</Text>
            {vehicles.length === 0 ? (
              <Text style={styles.emptyScansText}>No vehicles yet.</Text>
            ) : (
              vehicles.map((v) => (
                <Pressable
                  key={v.id}
                  style={styles.vehicleOption}
                  onPress={() => {
                    setActiveVehicleId(v.id);
                    setVehiclePickerVisible(false);
                  }}
                >
                  <Text style={styles.vehicleOptionText}>
                    {v.year} {v.make} {v.model}
                  </Text>
                  {v.id === activeVehicle?.id ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </Pressable>
              ))
            )}
            <Pressable
              style={styles.manageGarageButton}
              onPress={() => {
                setVehiclePickerVisible(false);
                navigation.navigate('Garage');
              }}
            >
              <Text style={styles.manageGarageText}>Manage Garage</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Notifications modal */}
      <Modal visible={notificationsVisible} animationType="fade" transparent onRequestClose={() => setNotificationsVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setNotificationsVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <Text style={styles.emptyScansText}>You're all caught up — no notifications right now.</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function QuickAction({
  colors,
  icon,
  label,
  onPress,
}: {
  colors: ColorScheme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const styles = makeStyles(colors);
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
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
    },
    greeting: { color: colors.text, fontSize: 20, fontWeight: '700' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    bellButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { padding: 16, paddingBottom: 32 },
    pendingBanner: { gap: 8, marginBottom: 14 },
    pendingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    pendingTextWrap: { flex: 1 },
    pendingTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
    pendingMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    vehicleSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    vehicleSelectorText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
    scanButton: {
      alignSelf: 'center',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 28,
      marginBottom: 8,
      gap: 8,
    },
    scanButtonText: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
    quickActionsRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
    quickAction: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 6,
    },
    quickActionText: { color: colors.text, fontSize: 12, fontWeight: '600' },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 28,
      marginBottom: 10,
    },
    sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
    sectionLink: { color: colors.primary, fontSize: 13, fontWeight: '600' },
    emptyScans: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
    emptyScansText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
    scanCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
    },
    scanCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    scanCardFault: { color: colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1, marginRight: 8 },
    scanCardMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    severityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    severityText: { color: '#101114', fontSize: 11, fontWeight: '700' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalSheet: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.border },
    modalTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
    vehicleOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    vehicleOptionText: { color: colors.text, fontSize: 14, fontWeight: '600' },
    manageGarageButton: { marginTop: 12, alignItems: 'center' },
    manageGarageText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  });
}
