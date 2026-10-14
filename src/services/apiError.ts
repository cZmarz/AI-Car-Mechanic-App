// Thrown by the AI services so callers (the retry queue in AppDataContext,
// or a screen's manual "Retry" button) can tell a transient failure
// (overloaded model, rate limit, dropped connection) apart from a permanent
// one (bad API key, bad request) without parsing message strings.
export class ApiError extends Error {
  status: number | null;
  retryable: boolean;

  constructor(message: string, status: number | null, retryable: boolean) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryable = retryable;
  }
}

export function isRetryableStatus(status: number): boolean {
  // 429 = rate limited, 5xx = server-side/overloaded — all worth retrying.
  return status === 429 || (status >= 500 && status < 600);
}
