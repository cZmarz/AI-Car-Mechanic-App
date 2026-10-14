import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppSettings, PendingScan, ScanRecord, UserProfile, Vehicle } from '../types';
import { storage, DEFAULT_SETTINGS, DEFAULT_PROFILE } from '../services/storage';
import { cacheRecording, deleteCachedRecording } from '../services/audioCache';
import { getAudioDiagnosis } from '../services/gemini';
import { ApiError } from '../services/apiError';
import { makeId } from '../utils/id';
import { type ColorScheme, getColors } from '../theme/colors';

const MAX_BACKOFF_SECONDS = 30;

function backoffSeconds(attempt: number): number {
  return Math.min(3 * 2 ** attempt, MAX_BACKOFF_SECONDS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AppDataValue {
  loading: boolean;
  colors: ColorScheme;

  vehicles: Vehicle[];
  activeVehicleId: string | null;
  activeVehicle: Vehicle | null;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
  updateVehicle: (vehicle: Vehicle) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  setActiveVehicleId: (id: string | null) => Promise<void>;

  scans: ScanRecord[];
  addScan: (scan: Omit<ScanRecord, 'id' | 'createdAt'>) => Promise<ScanRecord>;
  updateScanNotes: (id: string, notes: string) => Promise<void>;
  deleteScan: (id: string) => Promise<void>;

  // The durable audio-scan queue: a recording is cached to disk and queued
  // here the instant it's captured, before any network call, and kept
  // retrying (with backoff) until Gemini succeeds or fails permanently.
  pendingScans: PendingScan[];
  startAudioScan: (tempAudioUri: string, vehicle: Vehicle | null) => Promise<PendingScan>;
  retryPendingScan: (id: string) => void;
  discardPendingScan: (id: string) => void;

  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;

  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;

  clearAllData: () => Promise<void>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleIdState] = useState<string | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  // Mirrors used inside the long-running retry loop, which closes over
  // state at loop-start — these refs let it see live values (current
  // vehicle list, and whether the user discarded the item mid-retry)
  // without restarting the loop on every render.
  const vehiclesRef = useRef<Vehicle[]>([]);
  const pendingScansRef = useRef<PendingScan[]>([]);
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    vehiclesRef.current = vehicles;
  }, [vehicles]);

  useEffect(() => {
    pendingScansRef.current = pendingScans;
  }, [pendingScans]);

  useEffect(() => {
    (async () => {
      const [v, activeId, s, pending, st, p] = await Promise.all([
        storage.getVehicles(),
        storage.getActiveVehicleId(),
        storage.getScans(),
        storage.getPendingScans(),
        storage.getSettings(),
        storage.getProfile(),
      ]);
      setVehicles(v);
      setActiveVehicleIdState(activeId);
      setScans(s);
      setPendingScans(pending);
      setSettings(st);
      setProfile(p);
      setLoading(false);
    })();
  }, []);

  const addVehicle = useCallback(async (vehicle: Omit<Vehicle, 'id'>) => {
    const newVehicle: Vehicle = { ...vehicle, id: makeId() };
    setVehicles((prev) => {
      const next = [...prev, newVehicle];
      storage.saveVehicles(next);
      return next;
    });
    return newVehicle;
  }, []);

  const updateVehicle = useCallback(async (vehicle: Vehicle) => {
    setVehicles((prev) => {
      const next = prev.map((v) => (v.id === vehicle.id ? vehicle : v));
      storage.saveVehicles(next);
      return next;
    });
  }, []);

  const deleteVehicle = useCallback(async (id: string) => {
    setVehicles((prev) => {
      const next = prev.filter((v) => v.id !== id);
      storage.saveVehicles(next);
      return next;
    });
    setActiveVehicleIdState((prev) => {
      const next = prev === id ? null : prev;
      storage.saveActiveVehicleId(next);
      return next;
    });
  }, []);

  const setActiveVehicleId = useCallback(async (id: string | null) => {
    setActiveVehicleIdState(id);
    await storage.saveActiveVehicleId(id);
  }, []);

  const addScan = useCallback(async (scan: Omit<ScanRecord, 'id' | 'createdAt'>) => {
    const newScan: ScanRecord = { ...scan, id: makeId(), createdAt: Date.now() };
    setScans((prev) => {
      const next = [newScan, ...prev];
      storage.saveScans(next);
      return next;
    });
    return newScan;
  }, []);

  // Inserts a scan with a caller-chosen id, so the retry queue can give the
  // resulting ScanRecord the same id as the PendingScan it came from —
  // letting the Processing screen correlate "my pending scan" with "the
  // finished result" even if it's not mounted when the retry succeeds.
  const insertScanWithId = useCallback((scan: ScanRecord) => {
    setScans((prev) => {
      const next = [scan, ...prev];
      storage.saveScans(next);
      return next;
    });
  }, []);

  const updateScanNotes = useCallback(async (id: string, notes: string) => {
    setScans((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, notes } : s));
      storage.saveScans(next);
      return next;
    });
  }, []);

  const deleteScan = useCallback(async (id: string) => {
    setScans((prev) => {
      const next = prev.filter((s) => s.id !== id);
      storage.saveScans(next);
      return next;
    });
  }, []);

  const updatePendingScan = useCallback((id: string, patch: Partial<PendingScan>) => {
    setPendingScans((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      storage.savePendingScans(next);
      return next;
    });
  }, []);

  const removePendingScan = useCallback((id: string) => {
    setPendingScans((prev) => {
      const next = prev.filter((p) => p.id !== id);
      storage.savePendingScans(next);
      return next;
    });
  }, []);

  // The actual retry-until-success loop for one queued recording. Lives at
  // the context level (not inside ProcessingScreen) so it keeps running
  // even if the user navigates away from that screen — the recording is
  // already safely cached, so all this loop does is keep asking Gemini
  // until it gets a real answer or a permanent rejection.
  const processPendingScan = useCallback(
    async (pendingId: string) => {
      if (inFlightRef.current.has(pendingId)) return;
      inFlightRef.current.add(pendingId);

      try {
        for (;;) {
          const current = pendingScansRef.current.find((p) => p.id === pendingId);
          if (!current) return; // discarded mid-retry

          const vehicle = vehiclesRef.current.find((v) => v.id === current.vehicleId) ?? null;

          try {
            const diagnosis = await getAudioDiagnosis(current.audioUri, vehicle);

            insertScanWithId({
              id: current.id,
              createdAt: Date.now(),
              vehicleId: current.vehicleId,
              vehicleLabel: current.vehicleLabel,
              source: 'audio',
              status: 'completed',
              diagnosis,
              notes: '',
            });
            deleteCachedRecording(current.audioUri);
            removePendingScan(current.id);
            return;
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Something went wrong.';
            const retryable = err instanceof ApiError ? err.retryable : true;
            const attempts = current.attempts + 1;

            if (!retryable) {
              updatePendingScan(current.id, { attempts, lastError: message, status: 'failed' });
              return;
            }

            updatePendingScan(current.id, { attempts, lastError: message, status: 'retrying' });
            await sleep(backoffSeconds(attempts) * 1000);
            // loop again
          }
        }
      } finally {
        inFlightRef.current.delete(pendingId);
      }
    },
    [insertScanWithId, removePendingScan, updatePendingScan]
  );

  // Kicks off (or resumes) processing for every queued recording — covers
  // both "just captured" and "app was relaunched with scans still pending".
  useEffect(() => {
    if (loading) return;
    for (const pending of pendingScans) {
      if (pending.status === 'retrying') {
        processPendingScan(pending.id);
      }
    }
  }, [loading, pendingScans, processPendingScan]);

  const startAudioScan = useCallback(async (tempAudioUri: string, vehicle: Vehicle | null) => {
    const id = makeId();
    const permanentUri = cacheRecording(tempAudioUri, `${id}.m4a`);

    const pending: PendingScan = {
      id,
      audioUri: permanentUri,
      vehicleId: vehicle?.id ?? null,
      vehicleLabel: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'No vehicle',
      createdAt: Date.now(),
      attempts: 0,
      lastError: null,
      status: 'retrying',
    };

    setPendingScans((prev) => {
      const next = [pending, ...prev];
      storage.savePendingScans(next);
      return next;
    });

    return pending;
  }, []);

  const retryPendingScan = useCallback(
    (id: string) => {
      updatePendingScan(id, { status: 'retrying' });
    },
    [updatePendingScan]
  );

  const discardPendingScan = useCallback(
    (id: string) => {
      const pending = pendingScansRef.current.find((p) => p.id === id);
      if (pending) deleteCachedRecording(pending.audioUri);
      removePendingScan(id);
    },
    [removePendingScan]
  );

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      storage.saveSettings(next);
      return next;
    });
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      storage.saveProfile(next);
      return next;
    });
  }, []);

  const clearAllData = useCallback(async () => {
    await storage.clearAll();
    setVehicles([]);
    setActiveVehicleIdState(null);
    setScans([]);
    setPendingScans([]);
    setSettings(DEFAULT_SETTINGS);
    setProfile(DEFAULT_PROFILE);
  }, []);

  const activeVehicle = useMemo(
    () => vehicles.find((v) => v.id === activeVehicleId) ?? null,
    [vehicles, activeVehicleId]
  );

  const colors = useMemo(() => getColors(settings.darkMode), [settings.darkMode]);

  const value: AppDataValue = {
    loading,
    colors,
    vehicles,
    activeVehicleId,
    activeVehicle,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    setActiveVehicleId,
    scans,
    addScan,
    updateScanNotes,
    deleteScan,
    pendingScans,
    startAudioScan,
    retryPendingScan,
    discardPendingScan,
    settings,
    updateSettings,
    profile,
    updateProfile,
    clearAllData,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
