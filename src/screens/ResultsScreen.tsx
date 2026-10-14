import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ScanStackParamList } from '../navigation/types';
import type { DiagnosisIssue } from '../types';
import { useAppData } from '../context/AppDataContext';
import { getSeverityColor, type ColorScheme } from '../theme/colors';
import DiagnosisCard from '../components/DiagnosisCard';

type Props = NativeStackScreenProps<ScanStackParamList, 'Results'>;

function formatCost({ min, max }: { min: number; max: number }): string {
  const format = (n: number) => `£${n.toLocaleString('en-GB')}`;
  return min === max ? format(min) : `${format(min)} – ${format(max)}`;
}

export default function ResultsScreen({ route, navigation }: Props) {
  const { scan } = route.params;
  const { colors, updateScanNotes } = useAppData();
  const styles = makeStyles(colors);
  const severityColor = getSeverityColor(colors);
  const [notes, setNotes] = useState(scan.notes);
  const [saved, setSaved] = useState(false);

  const diagnosis = scan.diagnosis;
  const primary: DiagnosisIssue | undefined = diagnosis?.issues[0];
  const others = diagnosis?.issues.slice(1) ?? [];

  function handleSave() {
    updateScanNotes(scan.id, notes);
    setSaved(true);
  }

  async function handleShare() {
    if (!primary || !diagnosis) return;
    const disclaimer =
      scan.source === 'audio'
        ? 'Experimental audio-based analysis, not a certified diagnosis.'
        : 'AI-generated diagnosis, not a certified diagnosis.';
    const message = `AI Car Mechanic — Scan result for ${scan.vehicleLabel}\n\n${diagnosis.summary}\n\nMost likely: ${primary.fault} (${primary.probability}% confidence, ${primary.severity} severity)\n${primary.explanation}\n\nEst. cost: ${formatCost(primary.estimatedCostGBP)} — ${primary.typicalRepairTime}\n\n(${disclaimer})`;
    try {
      await Share.share({ message });
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  }

  function handleFindGarage() {
    Alert.alert('Coming soon', 'Nearby Garages will be available in a future update.');
  }

  function handleScanAgain() {
    navigation.replace('Scan');
  }

  if (!diagnosis || !primary) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="help-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.blockTitle}>No diagnosis available</Text>
        <Pressable style={styles.primaryButton} onPress={handleScanAgain}>
          <Text style={styles.primaryButtonText}>Scan Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.experimentalBanner}>
        <Ionicons name="flask-outline" size={14} color={colors.medium} />
        <Text style={styles.experimentalBannerText}>
          {scan.source === 'audio'
            ? 'Experimental audio analysis — treat as a rough guide'
            : 'AI-generated diagnosis — always confirm with a qualified mechanic'}
        </Text>
      </View>

      <Text style={styles.vehicleLabel}>{scan.vehicleLabel}</Text>
      <Text style={styles.summary}>{diagnosis.summary}</Text>

      {/* Fault */}
      <Section title="Most likely fault">
        <View style={styles.faultHeader}>
          <Text style={styles.faultName}>{primary.fault}</Text>
          <View style={[styles.severityPill, { backgroundColor: severityColor[primary.severity] }]}>
            <Text style={styles.severityText}>{primary.severity}</Text>
          </View>
        </View>
        <Text style={styles.confidence}>{primary.probability}% confidence</Text>
        <Text style={styles.description}>{primary.explanation}</Text>
      </Section>

      {/* Safety */}
      <Section title="Safety">
        <Row
          colors={colors}
          label="Safe to drive"
          value={primary.safeToDrive ? 'Yes' : 'No'}
          valueColor={primary.safeToDrive ? colors.low : colors.high}
        />
        <Row
          colors={colors}
          label="Immediate action required"
          value={primary.immediateActionRequired ? 'Yes' : 'No'}
          valueColor={primary.immediateActionRequired ? colors.high : colors.text}
        />
        <Row
          colors={colors}
          label="Est. remaining safe distance"
          value={primary.estimatedSafeDistanceMiles != null ? `${primary.estimatedSafeDistanceMiles} miles` : 'Not limited'}
        />
      </Section>

      {/* Costs */}
      <Section title="Costs">
        <Row colors={colors} label="Estimated repair cost" value={formatCost(primary.estimatedCostGBP)} />
        <Row colors={colors} label="Typical repair time" value={primary.typicalRepairTime} />
      </Section>

      {/* Evidence */}
      <Section title="Evidence">
        <Text style={styles.evidenceLabel}>Why the AI chose this</Text>
        <Text style={styles.evidenceText}>{primary.whyChosen || primary.explanation}</Text>
        <Text style={[styles.evidenceLabel, { marginTop: 10 }]}>Similar cases detected</Text>
        <Text style={styles.evidenceText}>{diagnosis.similarCasesNote}</Text>
      </Section>

      {others.length > 0 ? (
        <Section title="Other possibilities">
          {others.map((issue, i) => (
            <DiagnosisCard key={i} issue={issue} />
          ))}
        </Section>
      ) : null}

      {/* Notes + Save */}
      <Section title="Notes">
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={(t) => {
            setNotes(t);
            setSaved(false);
          }}
          placeholder="Add any notes about this scan…"
          placeholderTextColor={colors.textMuted}
          multiline
        />
      </Section>

      {/* Actions */}
      <View style={styles.actionsGrid}>
        <ActionButton colors={colors} icon="build-outline" label="Find Garage" onPress={handleFindGarage} />
        <ActionButton
          colors={colors}
          icon={saved ? 'checkmark-circle' : 'save-outline'}
          label={saved ? 'Saved' : 'Save Report'}
          onPress={handleSave}
        />
        <ActionButton colors={colors} icon="share-outline" label="Share Report" onPress={handleShare} />
        <ActionButton colors={colors} icon="refresh-outline" label="Scan Again" onPress={handleScanAgain} />
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useAppData();
  const styles = makeStyles(colors);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  colors,
  label,
  value,
  valueColor,
}: {
  colors: ColorScheme;
  label: string;
  value: string;
  valueColor?: string;
}) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function ActionButton({
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
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    centeredContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 12,
    },
    blockTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
    primaryButton: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
    primaryButtonText: { color: colors.primaryText, fontSize: 15, fontWeight: '700' },
    experimentalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 12,
    },
    experimentalBannerText: { color: colors.medium, fontSize: 12, fontWeight: '600', flexShrink: 1 },
    vehicleLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    summary: { color: colors.text, fontSize: 15, lineHeight: 21, marginTop: 4, marginBottom: 4 },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginTop: 14,
    },
    sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
    faultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    faultName: { color: colors.text, fontSize: 18, fontWeight: '700', flexShrink: 1, marginRight: 8 },
    severityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    severityText: { color: '#101114', fontSize: 11, fontWeight: '700' },
    confidence: { color: colors.primary, fontSize: 14, fontWeight: '700', marginTop: 6 },
    description: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    rowLabel: { color: colors.textMuted, fontSize: 13 },
    rowValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
    evidenceLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
    evidenceText: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 4 },
    notesInput: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      color: colors.text,
      fontSize: 14,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
    actionButton: {
      flexBasis: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 6,
    },
    actionButtonText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  });
}
