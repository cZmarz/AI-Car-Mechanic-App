import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { ScanRecord } from '../types';
import { useAppData } from '../context/AppDataContext';
import { getSeverityColor, type ColorScheme } from '../theme/colors';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'History'>,
  NativeStackScreenProps<RootStackParamList>
>;

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, scans, deleteScan } = useAppData();
  const styles = makeStyles(colors);
  const severityColor = getSeverityColor(colors);

  function confirmDelete(scan: ScanRecord) {
    Alert.alert('Delete scan', 'Remove this scan from your history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteScan(scan.id) },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan History</Text>
      </View>

      <FlatList
        data={scans}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No scans yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const top = item.diagnosis?.issues[0];
          return (
            <Pressable
              style={styles.card}
              onPress={() =>
                item.status === 'completed' &&
                navigation.getParent()?.navigate('ScanFlow', { screen: 'Results', params: { scan: item } })
              }
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <Ionicons
                    name={item.source === 'audio' ? 'mic' : 'chatbubble-ellipses'}
                    size={13}
                    color={colors.textMuted}
                  />
                  <Text style={styles.cardFault}>{top?.fault ?? 'Scan failed'}</Text>
                </View>
                <View style={styles.cardHeaderRight}>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: item.status === 'completed' ? colors.low : colors.high },
                    ]}
                  >
                    <Text style={styles.statusPillText}>{item.status === 'completed' ? 'Completed' : 'Failed'}</Text>
                  </View>
                  <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              <Text style={styles.cardMeta}>{item.vehicleLabel}</Text>
              <Text style={styles.cardMeta}>{formatDate(item.createdAt)}</Text>

              {top ? (
                <View style={styles.cardFooter}>
                  <View style={[styles.severityPill, { backgroundColor: severityColor[top.severity] }]}>
                    <Text style={styles.severityText}>{top.severity}</Text>
                  </View>
                  <Text style={styles.confidenceText}>{top.probability}% confidence</Text>
                </View>
              ) : null}

              {item.notes ? <Text style={styles.notes}>"{item.notes}"</Text> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
    listContent: { padding: 16 },
    empty: { alignItems: 'center', marginTop: 64, gap: 12 },
    emptyText: { color: colors.textMuted, fontSize: 14 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardFault: { color: colors.text, fontSize: 15, fontWeight: '700', flexShrink: 1, marginRight: 8 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    statusPillText: { color: '#101114', fontSize: 11, fontWeight: '700' },
    cardMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    severityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    severityText: { color: '#101114', fontSize: 11, fontWeight: '700' },
    confidenceText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    notes: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 8 },
  });
}
