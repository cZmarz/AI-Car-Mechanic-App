import { ApiError } from './apiError';
import type { CostEstimateGBP, DiagnosisIssue, DiagnosisResponse, Severity } from '../types';

// Defensive parsing shared by every AI backend (Gemini audio, Groq text):
// the model is asked for strict JSON, but the shape is still free-form
// model output, so we validate/clean it before trusting it in the UI.
export function parseDiagnosis(raw: string, defaultSimilarCasesNote: string): DiagnosisResponse {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError('Could not parse the AI response as JSON.', null, false);
  }

  const issues: DiagnosisIssue[] = Array.isArray(parsed.issues)
    ? parsed.issues
        .filter((i: any) => i && typeof i.fault === 'string')
        .map((i: any) => ({
          fault: String(i.fault),
          probability: clampProbability(i.probability),
          severity: normalizeSeverity(i.severity),
          explanation: typeof i.explanation === 'string' ? i.explanation : '',
          estimatedCostGBP: normalizeCostEstimate(i.estimatedCostGBP),
          typicalRepairTime: typeof i.typicalRepairTime === 'string' ? i.typicalRepairTime : 'Varies',
          safeToDrive: typeof i.safeToDrive === 'boolean' ? i.safeToDrive : true,
          immediateActionRequired:
            typeof i.immediateActionRequired === 'boolean' ? i.immediateActionRequired : false,
          estimatedSafeDistanceMiles: normalizeSafeDistance(i.estimatedSafeDistanceMiles),
          whyChosen: typeof i.whyChosen === 'string' ? i.whyChosen : typeof i.explanation === 'string' ? i.explanation : '',
        }))
    : [];

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    issues,
    similarCasesNote:
      typeof parsed.similarCasesNote === 'string' && parsed.similarCasesNote.trim().length > 0
        ? parsed.similarCasesNote
        : defaultSimilarCasesNote,
  };
}

function clampProbability(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeSeverity(value: unknown): Severity {
  return value === 'Low' || value === 'Medium' || value === 'High' ? value : 'Medium';
}

function normalizeCostEstimate(value: unknown): CostEstimateGBP {
  const raw = value as { min?: unknown; max?: unknown } | null | undefined;
  const min = Math.max(0, Math.round(Number(raw?.min)) || 0);
  const max = Math.max(min, Math.round(Number(raw?.max)) || min);
  return { min, max };
}

function normalizeSafeDistance(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}
