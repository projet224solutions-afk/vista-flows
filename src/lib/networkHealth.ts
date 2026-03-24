export interface NetworkHealthResult {
  ok: boolean;
  reason: string;
  statusCode?: number;
  latencyMs: number;
}

interface NetworkHealthOptions {
  timeoutMs?: number;
  retries?: number;
  force?: boolean;
}

const HEALTH_CHECK_PATH = '/healthz.json';
const DEFAULT_TIMEOUT_MS = 3000;
const DEFAULT_RETRIES = 1;
/** Cache results for 15s to prevent flooding on mobile */
const RESULT_CACHE_WINDOW_MS = 15_000;

let inFlightHealthCheck: Promise<NetworkHealthResult> | null = null;
let lastHealthCheckAt = 0;
let lastHealthResult: NetworkHealthResult | null = null;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise
      .then((result) => { clearTimeout(timer); resolve(result); })
      .catch((error) => { clearTimeout(timer); reject(error); });
  });
}

async function executeHealthCheck(timeoutMs: number, retries: number): Promise<NetworkHealthResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, reason: 'navigator_offline', latencyMs: 0 };
  }

  let lastErrorReason = 'health_check_failed';
  const maxAttempts = Math.max(1, retries + 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = performance.now();
    try {
      const response = await withTimeout(
        fetch(`${HEALTH_CHECK_PATH}?t=${Date.now()}&a=${attempt}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
        }),
        timeoutMs,
      );

      const latencyMs = Math.round(performance.now() - startedAt);

      if (!response.ok) {
        lastErrorReason = `http_${response.status}`;
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          const payload = await response.clone().json();
          if (payload?.status !== 'ok') { lastErrorReason = 'invalid_payload'; continue; }
        } catch { lastErrorReason = 'invalid_json'; continue; }
      }

      return { ok: true, reason: 'ok', statusCode: response.status, latencyMs };
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startedAt);
      const message = error instanceof Error ? error.message : 'unknown_error';
      lastErrorReason = message === 'timeout' ? 'timeout' : message;

      if (attempt === maxAttempts) {
        return { ok: false, reason: lastErrorReason, latencyMs };
      }
    }
  }

  return { ok: false, reason: lastErrorReason, latencyMs: 0 };
}

export async function checkNetworkHealth(options: NetworkHealthOptions = {}): Promise<NetworkHealthResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, force = false } = options;

  const now = Date.now();

  // ALWAYS use cache if within window — force only bypasses if cache is older than 5s
  if (lastHealthResult && now - lastHealthCheckAt < (force ? 5000 : RESULT_CACHE_WINDOW_MS)) {
    return lastHealthResult;
  }

  // Deduplicate in-flight requests
  if (inFlightHealthCheck) {
    return inFlightHealthCheck;
  }

  inFlightHealthCheck = executeHealthCheck(timeoutMs, retries)
    .then((result) => {
      lastHealthCheckAt = Date.now();
      lastHealthResult = result;
      return result;
    })
    .finally(() => {
      inFlightHealthCheck = null;
    });

  return inFlightHealthCheck;
}

export { HEALTH_CHECK_PATH, DEFAULT_TIMEOUT_MS };
