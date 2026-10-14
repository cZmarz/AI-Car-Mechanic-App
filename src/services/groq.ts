import type { DiagnosisResponse, Vehicle } from '../types';
import { ApiError, isRetryableStatus } from './apiError';
import { parseDiagnosis } from './diagnosisParsing';
import { fetchWithTimeout } from './fetchWithTimeout';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.EXPO_PUBLIC_GROQ_MODEL || 'openai/gpt-oss-120b';
const TIMEOUT_MS = 25_000;

function buildSystemPrompt(vehicle: Vehicle | null): string {
  const vehicleLine = vehicle
    ? `The user's vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${
        vehicle.engine ? `, ${vehicle.engine} engine` : ''
      }${vehicle.fuelType ? `, ${vehicle.fuelType}` : ''}.`
    : 'The user has not specified their vehicle.';

  return `You are an expert automotive diagnostic assistant inside a mobile app called "AI Car Mechanic".

${vehicleLine}

The user has typed a description of a problem with their car (a noise, warning light, handling issue, etc).

Respond with ONLY a single JSON object, no prose outside the JSON, matching exactly this shape:
{
  "summary": string,   // 1-2 sentence plain-language summary of your assessment
  "issues": [
    {
      "fault": string,
      "probability": number,        // 0-100, your confidence this is the cause
      "severity": "Low" | "Medium" | "High",
      "explanation": string,        // 1-2 sentences: why this fault fits the symptoms
      "estimatedCostGBP": { "min": number, "max": number },  // realistic UK independent-garage parts+labour range, in whole pounds
      "typicalRepairTime": string,  // e.g. "1-2 hours", "half a day"
      "safeToDrive": boolean,       // is it generally OK to keep driving with this fault present
      "immediateActionRequired": boolean,  // true only for genuinely urgent safety issues (e.g. brake/steering failure)
      "estimatedSafeDistanceMiles": number | null  // rough safe driving distance before it should be checked, or null if not meaningfully limited
    }
  ],
  "similarCasesNote": string  // 1 sentence on how common/typical this symptom pattern is
}

Rules:
- List 2-4 issues, ordered by probability descending. Probabilities don't need to sum to 100, but should reflect relative likelihood.
- Set severity by safety/cost risk if left unaddressed (High = safety risk or risk of further damage, e.g. brakes or steering; Medium = should be checked soon; Low = minor/cosmetic).
- estimatedCostGBP should reflect typical UK independent-garage pricing (not main dealer) for that specific fault, adjusted for the vehicle if known.
- Keep all text short, plain-English, and non-alarmist.
- Never include text outside the JSON object.`;
}

export async function getTextDiagnosis(description: string, vehicle: Vehicle | null): Promise<DiagnosisResponse> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      'Missing Groq API key. Add EXPO_PUBLIC_GROQ_API_KEY to a .env file at the project root, then restart the app.',
      null,
      false
    );
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      GROQ_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: buildSystemPrompt(vehicle) },
            { role: 'user', content: description },
          ],
        }),
      },
      TIMEOUT_MS
    );
  } catch (err) {
    throw new ApiError(err instanceof Error ? err.message : 'Network request failed.', null, true);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new ApiError(
      `Groq API error (${response.status}): ${errorBody || response.statusText}`,
      response.status,
      isRetryableStatus(response.status)
    );
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new ApiError('Groq API returned an empty response.', null, false);
  }

  return parseDiagnosis(content, 'No comparable case data is available for this description.');
}
