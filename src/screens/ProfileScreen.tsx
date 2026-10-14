import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { useAppData } from '../context/AppDataContext';
import { type ColorScheme } from '../theme/colors';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { colors, profile, updateProfile, vehicles } = useAppData();
  const styles = makeStyles(colors);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);

  async function handlePickPicture() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Enable photo library access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      updateProfile({ pictureUri: result.assets[0].uri });
    }
  }

  function handleUpgrade() {
    Alert.alert('Coming soon', 'Premium plans will be available in a future update.');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.pictureSection}>
        <Pressable onPress={handlePickPicture}>
          {profile.pictureUri ? (
            <Image source={{ uri: profile.pictureUri }} style={styles.picture} />
          ) : (
            <View style={styles.picturePlaceholder}>
              <Ionicons name="person" size={36} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.pictureEditBadge}>
            <Ionicons name="camera" size={14} color={colors.primaryText} />
          </View>
        </Pressable>
      </View>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        onBlur={() => updateProfile({ name })}
        placeholder="Your name"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        onBlur={() => updateProfile({ email })}
        placeholder="you@example.com"
        placeholderTextColor={colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        onBlur={() => updateProfile({ phone })}
        placeholder="07123 456789"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
      />

      <Pressable style={styles.row} onPress={() => navigation.getParent()?.navigate('Garage' as never)}>
        <View style={styles.rowLeft}>
          <Ionicons name="car-outline" size={18} color={colors.textMuted} />
          <Text style={styles.rowLabel}>Vehicles</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowValue}>{vehicles.length}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </Pressable>

      <Pressable style={styles.row} onPress={handleUpgrade}>
        <View style={styles.rowLeft}>
          <Ionicons name="star-outline" size={18} color={colors.textMuted} />
          <Text style={styles.rowLabel}>Subscription</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowValue}>Free plan</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </Pressable>

      <Pressable style={styles.row} onPress={() => navigation.navigate('Settings')}>
        <View style={styles.rowLeft}>
          <Ionicons name="settings-outline" size={18} color={colors.textMuted} />
          <Text style={styles.rowLabel}>Settings</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    pictureSection: { alignItems: 'center', marginBottom: 20 },
    picture: { width: 96, height: 96, borderRadius: 48 },
    picturePlaceholder: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    pictureEditBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 15,
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
      marginTop: 20,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
    rowValue: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  });
}
