import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ScanStackParamList } from '../navigation/types';
import { useAppData } from '../context/AppDataContext';
import { type ColorScheme } from '../theme/colors';

type Props = NativeStackScreenProps<ScanStackParamList, 'Scan'>;
type Mode = 'record' | 'describe';

const NOISY_METERING_THRESHOLD = -20; // dB; closer to 0 = louder ambient noise

function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function ScanScreen({ navigation }: Props) {
  const { colors, activeVehicle, startAudioScan } = useAppData();
  const styles = makeStyles(colors);
  const [mode, setMode] = useState<Mode>('record');
  const [description, setDescription] = useState('');

  const audioRecorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(audioRecorder, 150);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [starting, setStarting] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setPermissionDenied(!status.granted);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })();
  }, []);

  useEffect(() => {
    if (recorderState.isRecording) {
      const loop = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })
      );
      loop.start();
      return () => loop.stop();
    }
    spin.setValue(0);
  }, [recorderState.isRecording, spin]);

  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const isNoisy = recorderState.isRecording && (recorderState.metering ?? -160) > NOISY_METERING_THRESHOLD;

  async function handleRecordPress() {
    if (recorderState.isRecording) {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        const pending = await startAudioScan(uri, activeVehicle);
        navigation.replace('Processing', { mode: 'audio', pendingScanId: pending.id });
      }
      return;
    }

    setStarting(true);
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } finally {
      setStarting(false);
    }
  }

  function handleDescribeSubmit() {
    const trimmed = description.trim();
    if (!trimmed) return;
    navigation.replace('Processing', { mode: 'text', text: trimmed });
  }

  if (!activeVehicle) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="car-outline" size={48} color={colors.textMuted} />
        <Text style={styles.blockTitle}>Add a vehicle first</Text>
        <Text style={styles.blockSubtitle}>
          Select or add a vehicle in My Garage so the diagnosis can take it into account.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.getParent()?.navigate('MainTabs', { screen: 'Garage' } as never)}
        >
          <Text style={styles.primaryButtonText}>Go to My Garage</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.vehicleBanner}>
        <Ionicons name="car" size={16} color={colors.primary} />
        <Text style={styles.vehicleBannerText}>
          {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
        </Text>
      </View>

      <View style={styles.modeToggle}>
        <Pressable
          style={[styles.modeChip, mode === 'record' && styles.modeChipActive]}
          onPress={() => setMode('record')}
        >
          <Ionicons name="mic" size={15} color={mode === 'record' ? colors.primaryText : colors.textMuted} />
          <Text style={[styles.modeChipText, mode === 'record' && styles.modeChipTextActive]}>Record</Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, mode === 'describe' && styles.modeChipActive]}
          onPress={() => setMode('describe')}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={15}
            color={mode === 'describe' ? colors.primaryText : colors.textMuted}
          />
          <Text style={[styles.modeChipText, mode === 'describe' && styles.modeChipTextActive]}>Describe</Text>
        </Pressable>
      </View>

      {mode === 'record' ? (
        permissionDenied ? (
          <View style={styles.centeredContainer}>
            <Ionicons name="mic-off-outline" size={48} color={colors.textMuted} />
            <Text style={styles.blockTitle}>Microphone access needed</Text>
            <Text style={styles.blockSubtitle}>
              Enable microphone access for AI Car Mechanic in your device settings to record a scan.
            </Text>
          </View>
        ) : (
          <View style={styles.centerArea}>
            <Text style={styles.timer}>{formatTimer(recorderState.durationMillis)}</Text>
            <Text style={styles.hint}>
              {recorderState.isRecording ? 'Hold your phone near the noise' : 'Tap to start recording'}
            </Text>

            {isNoisy ? (
              <View style={styles.noiseWarning}>
                <Ionicons name="warning" size={14} color={colors.medium} />
                <Text style={styles.noiseWarningText}>It's noisy here — try to reduce background noise</Text>
              </View>
            ) : null}

            <View style={styles.buttonWrap}>
              {recorderState.isRecording ? (
                <Animated.View
                  style={[styles.spinnerRing, { borderColor: colors.primary, transform: [{ rotate: rotation }] }]}
                />
              ) : null}
              <Pressable
                style={[
                  styles.recordButton,
                  { backgroundColor: recorderState.isRecording ? colors.danger : colors.primary },
                ]}
                onPress={handleRecordPress}
                disabled={starting}
              >
                <Ionicons name={recorderState.isRecording ? 'stop' : 'mic'} size={36} color={colors.primaryText} />
              </Pressable>
            </View>
          </View>
        )
      ) : (
        <KeyboardAvoidingView
          style={styles.centerArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Text style={styles.hint}>Describe what's happening with your car</Text>
          <TextInput
            style={styles.describeInput}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. squealing noise when I brake, especially in the morning"
            placeholderTextColor={colors.textMuted}
            multiline
            autoFocus
          />
          <Pressable
            style={[styles.primaryButton, !description.trim() && styles.primaryButtonDisabled]}
            onPress={handleDescribeSubmit}
            disabled={!description.trim()}
          >
            <Text style={styles.primaryButtonText}>Analyze</Text>
          </Pressable>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centeredContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 12,
    },
    blockTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
    blockSubtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 8,
    },
    primaryButtonDisabled: { opacity: 0.4 },
    primaryButtonText: { color: colors.primaryText, fontSize: 15, fontWeight: '700' },
    vehicleBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: 16,
    },
    vehicleBannerText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    modeToggle: {
      flexDirection: 'row',
      alignSelf: 'center',
      backgroundColor: colors.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
      marginTop: 14,
      gap: 4,
    },
    modeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
    },
    modeChipActive: { backgroundColor: colors.primary },
    modeChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    modeChipTextActive: { color: colors.primaryText },
    centerArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
    timer: { color: colors.text, fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] },
    hint: { color: colors.textMuted, fontSize: 14 },
    noiseWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: 8,
    },
    noiseWarningText: { color: colors.medium, fontSize: 12, fontWeight: '600' },
    buttonWrap: { marginTop: 32, alignItems: 'center', justifyContent: 'center', width: 140, height: 140 },
    spinnerRing: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 3,
      borderTopColor: 'transparent',
      borderLeftColor: 'transparent',
    },
    recordButton: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    describeInput: {
      width: '100%',
      minHeight: 120,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      color: colors.text,
      fontSize: 15,
      textAlignVertical: 'top',
      marginTop: 12,
    },
  });
}
