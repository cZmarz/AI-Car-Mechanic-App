export type Severity = 'Low' | 'Medium' | 'High';
export type FuelType = 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric' | 'Other';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: string;
  engine: string;
  fuelType: FuelType;
  registration: string;
  mileage: string;
}

export interface CostEstimateGBP {
  min: number;
  max: number;
}

export interface DiagnosisIssue {
  fault: string;
  probability: number; // 0-100 confidence
  severity: Severity;
  explanation: string;
  estimatedCostGBP: CostEstimateGBP; // parts + labour, UK independent garage
  typicalRepairTime: string; // e.g. "1-2 hours"
  safeToDrive: boolean;
  immediateActionRequired: boolean;
  estimatedSafeDistanceMiles: number | null; // null = no meaningful limit
  whyChosen: string; // evidence: why the AI picked this fault
}

// The structured payload the AI returns for one scan.
export interface DiagnosisResponse {
  summary: string;
  issues: DiagnosisIssue[];
  similarCasesNote: string; // evidence: plain-language note on how common/typical this pattern is
}

export type ScanStatus = 'completed' | 'failed';
export type ScanSource = 'audio' | 'text';

export interface ScanRecord {
  id: string;
  createdAt: number; // epoch ms
  vehicleId: string | null;
  vehicleLabel: string; // snapshot, so history reads fine even if the vehicle is later edited/deleted
  source: ScanSource;
  status: ScanStatus;
  diagnosis: DiagnosisResponse | null; // null when status is 'failed'
  notes: string;
}

export type PendingScanStatus = 'retrying' | 'failed';

// An audio recording that's been captured and cached to disk, waiting on a
// successful Gemini response. Persisted so a scan is never lost to a flaky
// network or the app being closed mid-retry.
export interface PendingScan {
  id: string;
  audioUri: string; // permanent, app-private file (not the OS cache dir)
  vehicleId: string | null;
  vehicleLabel: string;
  createdAt: number;
  attempts: number;
  lastError: string | null;
  status: PendingScanStatus;
}

export interface AppSettings {
  darkMode: boolean;
  units: 'mi' | 'km';
  notificationsEnabled: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  pictureUri: string | null;
}
