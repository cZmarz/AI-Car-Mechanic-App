import { StyleSheet, Text, View } from 'react-native';
import type { CostEstimateGBP, DiagnosisIssue } from '../types';
import { useAppData } from '../context/AppDataContext';
import { getSeverityColor, type ColorScheme } from '../theme/colors';

function formatCostRange({ min, max }: CostEstimateGBP): string {
  const format = (n: number) => `£${n.toLocaleString('en-GB')}`;
  return min === max ? format(min) : `${format(min)} – ${format(max)}`;
}

export default function DiagnosisCard({ issue }: { issue: DiagnosisIssue }) {
  const { colors } = useAppData();
  const styles = makeStyles(colors);
  const severityColor = getSeverityColor(colors);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.fault}>{issue.fault}</Text>
        <View style={[styles.severityPill, { backgroundColor: severityColor[issue.severity] }]}>
          <Text style={styles.severityText}>{issue.severity}</Text>
        </View>
      </View>

      <View style={styles.probabilityRow}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${issue.probability}%` }]} />
        </View>
        <Text style={styles.probabilityText}>{issue.probability}%</Text>
      </View>

      {issue.explanation ? <Text style={styles.explanation}>{issue.explanation}</Text> : null}

      <View style={styles.costRow}>
        <View>
          <Text style={styles.costLabel}>Est. repair cost (UK)</Text>
          <Text style={styles.costValue}>{formatCostRange(issue.estimatedCostGBP)}</Text>
        </View>
        <View style={styles.costRowRight}>
          <Text style={styles.costLabel}>Typical time</Text>
          <Text style={styles.costValue}>{issue.typicalRepairTime}</Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    fault: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
      flexShrink: 1,
      marginRight: 8,
    },
    severityPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    severityText: {
      color: '#101114',
      fontSize: 11,
      fontWeight: '700',
    },
    probabilityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    barTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 3,
    },
    probabilityText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      width: 36,
      textAlign: 'right',
    },
    explanation: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 6,
      lineHeight: 18,
    },
    costRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    costRowRight: {
      alignItems: 'flex-end',
    },
    costLabel: {
      color: colors.textMuted,
      fontSize: 12,
    },
    costValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginTop: 2,
    },
  });
}
