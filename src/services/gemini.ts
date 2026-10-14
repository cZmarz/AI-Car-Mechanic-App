import { File } from 'expo-file-system';
import type { DiagnosisResponse, Vehicle } from '../types';
import { ApiError, isRetryableStatus } from './apiError';
import { parseDiagnosis } from './diagnosisParsing';
import { fetchWithTimeout } from './fetchWithTimeout';

const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
// Audio understanding genuinely takes longer than a text request, but this
// still needs to be well under "looks frozen" — if Gemini hasn't responded
// by then, it's better to fail this attempt and retry than to hang.
const TIMEOUT_MS = 45_000;

function buildPrompt(vehicle: Vehicle | null): string {
  const vehicleLine = vehicle
    ? `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.engine ? `, ${vehicle.engine} engine` : ''}${
        vehicle.fuelType ? `, ${vehicle.fuelType}` : ''
      }.`
    : 'No vehicle details were provided.';

  return `You are an experimental acoustic diagnosis feature inside a car mechanic app called "AI Car Mechanic". A user has recorded an audio clip of a noise their car is making, and you are given that audio clip directly.

${vehicleLine}

IMPORTANT — be honest about the limits of this feature: listening to a short audio clip and identifying a specific mechanical fault from sound alone is genuinely hard and unreliable, even for this kind of analysis. You do not have a database of confirmed real-world cases. Do not overstate confidence. If the recording is unclear, mostly background/road noise, or too ambiguous to say anything useful, say so plainly in the summary and keep probabilities low.

Listen to the audio and respond with ONLY a single JSON object, no prose outside the JSON, matching exactly this shape:
{
  "summary": string,   // 1-2 sentence honest summary of what you heard and your overall assessment
  "issues": [
    {
      "fault": string,
      "probability": number,        // 0-100, your genuine confidence — keep this conservative for an audio-only guess
      "severity": "Low" | "Medium" | "High",
      "explanation": string,        // 1-2 sentences on why this fault matches the sound
      "estimatedCostGBP": { "min": number, "max": number },  // realistic UK independent-garage parts+labour range, in whole pounds
      "typicalRepairTime": string,  // e.g. "1-2 hours", "half a day"
      "safeToDrive": boolean,       // is it generally OK to keep driving with this fault present
      "immediateActionRequired": boolean,  // true only for genuinely urgent safety issues (e.g. brake/steering failure)
      "estimatedSafeDistanceMiles": number | null  // rough safe driving distance before it should be checked, or null if not meaningfully limited
    }
  ],
  "similarCasesNote": string  // 1 honest sentence on how typical/common this sound pattern is — since there is no real case database, phrase this as a general statement, not a fabricated statistic
}

Rules:
- List 1-3 issues, ordered by probability descending.
- Never claim more certainty than an audio clip alone can support.
- Keep all text short, plain-English, and non-alarmist.
- Never include text outside the JSON object.`;
}

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

export async function getAudioDiagnosis(audioUri: string, vehicle: Vehicle | null): Promise<DiagnosisResponse> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      'Missing Gemini API key. Add EXPO_PUBLIC_GEMINI_API_KEY to a .env file at the project root, then restart the app.',
      null,
      false
    );
  }

  const audioFile = new File(audioUri);
  const base64Audio = await audioFile.base64();

  const parts: GeminiPart[] = [
    { text: buildPrompt(vehicle) },
    { inline_data: { mime_type: 'audio/m4a', data: base64Audio } },
  ];

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      },
      TIMEOUT_MS
    );
  } catch (err) {
    // fetch() itself threw — a dropped connection or no network, which is
    // inherently transient, so it's worth retrying.
    throw new ApiError(err instanceof Error ? err.message : 'Network request failed.', null, true);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new ApiError(
      `Gemini API error (${response.status}): ${errorBody || response.statusText}`,
      response.status,
      isRetryableStatus(response.status)
    );
  }

  const data = await response.json();
  const content: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new ApiError('Gemini API returned an empty response.', null, false);
  }

  return parseDiagnosis(content, 'No comparable case data is available for this experimental audio analysis.');
}
