// Plain fetch() never times out on its own — if a server accepts the
// connection but is too overloaded to actually respond, the promise just
// hangs forever. That's exactly what was happening with Gemini under load:
// the retry loop's `await` never resolved or rejected, so `attempts` stayed
// at 0 and the UI looked permanently stuck instead of visibly retrying.
export async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
