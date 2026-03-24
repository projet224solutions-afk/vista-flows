import { supabase } from '@/integrations/supabase/client';

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
const FALLBACK_SUPABASE_URL = (supabase as any)?.supabaseUrl as string | undefined;
const FALLBACK_SUPABASE_KEY = (supabase as any)?.supabaseKey as string | undefined;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_KEY;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;
/** Cache results for 15s to prevent flooding on mobile */
const RESULT_CACHE_WINDOW_MS = 15_000;

let inFlightHealthCheck: Promise<NetworkHealthResult> | null = null;
let lastHealthCheckAt = 0;
let lastHealthResult: NetworkHealthResult | null = null;
let lastReportedState: boolean | null = null;
let lastReportedReason = '';

const nowPerf = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

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
    const startedAt = nowPerf();
    try {
      // Try local healthz first
      let appOk = false;
      try {
        const appHealthResponse = await withTimeout(
          fetch(`${HEALTH_CHECK_PATH}?t=${Date.now()}&a=${attempt}`, {
            method: 'GET',
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
          }),
          timeoutMs,
        );

        const latencyMs = Math.round(nowPerf() - startedAt);

        if (appHealthResponse.ok) {
          const contentType = appHealthResponse.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            try {
              const payload = await appHealthResponse.json();
              if (payload?.status === 'ok') {
                return { ok: true, reason: 'ok:app_health', statusCode: appHealthResponse.status, latencyMs };
              }
            } catch { /* invalid json, fall through to supabase */ }
          } else if (contentType.includes('text/html')) {
            // SPA rewrite returned HTML instead of JSON — not a real healthz response
            lastErrorReason = 'healthz_spa_rewrite';
          } else {
            return { ok: true, reason: 'ok:app_health_non_json', statusCode: appHealthResponse.status, latencyMs };
          }
        } else {
          lastErrorReason = `app_http_${appHealthResponse.status}`;
        }
      } catch {
        // healthz fetch failed, try supabase fallback
      }

      // Fallback réel: tester la reachability Supabase si /healthz.json échoue (preview/PWA custom host)
      if (SUPABASE_URL && SUPABASE_KEY) {
        const supabaseStartedAt = nowPerf();
        const supabaseResponse = await withTimeout(
          fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'GET',
            cache: 'no-store',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              Accept: 'application/json',
            },
          }),
          timeoutMs,
        );

        const supabaseLatencyMs = Math.round(nowPerf() - supabaseStartedAt);
        if (supabaseResponse.ok) {
          return {
            ok: true,
            reason: 'ok:supabase_reachable',
            statusCode: supabaseResponse.status,
            latencyMs: supabaseLatencyMs,
          };
        }
        lastErrorReason = `supabase_http_${supabaseResponse.status}`;
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    } catch (error) {
      const latencyMs = Math.round(nowPerf() - startedAt);
      const message = error instanceof Error ? error.message : 'unknown_error';
      lastErrorReason = message === 'timeout' ? 'timeout' : message;

      if (attempt === maxAttempts) {
        return { ok: false, reason: lastErrorReason, latencyMs };
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  return { ok: false, reason: lastErrorReason, latencyMs: 0 };
}

function logHealthTransition(result: NetworkHealthResult) {
  if (lastReportedState === result.ok && lastReportedReason === result.reason) return;
  lastReportedState = result.ok;
  lastReportedReason = result.reason;

  if (result.ok) {
    console.info('[HEALTH CHECK OK]', {
      reason: result.reason,
      latencyMs: result.latencyMs,
      statusCode: result.statusCode,
    });
  } else {
    console.warn('[HEALTH CHECK FAIL]', {
      reason: result.reason,
      latencyMs: result.latencyMs,
      statusCode: result.statusCode,
      navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
    });
  }
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
      logHealthTransition(result);
      return result;
    })
    .finally(() => {
      inFlightHealthCheck = null;
    });

  return inFlightHealthCheck;
}

export { HEALTH_CHECK_PATH, DEFAULT_TIMEOUT_MS };
