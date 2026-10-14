import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../context/AppDataContext';
import { type ColorScheme } from '../theme/colors';

export default function SettingsScreen() {
  const { colors, settings, updateSettings, clearAllData } = useAppData();
  const styles = makeStyles(colors);

  function handlePrivacy() {
    Alert.alert(
      'Privacy',
      'This is a local prototype: your vehicles, scans, and profile are stored only on this device and are never uploaded to a server, except audio you choose to scan, which is sent to Gemini for analysis.'
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete all data',
      'This permanently removes every vehicle, scan, and setting stored on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: () => clearAllData() },
      ]
    );
  }

  function handleLogOut() {
    Alert.alert('No account needed', "You're using AI Car Mechanic locally — there's no account to log out of yet.");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionLabel colors={colors} text="Appearance" />
      <SwitchRow
        colors={colors}
        icon="moon-outline"
        label="Dark Mode"
        value={settings.darkMode}
        onValueChange={(v) => updateSettings({ darkMode: v })}
      />

      <SectionLabel colors={colors} text="Preferences" />
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Ionicons name="speedometer-outline" size={18} color={colors.textMuted} />
          <Text style={styles.rowLabel}>Units</Text>
        </View>
        <View style={styles.unitToggle}>
          {(['mi', 'km'] as const).map((u) => (
            <Pressable
              key={u}
              style={[styles.unitChip, settings.units === u && styles.unitChipActive]}
              onPress={() => updateSettings({ units: u })}
            >
              <Text style={[styles.unitChipText, settings.units === u && styles.unitChipTextActive]}>
                {u === 'mi' ? 'Miles' : 'Kilometres'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ActionRow colors={colors} icon="language-outline" label="Language" value="English" onPress={undefined} />

      <SwitchRow
        colors={colors}
        icon="notifications-outline"
        label="Notifications"
        value={settings.notificationsEnabled}
        onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
      />

      <SectionLabel colors={colors} text="Account" />
      <ActionRow colors={colors} icon="shield-checkmark-outline" label="Privacy" onPress={handlePrivacy} />
      <ActionRow colors={colors} icon="log-out-outline" label="Log Out" onPress={handleLogOut} />
      <ActionRow
        colors={colors}
        icon="trash-outline"
        label="Delete Account"
        onPress={handleDeleteAccount}
        destructive
      />
    </ScrollView>
  );
}

function SectionLabel({ colors, text }: { colors: ColorScheme; text: string }) {
  const styles = makeStyles(colors);
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function SwitchRow({
  colors,
  icon,
  label,
  value,
  onValueChange,
}: {
  colors: ColorScheme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function ActionRow({
  colors,
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  colors: ColorScheme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: (() => void) | undefined;
  destructive?: boolean;
}) {
  const styles = makeStyles(colors);
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={destructive ? colors.danger : colors.textMuted} />
        <Text style={[styles.rowLabel, destructive && { color: colors.danger }]}>{label}</Text>
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    sectionLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 20,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
    rowValue: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    unitToggle: { flexDirection: 'row', gap: 6 },
    unitChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unitChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    unitChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    unitChipTextActive: { color: colors.primaryText },
  });
}
