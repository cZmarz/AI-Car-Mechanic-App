import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, PendingScan, ScanRecord, UserProfile, Vehicle } from '../types';

const KEYS = {
  vehicles: 'aicm:vehicles',
  activeVehicleId: 'aicm:activeVehicleId',
  scans: 'aicm:scans',
  pendingScans: 'aicm:pendingScans',
  settings: 'aicm:settings',
  profile: 'aicm:profile',
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: true,
  units: 'mi',
  notificationsEnabled: true,
};

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  email: '',
  phone: '',
  pictureUri: null,
};

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): Promise<void> {
  return AsyncStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getVehicles: () => readJSON<Vehicle[]>(KEYS.vehicles, []),
  saveVehicles: (vehicles: Vehicle[]) => writeJSON(KEYS.vehicles, vehicles),

  getActiveVehicleId: () => readJSON<string | null>(KEYS.activeVehicleId, null),
  saveActiveVehicleId: (id: string | null) => writeJSON(KEYS.activeVehicleId, id),

  getScans: () => readJSON<ScanRecord[]>(KEYS.scans, []),
  saveScans: (scans: ScanRecord[]) => writeJSON(KEYS.scans, scans),

  getPendingScans: () => readJSON<PendingScan[]>(KEYS.pendingScans, []),
  savePendingScans: (pending: PendingScan[]) => writeJSON(KEYS.pendingScans, pending),

  getSettings: () => readJSON<AppSettings>(KEYS.settings, DEFAULT_SETTINGS),
  saveSettings: (settings: AppSettings) => writeJSON(KEYS.settings, settings),

  getProfile: () => readJSON<UserProfile>(KEYS.profile, DEFAULT_PROFILE),
  saveProfile: (profile: UserProfile) => writeJSON(KEYS.profile, profile),

  clearAll: () => AsyncStorage.multiRemove(Object.values(KEYS)),
};
