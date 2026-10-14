import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ScanStackParamList } from '../navigation/types';
import { useAppData } from '../context/AppDataContext';
import { getTextDiagnosis } from '../services/groq';
import { type ColorScheme } from '../theme/colors';

type Props = NativeStackScreenProps<ScanStackParamList, 'Processing'>;
type Styles = ReturnType<typeof makeStyles>;

function Spinner({ colors }: { colors: ColorScheme }) {
  const styles = makeStyles(colors);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.spinner, { borderColor: colors.primary, transform: [{ rotate: rotation }] }]}>
      <Ionicons name="pulse" size={28} color={colors.primary} />
    </Animated.View>
  );
}

export default function ProcessingScreen({ route, navigation }: Props) {
  const { colors } = useAppData();
  const styles = makeStyles(colors);

  if (route.params.mode === 'text') {
    return <TextProcessing text={route.params.text} colors={colors} styles={styles} navigation={navigation} />;
  }

  return <AudioProcessing pendingScanId={route.params.pendingScanId} colors={colors} styles={styles} navigation={navigation} />;
}

function AudioProcessing({
  pendingScanId,
  colors,
  styles,
  navigation,
}: {
  pendingScanId: string;
  colors: ColorScheme;
  styles: Styles;
  navigation: Props['navigation'];
}) {
  const { pendingScans, scans, retryPendingScan, discardPendingScan } = useAppData();
  const pending = pendingScans.find((p) => p.id === pendingScanId);
  const resolvedScan = useMemo(() => scans.find((s) => s.id === pendingScanId), [scans, pendingScanId]);

  useEffect(() => {
    if (resolvedScan) {
      navigation.replace('Results', { scan: resolvedScan });
    }
  }, [resolvedScan, navigation]);

  if (!pending) {
    // Either it just resolved (effect above will navigate momentarily) or
    // it was discarded elsewhere — either way, nothing to show here.
    return (
      <View style={styles.centeredContainer}>
        <Spinner colors={colors} />
      </View>
    );
  }

  if (pending.status === 'failed') {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Analysis failed</Text>
        <Text style={styles.errorText}>{pending.lastError ?? 'Something went wrong.'}</Text>
        <View style={styles.buttonRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              discardPendingScan(pending.id);
              navigation.goBack();
            }}
          >
            <Text style={styles.secondaryButtonText}>Discard</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => retryPendingScan(pending.id)}>
            <Text style={styles.primaryButtonText}>Retry Scan</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.centeredContainer}>
      <Spinner colors={colors} />
      <Text style={styles.statusText}>
        {pending.attempts === 0 ? 'Analysing sound…' : `Retrying… (attempt ${pending.attempts + 1})`}
      </Text>

      {pending.attempts > 0 ? (
        <View style={styles.busyNotice}>
          <Ionicons name="cloud-offline-outline" size={14} color={colors.medium} />
          <Text style={styles.busyNoticeText}>
            Gemini seems to be under high load. Your recording is safely cached — this will keep retrying
            automatically, even if you leave this screen.
          </Text>
        </View>
      ) : null}

      <Text style={styles.disclaimer}>
        Experimental: this AI is listening to the raw sound and giving its best guess. Treat it as a starting
        point, not a certified diagnosis. It's safe to close this screen (the ✕ above) — retrying continues in
        the background.
      </Text>
    </View>
  );
}

function TextProcessing({
  text,
  colors,
  styles,
  navigation,
}: {
  text: string;
  colors: ColorScheme;
  styles: Styles;
  navigation: Props['navigation'];
}) {
  const { activeVehicle, addScan } = useAppData();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setError(null);
    try {
      const diagnosis = await getTextDiagnosis(text, activeVehicle);
      const scan = await addScan({
        vehicleId: activeVehicle?.id ?? null,
        vehicleLabel: activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : 'No vehicle',
        source: 'text',
        status: 'completed',
        diagnosis,
        notes: '',
      });
      navigation.replace('Results', { scan });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }, [text, activeVehicle, addScan, navigation]);

  useEffect(() => {
    run();
  }, [run]);

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Analysis failed</Text>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={run}>
            <Text style={styles.primaryButtonText}>Retry Scan</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.centeredContainer}>
      <Spinner colors={colors} />
      <Text style={styles.statusText}>Analysing…</Text>
      <Text style={styles.disclaimer}>Sending your description to the AI for diagnosis.</Text>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    centeredContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    spinner: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 3,
      borderTopColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    statusText: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
    busyNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      padding: 12,
      marginTop: 8,
    },
    busyNoticeText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, flexShrink: 1 },
    disclaimer: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 17,
      marginTop: 24,
    },
    errorTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 12 },
    errorText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
    secondaryButton: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
    primaryButton: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
    primaryButtonText: { color: colors.primaryText, fontSize: 14, fontWeight: '700' },
  });
}
