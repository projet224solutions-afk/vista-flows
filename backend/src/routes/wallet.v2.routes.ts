/**
 * 💰 WALLET v2 ROUTES - Backend Node.js centralisé
 *
 * Tables utilisées :
 *   - `wallets`, `wallet_transactions`, `wallet_idempotency_keys`
 *
 * Endpoints :
 *   - GET /balance, /transactions, /status (lecture)
 *   - POST /initialize (creation)
 *   - POST /deposit  — crédit wallet (migré depuis wallet-operations Edge Function)
 *   - POST /withdraw — débit wallet (migré depuis wallet-operations Edge Function)
 *   - POST /transfer — transfert P2P (migré depuis wallet-operations / wallet-transfer Edge Function)
 *   - POST /credit   — crédit admin/interne (service rôle)
 *
 * ⚠️ Route montée sur /api/v2/wallet (séparée du legacy /api/wallet)
 */

import { Router, Response } from 'express';
import crypto from 'crypto';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requirePermissionOrRole } from '../middlewares/permissions.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { AFRICAN_BANK_SOURCE_URLS, isAfricanBankSourceUrl } from '../constants/africanBankSources.js';
import { creditWallet, debitWallet, transferBetweenWallets } from '../services/wallet.service.js';
import { getInternalFxRate as getTableFxRate } from '../services/marketplacePricing.service.js';
import { countryToCurrency } from '../utils/countryToCurrency.js';
import { triggerAffiliateCommission } from '../services/commission.service.js';
import { changeWalletPin, ensureWalletExistsForPin, getWalletPinPolicy, getWalletPinState, resetWalletPinWithPassword, setupWalletPin, verifyWalletPin } from '../services/walletPin.service.js';
import { emitCoreFeatureEvent } from '../services/coreFeatureEvents.service.js';

const router = Router();

async function ignoreSupabaseError(operation: PromiseLike<unknown> | unknown): Promise<void> {
  await Promise.resolve(operation).catch(() => undefined);
}

async function readSupabaseData<T>(queryPromise: PromiseLike<{ data?: T; error?: { message?: string } | null }>, label: string, fallbackValue: T): Promise<T> {
  try {
    const result = await Promise.resolve(queryPromise);
    if (result?.error) {
      logger.warn(`[walletV2] ${label} query failed: ${result.error.message}`);
      return fallbackValue;
    }
    return (result?.data ?? fallbackValue) as T;
  } catch (error: any) {
    logger.warn(`[walletV2] ${label} query threw: ${error?.message || error}`);
    return fallbackValue;
  }
}

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const BCRG_OFFICIAL_URL = 'https://www.bcrg-guinee.org';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BCRG_SCRAPE_URLS = [
  'https://www.bcrg-guinee.org',
  'https://www.bcrg-guinee.org/cours-de-change',
  'https://www.bcrg.gov.gn',
  'https://www.bcrg.gov.gn/cours-de-change',
];

interface ResolvedRecipient {
  userId: string;
  query: string;
  matchedBy: 'uuid' | 'user_ids.custom_id' | 'profiles.public_id' | 'profiles.custom_id' | 'profiles.email' | 'profiles.phone' | 'auth.users.email' | 'auth.users.phone' | 'pdg_management.email' | 'pdg_management.phone' | 'agents_management.agent_code' | 'agents_management.email' | 'agents_management.phone';
  displayName: string | null;
  email: string | null;
  phone: string | null;
  publicId: string | null;
  customId: string | null;
}

type WalletForTransfer = {
  id: string;
  balance: number;
  currency: string | null;
  user_id: string;
  is_blocked?: boolean | null;
};

async function ensureTransferWallet(userId: string, fallbackCurrency = 'GNF'): Promise<WalletForTransfer | null> {
  const { data: existingWallet, error: existingError } = await supabaseAdmin
    .from('wallets')
    .select('id, balance, currency, user_id, is_blocked')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingWallet) return existingWallet as WalletForTransfer;

  if (existingError) {
    logger.warn(`[WalletV2] Wallet lookup failed before auto-create for ${userId}: ${existingError.message}`);
  }

  // Déterminer la devise selon le pays du profil
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('detected_country, country, detected_currency')
    .eq('id', userId)
    .maybeSingle();

  const userCountry = profile?.detected_country || profile?.country || 'GN';
  const resolvedCurrency = (profile?.detected_currency && profile.detected_currency !== 'GNF')
    ? profile.detected_currency
    : countryToCurrency(userCountry) || fallbackCurrency;

  const { data: createdWallet, error: createError } = await supabaseAdmin
    .from('wallets')
    .insert({
      user_id: userId,
      balance: 0,
      currency: resolvedCurrency,
      currency_locked: true,
      currency_locked_at: new Date().toISOString(),
      currency_lock_reason: `Devise assignée selon pays de résidence: ${userCountry}`,
    })
    .select('id, balance, currency, user_id, is_blocked')
    .single();

  if (createError || !createdWallet) {
    logger.error(`[WalletV2] Wallet auto-create failed for ${userId}: ${createError?.message || 'no wallet returned'}`);
    return null;
  }

  return createdWallet as WalletForTransfer;
}

function isFxSuccessStatus(status: string | null | undefined): boolean {
  const normalized = (status || '').toLowerCase();
  return normalized === 'success' || normalized === 'completed' || normalized === 'ok';
}

function hasWalletPinEnabled(walletPinState: { pin_enabled?: boolean | null; pin_hash?: string | null } | null | undefined): boolean {
  return Boolean(walletPinState?.pin_enabled ?? walletPinState?.pin_hash);
}

async function requireValidTransactionPin(userId: string, pin: unknown): Promise<{ ok: boolean; error?: string; lockedUntil?: string | null }> {
  const walletPinState = await getWalletPinState(userId);
  const pinEnabled = hasWalletPinEnabled(walletPinState);

  // Compatibility mode: if PIN is not configured yet, keep operations available.
  if (!pinEnabled) {
    return { ok: true };
  }

  if (typeof pin !== 'string') {
    return { ok: false, error: 'Code PIN requis pour confirmer cette opération' };
  }

  const verification = await verifyWalletPin(userId, pin);
  if (!verification.valid) {
    return { ok: false, error: verification.error, lockedUntil: verification.lockedUntil };
  }

  return { ok: true };
}

function normalizePhoneCandidates(raw: string): string[] {
  const compact = raw.replace(/[\s\-()]/g, '');
  const digits = compact.replace(/[^\d]/g, '');
  const withPlus = digits ? `+${digits}` : '';
  const localNoPrefix = digits.startsWith('00') ? digits.slice(2) : digits;
  return Array.from(new Set([raw, compact, digits, withPlus, localNoPrefix].filter(Boolean)));
}

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  GNF: 'Guinee',
  XOF: 'UEMOA',
  XAF: 'CEMAC',
  NGN: 'Nigeria',
  GHS: 'Ghana',
  KES: 'Kenya',
  UGX: 'Uganda',
  ZAR: 'Afrique du Sud',
  MAD: 'Maroc',
  TND: 'Tunisie',
  EGP: 'Egypte',
  ZMW: 'Zambie',
  RWF: 'Rwanda',
  TZS: 'Tanzanie',
  BWP: 'Botswana',
  MZN: 'Mozambique',
  EUR: 'Zone Euro',
  USD: 'Etats-Unis',
};

function mapCurrencyToCountry(currency: string | null | undefined): string {
  if (!currency) return 'Inconnu';
  return CURRENCY_TO_COUNTRY[String(currency).toUpperCase()] || String(currency).toUpperCase();
}

const ZERO_DECIMAL_TRANSFER_CURRENCIES = new Set([
  'GNF', 'XOF', 'XAF', 'VND', 'IDR', 'KRW', 'JPY', 'CLP', 'UGX', 'RWF',
  'PYG', 'COP', 'HUF', 'ISK', 'BIF', 'DJF', 'KMF', 'MGA', 'VUV',
]);

function smartRoundCurrencyAmount(amount: number, currency: string): number {
  if (!Number.isFinite(amount)) return 0;
  return ZERO_DECIMAL_TRANSFER_CURRENCIES.has(String(currency || '').toUpperCase())
    ? Math.round(amount)
    : Math.round(amount * 100) / 100;
}

const FX_MAX_AGE_MINUTES_DEFAULT = 180;
const FX_MAX_AGE_MINUTES_GNF = 90;

interface StoredFxRow {
  rate?: number | null;
  final_rate_usd?: number | null;
  final_rate_eur?: number | null;
  margin?: number | null;
  retrieved_at?: string | null;
  source?: string | null;
  source_type?: string | null;
  source_url?: string | null;
}

interface PdgRecipient {
  user_id: string;
}

interface InternalFxRateResult {
  rate: number;
  officialRate: number;
  margin: number;
  source: string;
  fetchedAt: string;
  sourceType: string | null;
  sourceUrl: string | null;
  official: boolean;
  stale: boolean;
  refreshAttempted?: boolean;
  refreshStatus?: number | null;
  refreshTimedOut?: boolean;
}

function getFxFreshnessThresholdMinutes(from: string, to: string): number {
  const sourceCurrency = String(from || '').toUpperCase();
  const targetCurrency = String(to || '').toUpperCase();
  return sourceCurrency === 'GNF' || targetCurrency === 'GNF'
    ? FX_MAX_AGE_MINUTES_GNF
    : FX_MAX_AGE_MINUTES_DEFAULT;
}

function isOfficialAfricanFxRow(row: StoredFxRow | null | undefined): boolean {
  if (!row) return false;
  if (String(row.source_type || '').toLowerCase() === 'fallback_api') {
    return false;
  }
  return isAfricanBankRow(row);
}

function isFxTimestampStale(retrievedAt: string | null | undefined, thresholdMinutes: number): boolean {
  if (!retrievedAt) return true;
  const timestamp = new Date(retrievedAt).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return true;
  return (Date.now() - timestamp) / 60000 > thresholdMinutes;
}

function buildInternalFxRateResult(rate: number, row: StoredFxRow | null | undefined, source: string, thresholdMinutes: number): InternalFxRateResult {
  const rawRate = Number(row?.rate);
  const margin = Number(row?.margin);
  return {
    rate,
    officialRate: Number.isFinite(rawRate) && rawRate > 0 ? rawRate : rate,
    margin: Number.isFinite(margin) ? margin : 0,
    source,
    fetchedAt: row?.retrieved_at || new Date().toISOString(),
    sourceType: row?.source_type || null,
    sourceUrl: resolveOfficialBankSourceUrl(row || null),
    official: isOfficialAfricanFxRow(row),
    stale: isFxTimestampStale(row?.retrieved_at, thresholdMinutes),
  };
}

async function readLatestFxRows(from: string, to: string): Promise<StoredFxRow[]> {
  const { data, error } = await supabaseAdmin
    .from('currency_exchange_rates')
    .select('rate, final_rate_usd, final_rate_eur, margin, retrieved_at, source, source_type, source_url')
    .eq('from_currency', from)
    .eq('to_currency', to)
    .eq('is_active', true)
    .order('retrieved_at', { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data || []) as StoredFxRow[];
}

function filterFxRowsByMinimumRetrievedAt(rows: StoredFxRow[], minimumRetrievedAtIso?: string | null): StoredFxRow[] {
  if (!minimumRetrievedAtIso) {
    return rows;
  }

  const minimumTimestamp = new Date(minimumRetrievedAtIso).getTime();
  if (!Number.isFinite(minimumTimestamp) || minimumTimestamp <= 0) {
    return rows;
  }

  return rows.filter((row) => {
    const rowTimestamp = row?.retrieved_at ? new Date(row.retrieved_at).getTime() : Number.NaN;
    return Number.isFinite(rowTimestamp) && rowTimestamp >= minimumTimestamp;
  });
}

function pickPreferredFxRow(rows: StoredFxRow[], thresholdMinutes: number): StoredFxRow | null {
  if (!rows.length) return null;

  const freshOfficial = rows.find((row) => isOfficialAfricanFxRow(row) && !isFxTimestampStale(row.retrieved_at, thresholdMinutes));
  if (freshOfficial) return freshOfficial;

  const latestOfficial = rows.find((row) => isOfficialAfricanFxRow(row));
  if (latestOfficial) return latestOfficial;

  return rows[0] || null;
}

function resolveStoredFxRate(
  row: { rate?: number | null; final_rate_usd?: number | null; final_rate_eur?: number | null; retrieved_at?: string | null } | null | undefined,
  baseCurrency: string,
): number {
  if (!row) return Number.NaN;

  const base = String(baseCurrency || '').toUpperCase();
  if (base === 'USD' && Number.isFinite(Number(row.final_rate_usd)) && Number(row.final_rate_usd) > 0) {
    return Number(row.final_rate_usd);
  }
  if (base === 'EUR' && Number.isFinite(Number(row.final_rate_eur)) && Number(row.final_rate_eur) > 0) {
    return Number(row.final_rate_eur);
  }

  const directRate = Number(row.rate);
  if (Number.isFinite(directRate) && directRate > 0) {
    return directRate;
  }

  const fallbackUsd = Number(row.final_rate_usd);
  if (Number.isFinite(fallbackUsd) && fallbackUsd > 0) {
    return fallbackUsd;
  }

  const fallbackEur = Number(row.final_rate_eur);
  if (Number.isFinite(fallbackEur) && fallbackEur > 0) {
    return fallbackEur;
  }

  return Number.NaN;
}

async function getInternalFxRateFromTable(from: string, to: string, minimumRetrievedAtIso?: string | null): Promise<InternalFxRateResult> {
  const sourceCurrency = String(from || '').toUpperCase();
  const targetCurrency = String(to || '').toUpperCase();
  const thresholdMinutes = getFxFreshnessThresholdMinutes(sourceCurrency, targetCurrency);

  if (sourceCurrency === targetCurrency) {
    return {
      rate: 1,
      officialRate: 1,
      margin: 0,
      source: 'identity',
      fetchedAt: new Date().toISOString(),
      sourceType: 'identity',
      sourceUrl: null,
      official: true,
      stale: false,
    };
  }

  const direct = pickPreferredFxRow(
    filterFxRowsByMinimumRetrievedAt(await readLatestFxRows(sourceCurrency, targetCurrency), minimumRetrievedAtIso),
    thresholdMinutes,
  );

  const directRate = resolveStoredFxRate(direct, sourceCurrency);
  if (Number.isFinite(directRate) && directRate > 0) {
    return buildInternalFxRateResult(directRate, direct, 'table-direct', thresholdMinutes);
  }

  const inverse = pickPreferredFxRow(
    filterFxRowsByMinimumRetrievedAt(await readLatestFxRows(targetCurrency, sourceCurrency), minimumRetrievedAtIso),
    thresholdMinutes,
  );

  const inverseRate = resolveStoredFxRate(inverse, targetCurrency);
  if (Number.isFinite(inverseRate) && inverseRate > 0) {
    const rawInverseRate = Number(inverse?.rate);
    const result = buildInternalFxRateResult(1 / inverseRate, inverse, 'table-inverse', thresholdMinutes);
    return {
      ...result,
      officialRate: Number.isFinite(rawInverseRate) && rawInverseRate > 0 ? 1 / rawInverseRate : result.officialRate,
    };
  }

  const [usdToSource, usdToTarget] = await Promise.all([
    readLatestFxRows('USD', sourceCurrency).then((rows) => pickPreferredFxRow(filterFxRowsByMinimumRetrievedAt(rows, minimumRetrievedAtIso), thresholdMinutes)),
    readLatestFxRows('USD', targetCurrency).then((rows) => pickPreferredFxRow(filterFxRowsByMinimumRetrievedAt(rows, minimumRetrievedAtIso), thresholdMinutes)),
  ]);

  const sourceViaUsd = resolveStoredFxRate(usdToSource, 'USD');
  const targetViaUsd = resolveStoredFxRate(usdToTarget, 'USD');

  if (Number.isFinite(sourceViaUsd) && sourceViaUsd > 0 && Number.isFinite(targetViaUsd) && targetViaUsd > 0) {
    const pivotRow = [usdToTarget, usdToSource].find((row) => isOfficialAfricanFxRow(row)) || usdToTarget || usdToSource;
    const sourceRaw = Number(usdToSource?.rate);
    const targetRaw = Number(usdToTarget?.rate);
    const officialRate = Number.isFinite(sourceRaw) && sourceRaw > 0 && Number.isFinite(targetRaw) && targetRaw > 0
      ? targetRaw / sourceRaw
      : targetViaUsd / sourceViaUsd;
    const margin = Math.max(Number(usdToSource?.margin || 0), Number(usdToTarget?.margin || 0), 0);
    return {
      rate: targetViaUsd / sourceViaUsd,
      officialRate,
      margin,
      source: 'table-usd-pivot',
      fetchedAt: pivotRow?.retrieved_at || new Date().toISOString(),
      sourceType: pivotRow?.source_type || null,
      sourceUrl: resolveOfficialBankSourceUrl(pivotRow || null),
      official: Boolean(isOfficialAfricanFxRow(usdToSource) && isOfficialAfricanFxRow(usdToTarget)),
      stale: Boolean(isFxTimestampStale(usdToSource?.retrieved_at, thresholdMinutes) || isFxTimestampStale(usdToTarget?.retrieved_at, thresholdMinutes)),
    };
  }

  throw new Error(`Taux de change introuvable pour ${sourceCurrency}→${targetCurrency}`);
}

async function readActivePdgRecipients(): Promise<PdgRecipient[]> {
  const { data, error } = await supabaseAdmin
    .from('pdg_management')
    .select('user_id')
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  return ((data || []) as PdgRecipient[]).filter((item) => Boolean(item.user_id));
}

async function notifyPdgOfFxVisitFailure(params: {
  actorId: string | null;
  triggerSource: string;
  from: string;
  to: string;
  refreshStatus: number | null;
  refreshTimedOut: boolean;
  refreshPayload: any;
  liveVisitAttempted: boolean;
  refreshStartedAt: string;
}) {
  const dedupeCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const alertType = 'fx_live_visit_required_failed';
  const title = 'Transfert international suspendu: taux officiel live indisponible';
  const description = `Le backend n'a pas pu verifier en temps reel le taux officiel pour ${params.from}/${params.to}. Les transferts internationaux sur cette paire sont suspendus jusqu'a correction.`;

  const { data: existingAlert } = await supabaseAdmin
    .from('financial_security_alerts')
    .select('id')
    .eq('alert_type', alertType)
    .eq('is_resolved', false)
    .gte('created_at', dedupeCutoff)
    .contains('metadata', { from_currency: params.from, to_currency: params.to, trigger_source: params.triggerSource })
    .limit(1)
    .maybeSingle();

  if (!existingAlert) {
    await ignoreSupabaseError(
      supabaseAdmin.from('financial_security_alerts').insert({
        user_id: params.actorId || SYSTEM_USER_ID,
        alert_type: alertType,
        severity: 'critical',
        title,
        description,
        metadata: {
          actor_id: params.actorId,
          trigger_source: params.triggerSource,
          from_currency: params.from,
          to_currency: params.to,
          refresh_status: params.refreshStatus,
          refresh_timed_out: params.refreshTimedOut,
          refresh_payload: params.refreshPayload,
          live_visit_attempted: params.liveVisitAttempted,
          refresh_started_at: params.refreshStartedAt,
        },
      }),
    );
  }

  const pdgRecipients = await readActivePdgRecipients().catch(() => [] as PdgRecipient[]);
  if (!pdgRecipients.length) {
    return;
  }

  const notificationMessage = `Le backend n'a pas pu visiter une source officielle en temps reel pour ${params.from}/${params.to}. Les transferts internationaux ont ete suspendus automatiquement.`;

  const notificationsToInsert: Array<{ user_id: string; title: string; message: string; type: string; read: boolean }> = [];

  for (const recipient of pdgRecipients) {
    const { data: existingNotification } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('user_id', recipient.user_id)
      .eq('title', title)
      .eq('message', notificationMessage)
      .gte('created_at', dedupeCutoff)
      .limit(1)
      .maybeSingle();

    if (!existingNotification) {
      notificationsToInsert.push({
        user_id: recipient.user_id,
        title,
        message: notificationMessage,
        type: 'security_alert',
        read: false,
      });
    }
  }

  if (notificationsToInsert.length > 0) {
    await ignoreSupabaseError(supabaseAdmin.from('notifications').insert(notificationsToInsert));
  }
}

async function getFreshAfricanFxRateForTransaction(from: string, to: string, actorId: string | null, triggerSource: string): Promise<InternalFxRateResult> {
  const sourceCurrency = String(from || '').toUpperCase();
  const targetCurrency = String(to || '').toUpperCase();
  const refreshStartedAt = new Date().toISOString();
  let refreshStatus: number | null = null;
  let refreshTimedOut = false;
  let refreshPayload: any = null;
  let liveVisitAttempted = false;
  const configuredMargin = await getConfiguredFxMargin();

  liveVisitAttempted = true;
  const liveBcrgRate = await fetchLiveBcrgUsdGnf().catch(() => null);
  const directOfficialRate = buildLiveBcrgFxRate(sourceCurrency, targetCurrency, liveBcrgRate, configuredMargin);
  if (directOfficialRate) {
    return directOfficialRate;
  }

  const refreshResult = await triggerAfricanFxCollection(triggerSource, actorId, 6500);
  refreshStatus = refreshResult.status;
  refreshTimedOut = refreshResult.timedOut;
  refreshPayload = refreshResult.payload;

  const refreshedRate = await getInternalFxRateFromTable(sourceCurrency, targetCurrency, refreshStartedAt).catch(() => null);

  if (refreshedRate?.official && !refreshedRate.stale) {
    return {
      ...refreshedRate,
      refreshAttempted: true,
      refreshStatus: refreshResult.status,
      refreshTimedOut: refreshResult.timedOut,
    };
  }

  const refreshedLiveBcrgRate = await fetchLiveBcrgUsdGnf().catch(() => null);
  const refreshedDirectOfficialRate = buildLiveBcrgFxRate(sourceCurrency, targetCurrency, refreshedLiveBcrgRate, configuredMargin);
  if (refreshedDirectOfficialRate) {
    return {
      ...refreshedDirectOfficialRate,
      refreshAttempted: true,
      refreshStatus: refreshResult.status,
      refreshTimedOut: refreshResult.timedOut,
    };
  }

  await notifyPdgOfFxVisitFailure({
    actorId,
    triggerSource,
    from: sourceCurrency,
    to: targetCurrency,
    refreshStatus,
    refreshTimedOut,
    refreshPayload,
    liveVisitAttempted,
    refreshStartedAt,
  });

  // Fallback final: taux depuis la table (direct/inverse/pivot USD/pont GNF)
  // Permet aux transferts de continuer si le scraping BCRG échoue depuis Vercel
  const tableFallback = await getTableFxRate(sourceCurrency, targetCurrency).catch(() => null);
  if (tableFallback && Number.isFinite(tableFallback.rate) && tableFallback.rate > 0) {
    const configuredMarginFallback = await getConfiguredFxMargin();
    // Considérer le taux comme récent si collecté il y a moins de 4 heures
    const fetchedMs = tableFallback.fetched_at ? new Date(tableFallback.fetched_at).getTime() : 0;
    const ageHours = (Date.now() - fetchedMs) / 3_600_000;
    const isTableRateStale = !Number.isFinite(ageHours) || ageHours > 4;
    logger.info(`[FX] Fallback table pour ${sourceCurrency}->${targetCurrency}: rate=${tableFallback.rate} source=${tableFallback.source} ageH=${ageHours.toFixed(1)} stale=${isTableRateStale}`);
    return {
      rate: tableFallback.rate,
      officialRate: tableFallback.rate / (1 + configuredMarginFallback),
      margin: configuredMarginFallback,
      source: tableFallback.source,
      fetchedAt: tableFallback.fetched_at,
      sourceType: 'table-collected',
      sourceUrl: null,
      official: false,
      stale: isTableRateStale,
      refreshAttempted: true,
      refreshStatus,
      refreshTimedOut,
    };
  }

  const freshnessText = refreshedRate
    ? `source=${refreshedRate.source}, official=${refreshedRate.official}, stale=${refreshedRate.stale}, fetchedAt=${refreshedRate.fetchedAt}`
    : 'source=none, official=false, stale=true, fetchedAt=none';
  throw new Error(`Aucun taux officiel africain recent n'est disponible pour ${sourceCurrency}->${targetCurrency} avant conversion (${freshnessText})`);
}

function isAfricanBankRow(row: { source_url?: string | null; source?: string | null; source_type?: string | null }): boolean {
  if (row?.source_url && isAfricanBankSourceUrl(row.source_url)) {
    return true;
  }

  const source = String(row?.source || '').toLowerCase();
  const sourceType = String(row?.source_type || '').toLowerCase();
  const text = `${source} ${sourceType}`;

  if (sourceType === 'official_fixed_parity' || sourceType === 'official_cross' || sourceType === 'official_html') {
    return true;
  }

  return /bcrg|bceao|beac|cbn|sarb|ecobank|orabank|afreximbank|banque|bank|afric/i.test(text);
}

function resolveOfficialBankSourceUrl(row: { source_url?: string | null; source?: string | null; source_type?: string | null }): string | null {
  if (row?.source_url) return row.source_url;

  const text = `${String(row?.source || '').toLowerCase()} ${String(row?.source_type || '').toLowerCase()}`;

  if (/bcrg|banque centrale de guinee|banque centrale de guinée/.test(text)) {
    return BCRG_OFFICIAL_URL;
  }

  return null;
}

function parseFxRateNumber(rawValue: string): number {
  const parsed = Number.parseFloat(String(rawValue || '').replace(/\u00a0/g, ' ').replace(/\s/g, '').replace(/,/g, '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizeBcrgUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl, BCRG_OFFICIAL_URL).toString();
  } catch {
    return rawUrl;
  }
}

function extractBcrgFixingUrls(html: string): string[] {
  const urls: string[] = [];
  const pushUrl = (value: string) => {
    const normalized = normalizeBcrgUrl(value);
    if (!normalized.includes('/cours_des_devises/fixing-du-')) return;
    if (!urls.includes(normalized)) {
      urls.push(normalized);
    }
  };

  for (const match of html.matchAll(/href=["']([^"']*\/cours_des_devises\/fixing-du-[^"']+)["']/gi)) {
    pushUrl(match[1]);
  }

  for (const match of html.matchAll(/https?:\/\/www\.bcrg-guinee\.org\/cours_des_devises\/fixing-du-[^"'\s<]+/gi)) {
    pushUrl(match[0]);
  }

  return urls.sort((left, right) => right.localeCompare(left));
}

function extractBcrgWidgetRate(html: string, currency: 'USD' | 'EUR'): number | null {
  const labelPattern = currency === 'USD' ? '(?:USD|Dollar)' : '(?:EUR|Euro)';
  const patterns = [
    new RegExp(`${labelPattern}\\s*=\\s*<\\/h\\d>[\\s\\S]{0,1800}?<h\\d[^>]*>\\s*([\\d\\s.,]+)\\s*<\\/h\\d>`, 'gi'),
    new RegExp(`<td[^>]*>\\s*${labelPattern}\\s*=?\\s*<\\/td>\\s*<td[^>]*>\\s*([\\d\\s.,]+)\\s*<\\/td>`, 'gi'),
    new RegExp(`(?:1\\s*${currency}\\s*=\\s*|${currency}\\s*\\/\\s*GNF\\s*[:=]\\s*)([\\d\\s.,]+)`, 'gi'),
  ];

  for (const pattern of patterns) {
    const matches = Array.from(html.matchAll(pattern));
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const parsed = parseFxRateNumber(matches[index]?.[1] || '');
      if (Number.isFinite(parsed) && parsed > 1000 && parsed < 25000) {
        return parsed;
      }
    }
  }

  return null;
}

async function fetchBcrgHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': '224Solutions-FX-Monitor/2.0',
        Accept: 'text/html',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn(`[walletV2] BCRG HTTP ${response.status} sur ${url}`);
      return null;
    }

    return await response.text();
  } catch (error: any) {
    const message = error?.name === 'AbortError' ? 'timeout' : String(error?.message || error || 'unknown error');
    logger.warn(`[walletV2] BCRG fetch echoue sur ${url}: ${message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLiveBcrgUsdGnf(): Promise<{ usdGnf: number; eurGnf: number | null; retrievedAt: string; sourceUrl: string | null } | null> {
  let homepageHtml: string | null = null;

  try {
    homepageHtml = await fetchBcrgHtml(BCRG_OFFICIAL_URL);
  } catch {
    homepageHtml = null;
  }

  const fixingUrls = homepageHtml ? extractBcrgFixingUrls(homepageHtml) : [];
  const urlsToTry = Array.from(new Set([
    ...fixingUrls,
    ...BCRG_SCRAPE_URLS,
  ]));

  for (const url of urlsToTry) {
    const html = url === BCRG_OFFICIAL_URL && homepageHtml
      ? homepageHtml
      : await fetchBcrgHtml(url);

    if (!html) {
      continue;
    }

    const usdGnf = extractBcrgWidgetRate(html, 'USD');
    if (!usdGnf) {
      continue;
    }

    return {
      usdGnf,
      eurGnf: extractBcrgWidgetRate(html, 'EUR'),
      retrievedAt: new Date().toISOString(),
      sourceUrl: url,
    };
  }

  return null;
}

async function getConfiguredFxMargin(): Promise<number> {
  const { data } = await supabaseAdmin
    .from('margin_config')
    .select('config_value')
    .eq('config_key', 'default_margin')
    .maybeSingle();

  const margin = Number((data as any)?.config_value ?? 0.03);
  return Number.isFinite(margin) && margin >= 0 ? margin : 0.03;
}

function buildLiveBcrgFxRate(
  from: string,
  to: string,
  liveRate: { usdGnf: number; eurGnf: number | null; retrievedAt: string; sourceUrl: string | null } | null,
  margin = 0,
): InternalFxRateResult | null {
  if (!liveRate) return null;

  const sourceCurrency = String(from || '').toUpperCase();
  const targetCurrency = String(to || '').toUpperCase();
  const shared: Omit<InternalFxRateResult, 'rate'> = {
    officialRate: 1,
    margin,
    source: 'bcrg-live-widget',
    fetchedAt: liveRate.retrievedAt,
    sourceType: 'official_html',
    sourceUrl: liveRate.sourceUrl || BCRG_OFFICIAL_URL,
    official: true,
    stale: false,
  };

  if (sourceCurrency === 'USD' && targetCurrency === 'GNF' && liveRate.usdGnf > 0) {
    return { rate: liveRate.usdGnf * (1 + margin), ...shared, officialRate: liveRate.usdGnf };
  }

  if (sourceCurrency === 'GNF' && targetCurrency === 'USD' && liveRate.usdGnf > 0) {
    return { rate: 1 / (liveRate.usdGnf * (1 + margin)), ...shared, officialRate: 1 / liveRate.usdGnf };
  }

  if (sourceCurrency === 'EUR' && targetCurrency === 'GNF' && Number.isFinite(liveRate.eurGnf) && Number(liveRate.eurGnf) > 0) {
    return { rate: Number(liveRate.eurGnf) * (1 + margin), ...shared, officialRate: Number(liveRate.eurGnf) };
  }

  if (sourceCurrency === 'GNF' && targetCurrency === 'EUR' && Number.isFinite(liveRate.eurGnf) && Number(liveRate.eurGnf) > 0) {
    return { rate: 1 / (Number(liveRate.eurGnf) * (1 + margin)), ...shared, officialRate: 1 / Number(liveRate.eurGnf) };
  }

  return null;
}

function buildAfricanFxCollectPayload(source: string, actorId: string | null) {
  return {
    source,
    actor_id: actorId,
    strict_african_sources: true,
    include_all_african_banks: true,
    primary_source_url: BCRG_OFFICIAL_URL,
    preferred_currency_pairs: [
      { from: 'USD', to: 'GNF' },
      { from: 'EUR', to: 'GNF' },
    ],
    bcrg_source_urls: BCRG_SCRAPE_URLS,
    preferred_source_urls: AFRICAN_BANK_SOURCE_URLS,
  };
}

async function triggerAfricanFxCollection(source: string, actorId: string | null, timeoutMs = 3500): Promise<{ ok: boolean; status: number | null; payload: any; timedOut: boolean }> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn('FX collect trigger skipped: Supabase env manquante');
    return {
      ok: false,
      status: null,
      payload: { message: 'Configuration Supabase manquante' },
      timedOut: false,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/african-fx-collect`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildAfricanFxCollectPayload(source, actorId)),
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload: any = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = raw ? { raw } : null;
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
      timedOut: false,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return {
        ok: true,
        status: 202,
        payload: { queued: true, message: 'Collecte FX lancée en arrière-plan.' },
        timedOut: true,
      };
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveRecipient(rawRecipient: string): Promise<ResolvedRecipient | null> {
  const candidate = String(rawRecipient || '').trim();
  if (!candidate) return null;

  if (UUID_REGEX.test(candidate)) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone, first_name, last_name, public_id, custom_id')
      .eq('id', candidate)
      .maybeSingle();

    const displayName = profile
      ? `${String((profile as any).first_name || '').trim()} ${String((profile as any).last_name || '').trim()}`.trim() || null
      : null;

    return {
      userId: candidate,
      query: candidate,
      matchedBy: 'uuid',
      displayName,
      email: profile ? String((profile as any).email || '') || null : null,
      phone: profile ? String((profile as any).phone || '') || null : null,
      publicId: profile ? String((profile as any).public_id || '') || null : null,
      customId: profile ? String((profile as any).custom_id || '') || null : null,
    };
  }

  const normalizedId = candidate.toUpperCase();

  const { data: fromUserIds } = await supabaseAdmin
    .from('user_ids')
    .select('user_id')
    .eq('custom_id', normalizedId)
    .maybeSingle();

  if (fromUserIds?.user_id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone, first_name, last_name, public_id, custom_id')
      .eq('id', fromUserIds.user_id)
      .maybeSingle();

    const displayName = profile
      ? `${String((profile as any).first_name || '').trim()} ${String((profile as any).last_name || '').trim()}`.trim() || null
      : null;

    return {
      userId: fromUserIds.user_id,
      query: candidate,
      matchedBy: 'user_ids.custom_id',
      displayName,
      email: profile ? String((profile as any).email || '') || null : null,
      phone: profile ? String((profile as any).phone || '') || null : null,
      publicId: profile ? String((profile as any).public_id || '') || null : null,
      customId: profile ? String((profile as any).custom_id || '') || null : null,
    };
  }

  const { data: fromProfileIds } = await supabaseAdmin
    .from('profiles')
    .select('id, email, phone, first_name, last_name, public_id, custom_id')
    .or(`public_id.eq.${normalizedId},custom_id.eq.${normalizedId}`)
    .maybeSingle();

  if (fromProfileIds?.id) {
    const matchedBy = String((fromProfileIds as any).public_id || '').toUpperCase() === normalizedId
      ? 'profiles.public_id'
      : 'profiles.custom_id';
    const displayName = `${String((fromProfileIds as any).first_name || '').trim()} ${String((fromProfileIds as any).last_name || '').trim()}`.trim() || null;
    return {
      userId: fromProfileIds.id,
      query: candidate,
      matchedBy,
      displayName,
      email: String((fromProfileIds as any).email || '') || null,
      phone: String((fromProfileIds as any).phone || '') || null,
      publicId: String((fromProfileIds as any).public_id || '') || null,
      customId: String((fromProfileIds as any).custom_id || '') || null,
    };
  }

  const normalizedEmail = candidate.toLowerCase();
  if (normalizedEmail.includes('@')) {
    const { data: fromEmail } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone, first_name, last_name, public_id, custom_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (fromEmail?.id) {
      const displayName = `${String((fromEmail as any).first_name || '').trim()} ${String((fromEmail as any).last_name || '').trim()}`.trim() || null;
      return {
        userId: fromEmail.id,
        query: candidate,
        matchedBy: 'profiles.email',
        displayName,
        email: String((fromEmail as any).email || '') || null,
        phone: String((fromEmail as any).phone || '') || null,
        publicId: String((fromEmail as any).public_id || '') || null,
        customId: String((fromEmail as any).custom_id || '') || null,
      };
    }

    const { data: authUser } = await supabaseAdmin
      .schema('auth')
      .from('users')
      .select('id, email, phone')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (authUser?.id) {
      return {
        userId: authUser.id,
        query: candidate,
        matchedBy: 'auth.users.email',
        displayName: null,
        email: String((authUser as any).email || '') || null,
        phone: String((authUser as any).phone || '') || null,
        publicId: null,
        customId: null,
      };
    }
  }

  const phoneCandidates = normalizePhoneCandidates(candidate);
  if (phoneCandidates.length > 0) {
    const phoneFilter = phoneCandidates.map((p) => `phone.eq.${p}`).join(',');
    const { data: fromPhone } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone, first_name, last_name, public_id, custom_id')
      .or(phoneFilter)
      .limit(1)
      .maybeSingle();

    if (fromPhone?.id) {
      const displayName = `${String((fromPhone as any).first_name || '').trim()} ${String((fromPhone as any).last_name || '').trim()}`.trim() || null;
      return {
        userId: fromPhone.id,
        query: candidate,
        matchedBy: 'profiles.phone',
        displayName,
        email: String((fromPhone as any).email || '') || null,
        phone: String((fromPhone as any).phone || '') || null,
        publicId: String((fromPhone as any).public_id || '') || null,
        customId: String((fromPhone as any).custom_id || '') || null,
      };
    }

    const authPhoneFilter = phoneCandidates.map((p) => `phone.eq.${p}`).join(',');
    const { data: authPhone } = await supabaseAdmin
      .schema('auth')
      .from('users')
      .select('id, email, phone')
      .or(authPhoneFilter)
      .limit(1)
      .maybeSingle();

    if (authPhone?.id) {
      return {
        userId: authPhone.id,
        query: candidate,
        matchedBy: 'auth.users.phone',
        displayName: null,
        email: String((authPhone as any).email || '') || null,
        phone: String((authPhone as any).phone || '') || null,
        publicId: null,
        customId: null,
      };
    }
  }

  if (normalizedEmail.includes('@')) {
    const { data: pdgByEmail } = await supabaseAdmin
      .from('pdg_management')
      .select('user_id, name, email, phone')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (pdgByEmail?.user_id) {
      return {
        userId: String((pdgByEmail as any).user_id),
        query: candidate,
        matchedBy: 'pdg_management.email',
        displayName: String((pdgByEmail as any).name || '') || null,
        email: String((pdgByEmail as any).email || '') || null,
        phone: String((pdgByEmail as any).phone || '') || null,
        publicId: null,
        customId: null,
      };
    }
  }

  if (phoneCandidates.length > 0) {
    const pdgPhoneFilter = phoneCandidates.map((p) => `phone.eq.${p}`).join(',');
    const { data: pdgByPhone } = await supabaseAdmin
      .from('pdg_management')
      .select('user_id, name, email, phone')
      .or(pdgPhoneFilter)
      .limit(1)
      .maybeSingle();

    if (pdgByPhone?.user_id) {
      return {
        userId: String((pdgByPhone as any).user_id),
        query: candidate,
        matchedBy: 'pdg_management.phone',
        displayName: String((pdgByPhone as any).name || '') || null,
        email: String((pdgByPhone as any).email || '') || null,
        phone: String((pdgByPhone as any).phone || '') || null,
        publicId: null,
        customId: null,
      };
    }
  }

  // Recherche dans agents_management par code agent (AGT...)
  {
    const { data: agentByCode } = await supabaseAdmin
      .from('agents_management')
      .select('user_id, name, email, phone, agent_code')
      .eq('agent_code', normalizedId)
      .maybeSingle();

    if (agentByCode?.user_id) {
      return {
        userId: String((agentByCode as any).user_id),
        query: candidate,
        matchedBy: 'agents_management.agent_code',
        displayName: String((agentByCode as any).name || '') || null,
        email: String((agentByCode as any).email || '') || null,
        phone: String((agentByCode as any).phone || '') || null,
        publicId: String((agentByCode as any).agent_code || '') || null,
        customId: null,
      };
    }
  }

  // Recherche dans agents_management par email
  if (normalizedEmail.includes('@')) {
    const { data: agentByEmail } = await supabaseAdmin
      .from('agents_management')
      .select('user_id, name, email, phone, agent_code')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (agentByEmail?.user_id) {
      return {
        userId: String((agentByEmail as any).user_id),
        query: candidate,
        matchedBy: 'agents_management.email',
        displayName: String((agentByEmail as any).name || '') || null,
        email: String((agentByEmail as any).email || '') || null,
        phone: String((agentByEmail as any).phone || '') || null,
        publicId: String((agentByEmail as any).agent_code || '') || null,
        customId: null,
      };
    }
  }

  // Recherche dans agents_management par téléphone
  if (phoneCandidates.length > 0) {
    const agentPhoneFilter = phoneCandidates.map((p) => `phone.eq.${p}`).join(',');
    const { data: agentByPhone } = await supabaseAdmin
      .from('agents_management')
      .select('user_id, name, email, phone, agent_code')
      .or(agentPhoneFilter)
      .limit(1)
      .maybeSingle();

    if (agentByPhone?.user_id) {
      return {
        userId: String((agentByPhone as any).user_id),
        query: candidate,
        matchedBy: 'agents_management.phone',
        displayName: String((agentByPhone as any).name || '') || null,
        email: String((agentByPhone as any).email || '') || null,
        phone: String((agentByPhone as any).phone || '') || null,
        publicId: String((agentByPhone as any).agent_code || '') || null,
        customId: null,
      };
    }
  }

  return null;
}

async function resolveRecipientUserId(rawRecipient: string): Promise<string | null> {
  const resolved = await resolveRecipient(rawRecipient);
  return resolved?.userId || null;
}

router.get('/recipient/resolve', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) {
      res.status(400).json({ success: false, error: 'q requis (ID public, email, telephone ou UUID)' });
      return;
    }

    const resolved = await resolveRecipient(query);
    if (!resolved) {
      res.status(404).json({ success: false, error: 'Destinataire introuvable' });
      return;
    }

    if (resolved.userId === req.user!.id) {
      res.status(400).json({ success: false, error: 'Transfert vers soi-meme non autorise' });
      return;
    }

    res.json({ success: true, data: resolved });
  } catch (error: any) {
    logger.error(`Wallet recipient resolve error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la resolution du destinataire' });
  }
});

/**
 * POST /api/v2/wallet/transfer/preview
 * Prévisualisation d'un transfert wallet (frais, solde après, informations destinataire).
 * Entièrement côté backend Node.js (plus de dépendance Edge Function wallet-transfer).
 */
router.post('/transfer/preview', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { amount, recipient_id } = req.body || {};

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'Montant invalide' });
      return;
    }
    if (!recipient_id || typeof recipient_id !== 'string') {
      res.status(400).json({ success: false, error: 'recipient_id requis' });
      return;
    }

    const resolved = await resolveRecipient(recipient_id);
    if (!resolved) {
      res.status(404).json({ success: false, error: 'Destinataire introuvable' });
      return;
    }

    if (resolved.userId === senderId) {
      res.status(400).json({ success: false, error: 'Transfert vers soi-même non autorisé' });
      return;
    }

    const senderWallet = await ensureTransferWallet(senderId);
    const recipientWallet = senderWallet
      ? await ensureTransferWallet(resolved.userId, String((senderWallet as any).currency || 'GNF'))
      : null;

    if (!senderWallet) {
      res.status(500).json({ success: false, error: 'Wallet expéditeur indisponible' });
      return;
    }

    if (!recipientWallet) {
      res.status(500).json({ success: false, error: 'Wallet destinataire indisponible' });
      return;
    }

    const feePercentage = 0;
    const feeAmount = 0;
    const totalDebit = amount + feeAmount;
    const senderBalance = Number((senderWallet as any).balance || 0);

    if (senderBalance < totalDebit) {
      res.status(402).json({ success: false, error: 'Solde insuffisant' });
      return;
    }

    const senderCurrency = String((senderWallet as any).currency || 'GNF').toUpperCase();
    const receiverCurrency = String((recipientWallet as any).currency || senderCurrency).toUpperCase();
    const isInternational = senderCurrency !== receiverCurrency;
    const amountAfterFee = amount;
    let rateDisplayed = 1;
    let officialRate = 1;
    let fxMargin = 0;
    let amountReceived = amountAfterFee;
    let rateSource = 'identity';
    let rateFetchedAt = new Date().toISOString();
    let rateSourceType: string | null = 'identity';
    let rateSourceUrl: string | null = null;
    let rateIsOfficial = true;
    let rateIsStale = false;

    if (isInternational) {
      const fxResult = await getFreshAfricanFxRateForTransaction(
        senderCurrency,
        receiverCurrency,
        senderId,
        'wallet_transfer_preview',
      );
      rateDisplayed = fxResult.rate;
      officialRate = fxResult.officialRate;
      fxMargin = fxResult.margin;
      rateSource = fxResult.source;
      rateFetchedAt = fxResult.fetchedAt;
      rateSourceType = fxResult.sourceType;
      rateSourceUrl = fxResult.sourceUrl;
      rateIsOfficial = fxResult.official;
      rateIsStale = fxResult.stale;
      amountReceived = smartRoundCurrencyAmount(amountAfterFee * rateDisplayed, receiverCurrency);
    }

    res.json({
      success: true,
      is_international: isInternational,
      sender: {
        id: senderId,
        name: null,
        email: req.user?.email || null,
        phone: null,
        custom_id: null,
      },
      receiver: {
        id: resolved.userId,
        name: resolved.displayName,
        email: resolved.email,
        phone: resolved.phone,
        custom_id: resolved.customId || resolved.publicId || null,
      },
      receiver_name: resolved.displayName,
      receiver_email: resolved.email,
      receiver_phone: resolved.phone,
      receiver_code: resolved.customId || resolved.publicId || resolved.userId,
      amount_sent: amount,
      currency_sent: senderCurrency,
      fee_percentage: feePercentage,
      fee_amount: feeAmount,
      amount_after_fee: amountAfterFee,
      total_debit: totalDebit,
      amount_received: amountReceived,
      currency_received: receiverCurrency,
      rate_displayed: rateDisplayed,
      official_rate: officialRate,
      fx_margin: fxMargin,
      sender_balance: senderBalance,
      balance_after: senderBalance - totalDebit,
      sender_country: mapCurrencyToCountry(senderCurrency),
      receiver_country: mapCurrencyToCountry(receiverCurrency),
      commission_conversion: 0,
      frais_international: 0,
      rate_source: rateSource,
      rate_fetched_at: rateFetchedAt,
      rate_source_type: rateSourceType,
      rate_source_url: rateSourceUrl,
      rate_is_official: rateIsOfficial,
      rate_is_stale: rateIsStale,
      rate_lock_seconds: 60,
    });
  } catch (error: any) {
    logger.error(`Wallet transfer preview error: ${error.message}`);
    const message = String(error?.message || 'Erreur lors de la previsualisation du transfert');
    const isFxError = /Aucun taux officiel africain recent|Taux de change introuvable/i.test(message);
    res.status(isFxError ? 503 : 500).json({
      success: false,
      error: isFxError ? message : 'Erreur lors de la previsualisation du transfert',
    });
  }
});

/**
 * GET /api/v2/wallet/balance
 * Récupère le solde du wallet de l'utilisateur connecté
 */
router.get('/balance', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, currency, wallet_status, is_blocked, daily_limit, monthly_limit, created_at')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (error) throw error;

    res.json({ success: true, data: data || null, exists: !!data });
  } catch (error: any) {
    logger.error(`Wallet balance error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération du solde' });
  }
});

/**
 * POST /api/v2/wallet/initialize
 * Initialise le wallet si inexistant
 */
router.post('/initialize', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Vérifier si le wallet existe
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      res.json({ success: true, wallet: existing, created: false });
      return;
    }

    // Récupérer le pays du profil pour déterminer la devise
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('detected_country, country, detected_currency')
      .eq('id', userId)
      .maybeSingle();

    const userCountry = profile?.detected_country || profile?.country || 'GN';
    const walletCurrency = (profile?.detected_currency && profile.detected_currency !== 'GNF')
      ? profile.detected_currency
      : countryToCurrency(userCountry);

    const { data: newWallet, error: insertError } = await supabaseAdmin
      .from('wallets')
      .insert({
        user_id: userId,
        currency: walletCurrency,
        currency_locked: true,
        currency_locked_at: new Date().toISOString(),
        currency_lock_reason: `Devise assignée selon pays de résidence: ${userCountry}`,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    logger.info(`Wallet created for user: ${userId}, currency: ${walletCurrency} (country: ${userCountry})`);
    res.status(201).json({ success: true, wallet: newWallet, created: true });
  } catch (error: any) {
    logger.error(`Wallet init error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'initialisation du wallet' });
  }
});

/**
 * GET /api/v2/wallet/transactions
 * Historique des transactions du wallet
 */
router.get('/transactions', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Récupérer le wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!wallet) {
      res.json({ success: true, data: [], meta: { total: 0, limit, offset, hasMore: false } });
      return;
    }

    // Transactions où l'utilisateur est sender OU receiver
    const { data, error, count } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .or(`sender_wallet_id.eq.${wallet.id},receiver_wallet_id.eq.${wallet.id}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      meta: { limit, offset, total: count || 0, hasMore: (offset + limit) < (count || 0) }
    });
  } catch (error: any) {
    logger.error(`Wallet transactions error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * GET /api/v2/wallet/status
 * Statut complet du wallet (sécurité, limites, blocage)
 */
router.get('/status', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, currency, wallet_status, is_blocked, blocked_reason, blocked_at, biometric_enabled, daily_limit, monthly_limit, created_at, updated_at, pin_enabled, pin_failed_attempts, pin_locked_until, pin_updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error) {
      if (!data) {
        res.json({ success: true, exists: false, data: null });
        return;
      }

      res.json({ success: true, exists: true, data });
      return;
    }

    const errorMessage = String(error.message || error.details || '');
    const pinSchemaMissing = /pin_hash|pin_enabled|pin_failed_attempts|pin_locked_until|pin_updated_at/i.test(errorMessage)
      && /column|does not exist|schema cache/i.test(errorMessage);

    if (!pinSchemaMissing) {
      throw error;
    }

    const [{ data: walletData, error: walletError }, pinState] = await Promise.all([
      supabaseAdmin
        .from('wallets')
        .select('id, balance, currency, wallet_status, is_blocked, blocked_reason, blocked_at, biometric_enabled, daily_limit, monthly_limit, created_at, updated_at')
        .eq('user_id', userId)
        .maybeSingle(),
      getWalletPinState(userId),
    ]);

    if (walletError) {
      throw walletError;
    }

    if (!walletData) {
      res.json({ success: true, exists: false, data: null });
      return;
    }

    res.json({
      success: true,
      exists: true,
      data: {
        ...walletData,
        pin_enabled: hasWalletPinEnabled(pinState),
        pin_failed_attempts: Number(pinState?.pin_failed_attempts || 0),
        pin_locked_until: pinState?.pin_locked_until || null,
        pin_updated_at: pinState?.pin_updated_at || null,
      },
    });
  } catch (error: any) {
    logger.error(`Wallet status error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

router.get('/pin/status', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wallet = await ensureWalletExistsForPin(req.user!.id);
    res.json({
      success: true,
      data: {
        pin_enabled: hasWalletPinEnabled(wallet),
        pin_failed_attempts: Number(wallet?.pin_failed_attempts || 0),
        pin_locked_until: wallet?.pin_locked_until || null,
        pin_updated_at: wallet?.pin_updated_at || null,
        policy: getWalletPinPolicy(),
      },
    });
  } catch (error: any) {
    logger.error(`Wallet pin status error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors du chargement du statut PIN' });
  }
});

router.post('/pin/setup', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pin, confirm_pin, confirmPin } = req.body || {};
    const confirmPinValue = confirm_pin ?? confirmPin;

    if (typeof pin !== 'string' || typeof confirmPinValue !== 'string') {
      res.status(400).json({ success: false, error: 'pin et confirm_pin requis' });
      return;
    }
    if (pin !== confirmPinValue) {
      res.status(400).json({ success: false, error: 'Les deux codes PIN ne correspondent pas' });
      return;
    }

    await setupWalletPin(req.user!.id, pin);
    res.json({ success: true, message: 'Code PIN configuré avec succès' });
  } catch (error: any) {
    logger.error(`Wallet pin setup error: ${error.message}`);
    res.status(400).json({ success: false, error: error.message || 'Erreur lors de la configuration du code PIN' });
  }
});

router.post('/pin/change', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { current_pin, new_pin, confirm_pin, currentPin, newPin, confirmPin } = req.body || {};
    const currentPinValue = current_pin ?? currentPin;
    const newPinValue = new_pin ?? newPin;
    const confirmPinValue = confirm_pin ?? confirmPin;

    if (typeof currentPinValue !== 'string' || typeof newPinValue !== 'string' || typeof confirmPinValue !== 'string') {
      res.status(400).json({ success: false, error: 'current_pin, new_pin et confirm_pin requis' });
      return;
    }
    if (newPinValue !== confirmPinValue) {
      res.status(400).json({ success: false, error: 'Le nouveau code PIN et sa confirmation ne correspondent pas' });
      return;
    }

    await changeWalletPin(req.user!.id, currentPinValue, newPinValue);
    res.json({ success: true, message: 'Code PIN modifié avec succès' });
  } catch (error: any) {
    logger.error(`Wallet pin change error: ${error.message}`);
    res.status(400).json({ success: false, error: error.message || 'Erreur lors du changement du code PIN' });
  }
});

router.post('/pin/reset', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { account_password, new_pin, confirm_pin, accountPassword, newPin, confirmPin } = req.body || {};
    const accountPasswordValue = account_password ?? accountPassword;
    const newPinValue = new_pin ?? newPin;
    const confirmPinValue = confirm_pin ?? confirmPin;

    if (typeof accountPasswordValue !== 'string' || typeof newPinValue !== 'string' || typeof confirmPinValue !== 'string') {
      res.status(400).json({ success: false, error: 'account_password, new_pin et confirm_pin requis' });
      return;
    }
    if (newPinValue !== confirmPinValue) {
      res.status(400).json({ success: false, error: 'Le nouveau code PIN et sa confirmation ne correspondent pas' });
      return;
    }

    await resetWalletPinWithPassword(req.user!.id, req.user?.email || null, accountPasswordValue, newPinValue, {
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
      userAgent: req.headers['user-agent']?.toString() || null,
    });
    res.json({ success: true, message: 'Code PIN réinitialisé avec succès' });
  } catch (error: any) {
    logger.error(`Wallet pin reset error: ${error.message}`);
    res.status(400).json({ success: false, error: error.message || 'Erreur lors de la réinitialisation du code PIN' });
  }
});

// ─────────────────────────────────────────────────────────
// WALLET OPERATIONS — Migré depuis Edge Functions wallet-operations / wallet-transfer
// ─────────────────────────────────────────────────────────

/**
 * POST /api/v2/wallet/deposit
 * Crédite le wallet de l'utilisateur connecté.
 *
 * Auth : verifyJWT
 * Body : { amount, description?, reference?, idempotency_key? }
 */
router.post('/deposit', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, description, reference, idempotency_key } = req.body || {};

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'Montant invalide' });
      return;
    }
    if (amount > 100000000) {
      res.status(400).json({ success: false, error: 'Montant trop élevé' });
      return;
    }

    const idemKey = idempotency_key || `deposit:${userId}:${amount}:${Math.floor(Date.now() / 60000)}`;
    const ref = reference || `dep_${Date.now()}`;

    const result = await creditWallet(userId, amount, description || 'Dépôt', ref, 'deposit', idemKey);

    if (!result.success) {
      await emitCoreFeatureEvent({
        featureKey: 'wallet.deposit',
        coreEngine: 'payment',
        ownerModule: 'wallet',
        criticality: 'high',
        status: 'failure',
        userId,
        payload: { amount, error: result.error || 'deposit_failed' },
      });
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // Déclencher commissions affiliées
    await triggerAffiliateCommission(userId, amount, 'deposit', ref);

    logger.info(`[WalletV2] Deposit: user=${userId}, amount=${amount}`);
    await emitCoreFeatureEvent({
      featureKey: 'wallet.deposit',
      coreEngine: 'payment',
      ownerModule: 'wallet',
      criticality: 'high',
      status: 'success',
      userId,
      payload: { amount },
    });
    res.json({ success: true, new_balance: result.newBalance, operation: 'deposit' });
  } catch (error: any) {
    logger.error(`Wallet deposit error: ${error.message}`);
    await emitCoreFeatureEvent({
      featureKey: 'wallet.deposit',
      coreEngine: 'payment',
      ownerModule: 'wallet',
      criticality: 'high',
      status: 'failure',
      userId: req.user?.id || null,
      payload: { error: error.message },
    });
    res.status(500).json({ success: false, error: 'Erreur lors du dépôt' });
  }
});

/**
 * POST /api/v2/wallet/withdraw
 * Débite le wallet de l'utilisateur connecté.
 *
 * Auth : verifyJWT
 * Body : { amount, description?, idempotency_key }
 */
router.post('/withdraw', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, description, idempotency_key, pin } = req.body || {};

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'Montant invalide' });
      return;
    }

    const pinCheck = await requireValidTransactionPin(userId, pin);
    if (!pinCheck.ok) {
      await emitCoreFeatureEvent({
        featureKey: 'wallet.withdraw',
        coreEngine: 'payment',
        ownerModule: 'wallet',
        criticality: 'critical',
        status: 'failure',
        userId,
        payload: { amount, reason: pinCheck.error || 'pin_invalid' },
      });
      res.status(403).json({ success: false, error: pinCheck.error, locked_until: pinCheck.lockedUntil || null });
      return;
    }

    const idemKey = idempotency_key || `withdraw:${userId}:${amount}:${crypto.randomBytes(8).toString('hex')}`;

    const result = await debitWallet(userId, amount, description || 'Retrait', idemKey);

    if (!result.success) {
      await emitCoreFeatureEvent({
        featureKey: 'wallet.withdraw',
        coreEngine: 'payment',
        ownerModule: 'wallet',
        criticality: 'critical',
        status: 'failure',
        userId,
        payload: { amount, error: result.error || 'withdraw_failed' },
      });
      const statusCode = result.error === 'Solde insuffisant' ? 402
        : result.error === 'Wallet bloqué' ? 403
        : result.error?.includes('activité suspecte') ? 403
        : 400;
      res.status(statusCode).json({ success: false, error: result.error });
      return;
    }

    logger.info(`[WalletV2] Withdraw: user=${userId}, amount=${amount}`);
    await emitCoreFeatureEvent({
      featureKey: 'wallet.withdraw',
      coreEngine: 'payment',
      ownerModule: 'wallet',
      criticality: 'critical',
      status: 'success',
      userId,
      payload: { amount },
    });
    res.json({ success: true, new_balance: result.newBalance, operation: 'withdraw' });
  } catch (error: any) {
    logger.error(`Wallet withdraw error: ${error.message}`);
    await emitCoreFeatureEvent({
      featureKey: 'wallet.withdraw',
      coreEngine: 'payment',
      ownerModule: 'wallet',
      criticality: 'critical',
      status: 'failure',
      userId: req.user?.id || null,
      payload: { error: error.message },
    });
    res.status(500).json({ success: false, error: 'Erreur lors du retrait' });
  }
});

/**
 * POST /api/v2/wallet/transfer
 * Transfert P2P entre deux wallets.
 *
 * Auth : verifyJWT
 * Body : { amount, recipient_id (UUID), description?, idempotency_key? }
 */
router.post('/transfer', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { amount, recipient_id, description, idempotency_key, pin } = req.body || {};

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'Montant invalide' });
      return;
    }

    const MAX_TRANSFER_AMOUNT = 50_000_000;
    const MIN_TRANSFER_AMOUNT = 100;

    if (amount < MIN_TRANSFER_AMOUNT) {
      res.status(400).json({ success: false, error: `Montant minimum: ${MIN_TRANSFER_AMOUNT}` });
      return;
    }
    if (amount > MAX_TRANSFER_AMOUNT) {
      res.status(400).json({ success: false, error: `Montant maximum: ${MAX_TRANSFER_AMOUNT.toLocaleString()}` });
      return;
    }

    if (!recipient_id || typeof recipient_id !== 'string' || !recipient_id.trim()) {
      res.status(400).json({ success: false, error: 'recipient_id requis' });
      return;
    }

    const resolvedRecipientId = await resolveRecipientUserId(recipient_id.trim());
    if (!resolvedRecipientId) {
      res.status(404).json({ success: false, error: 'Destinataire introuvable (UUID, ID public, email ou téléphone)' });
      return;
    }

    if (resolvedRecipientId === senderId) {
      res.status(400).json({ success: false, error: 'Transfert vers soi-même non autorisé' });
      return;
    }

    const pinCheck = await requireValidTransactionPin(senderId, pin);
    if (!pinCheck.ok) {
      await emitCoreFeatureEvent({
        featureKey: 'wallet.transfer',
        coreEngine: 'payment',
        ownerModule: 'wallet',
        criticality: 'critical',
        status: 'failure',
        userId: senderId,
        payload: { amount, recipient_id, resolved_recipient_id: resolvedRecipientId, reason: pinCheck.error || 'pin_invalid' },
      });
      res.status(403).json({ success: false, error: pinCheck.error, locked_until: pinCheck.lockedUntil || null });
      return;
    }

    const senderWallet = await ensureTransferWallet(senderId);
    if (!senderWallet) {
      res.status(500).json({ success: false, error: 'Wallet expéditeur indisponible' });
      return;
    }

    const recipientWallet = await ensureTransferWallet(resolvedRecipientId, String((senderWallet as any).currency || 'GNF'));
    if (!recipientWallet) {
      res.status(500).json({ success: false, error: 'Wallet destinataire indisponible' });
      return;
    }

    const senderCurrency = String(senderWallet?.currency || 'GNF').toUpperCase();
    const receiverCurrency = String(recipientWallet?.currency || senderCurrency).toUpperCase();
    const isInternational = senderCurrency !== receiverCurrency;
    let rateUsed = 1;
    let officialRate = 1;
    let fxMargin = 0;
    let rateSource = 'identity';
    let rateSourceType: string | null = 'identity';
    let rateSourceUrl: string | null = null;
    let amountToCredit = amount;

    if (isInternational) {
      const fxResult = await getFreshAfricanFxRateForTransaction(
        senderCurrency,
        receiverCurrency,
        senderId,
        'wallet_transfer_execute',
      );
      rateUsed = fxResult.rate;
      officialRate = fxResult.officialRate;
      fxMargin = fxResult.margin;
      rateSource = fxResult.source;
      rateSourceType = fxResult.sourceType;
      rateSourceUrl = fxResult.sourceUrl;
      amountToCredit = smartRoundCurrencyAmount(amount * rateUsed, receiverCurrency);
    }

    const idemKey = idempotency_key || `transfer:${senderId}:${resolvedRecipientId}:${amount}:${crypto.randomBytes(8).toString('hex')}`;

    const result = await transferBetweenWallets(
      senderId,
      resolvedRecipientId,
      amount,
      description || 'Transfert',
      idemKey,
      {
        amountToCredit,
        senderCurrency,
        receiverCurrency,
        isInternational,
        rateUsed,
        rateSource,
        feeAmount: 0,
      },
    );

    if (!result.success) {
      await emitCoreFeatureEvent({
        featureKey: 'wallet.transfer',
        coreEngine: 'payment',
        ownerModule: 'wallet',
        criticality: 'critical',
        status: 'failure',
        userId: senderId,
        payload: { amount, recipient_id, resolved_recipient_id: resolvedRecipientId, error: result.error || 'transfer_failed' },
      });
      const statusCode = result.error === 'Solde insuffisant' ? 402
        : result.error?.includes('bloqué') ? 403
        : 400;
      res.status(statusCode).json({ success: false, error: result.error });
      return;
    }

    logger.info(`[WalletV2] Transfer: sender=${senderId}, receiver=${resolvedRecipientId}, amount=${amount}, credited=${amountToCredit}, ${senderCurrency}->${receiverCurrency}`);
    await emitCoreFeatureEvent({
      featureKey: 'wallet.transfer',
      coreEngine: 'payment',
      ownerModule: 'wallet',
      criticality: 'critical',
      status: 'success',
      userId: senderId,
      payload: {
        amount,
        amount_received: amountToCredit,
        recipient_id,
        resolved_recipient_id: resolvedRecipientId,
        is_international: isInternational,
        sender_currency: senderCurrency,
        receiver_currency: receiverCurrency,
        rate_used: rateUsed,
      },
    });
    res.json({
      success: true,
      transaction_id: result.transactionId,
      operation: 'transfer',
      is_international: isInternational,
      amount_sent: amount,
      amount_received: amountToCredit,
      currency_sent: senderCurrency,
      currency_received: receiverCurrency,
      fee_amount: 0,
      fee_percentage: 0,
      rate_used: rateUsed,
      official_rate: officialRate,
      fx_margin: fxMargin,
      rate_source: rateSource,
      rate_source_type: rateSourceType,
      rate_source_url: rateSourceUrl,
    });
  } catch (error: any) {
    logger.error(`Wallet transfer error: ${error.message}`);
    await emitCoreFeatureEvent({
      featureKey: 'wallet.transfer',
      coreEngine: 'payment',
      ownerModule: 'wallet',
      criticality: 'critical',
      status: 'failure',
      userId: req.user?.id || null,
      payload: { error: error.message },
    });
    const message = String(error?.message || 'Erreur lors du transfert');
    const isFxError = /Aucun taux officiel africain recent|Taux de change introuvable/i.test(message);
    res.status(isFxError ? 503 : 500).json({
      success: false,
      error: isFxError ? message : 'Erreur lors du transfert',
    });
  }
});

/**
 * POST /api/v2/wallet/credit
 * Crédit admin/interne d'un wallet (service rôle uniquement).
 * Utilisé par les admins pour créditer manuellement un vendeur/affilié.
 *
 * Auth : verifyJWT + rôle admin/PDG/CEO
 * Body : { user_id, amount, description, reference?, transaction_type? }
 */
router.post(
  '/credit',
  verifyJWT,
  requirePermissionOrRole({
    permissionKey: 'manage_wallet_transactions',
    allowedRoles: ['admin', 'pdg', 'ceo'],
  }),
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actorId = req.user!.id;

    const { user_id, amount, description, reference, transaction_type = 'admin_credit' } = req.body || {};

    if (!user_id || !amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'user_id et amount (positif) requis' });
      return;
    }

    const ref = reference || `admin_${Date.now()}`;
    const result = await creditWallet(user_id, amount, description || 'Crédit administrateur', ref, transaction_type);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // Audit log
    await ignoreSupabaseError(supabaseAdmin.from('financial_audit_logs').insert({
      user_id: actorId,
      action_type: 'admin_credit',
      description: `Crédit admin: ${amount} GNF → user=${user_id}`,
      request_data: { user_id, amount, description, reference: ref },
    }));

    logger.info(`[WalletV2] Admin credit: actor=${actorId}, target=${user_id}, amount=${amount}`);
    res.json({ success: true, new_balance: result.newBalance, operation: 'admin_credit' });
  } catch (error: any) {
    logger.error(`Wallet credit error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors du crédit' });
  }
});

/**
 * GET /api/v2/wallet/admin/fx-health
 * Dashboard FX pour PDG/Admin (fraicheur + alertes + sources bancaires)
 */
router.get(
  '/admin/fx-health',
  verifyJWT,
  requirePermissionOrRole({
    permissionKey: 'manage_wallet_transactions',
    allowedRoles: ['admin', 'pdg', 'ceo'],
  }),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const now = Date.now();
      // Conakry uses UTC+0; use UTC start-of-day to avoid host machine/local timezone drift.
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const startOfDayIso = startOfDay.toISOString();

      const [latestAnyRate, latestUsdGnfRate, recentRuns, unresolvedAlerts, todayRates, marginConfig] = await Promise.all([
        readSupabaseData(supabaseAdmin
          .from('currency_exchange_rates')
          .select('from_currency, to_currency, rate, margin, final_rate_usd, final_rate_eur, source, source_type, source_url, retrieved_at')
          .eq('is_active', true)
          .order('retrieved_at', { ascending: false })
          .limit(1)
          .maybeSingle(), 'fx-health.latestAnyRate', null),
        readSupabaseData(supabaseAdmin
          .from('currency_exchange_rates')
          .select('from_currency, to_currency, rate, margin, final_rate_usd, final_rate_eur, source, source_type, source_url, retrieved_at')
          .eq('is_active', true)
          .eq('from_currency', 'USD')
          .eq('to_currency', 'GNF')
          .order('retrieved_at', { ascending: false })
          .limit(1)
          .maybeSingle(), 'fx-health.latestUsdGnfRate', null),
        readSupabaseData(supabaseAdmin
          .from('fx_collection_log')
          .select('currency_code, status, source, source_url, source_type, error_message, collected_at')
          .order('collected_at', { ascending: false })
          .limit(30), 'fx-health.recentRuns', [] as any[]),
        readSupabaseData(supabaseAdmin
          .from('financial_security_alerts')
          .select('id, alert_type, severity, title, description, created_at, metadata')
          .like('alert_type', 'fx_%')
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(20), 'fx-health.unresolvedAlerts', [] as any[]),
        readSupabaseData(supabaseAdmin
          .from('currency_exchange_rates')
          .select('from_currency, to_currency, rate, margin, final_rate_usd, final_rate_eur, source, source_type, source_url, retrieved_at')
          .eq('is_active', true)
          .gte('retrieved_at', startOfDayIso)
          .order('retrieved_at', { ascending: false })
          .limit(200), 'fx-health.todayRates', [] as any[]),
        readSupabaseData(supabaseAdmin
          .from('margin_config')
          .select('config_value')
          .eq('config_key', 'default_margin')
          .maybeSingle(), 'fx-health.marginConfig', null),
      ]);

      const liveBcrgRate = await fetchLiveBcrgUsdGnf();
      const fallbackRate: any = latestUsdGnfRate || latestAnyRate || null;
      const configuredMarginRaw = Number(marginConfig?.config_value ?? fallbackRate?.margin ?? 0.03);
      const currentMargin = Number.isFinite(configuredMarginRaw) ? configuredMarginRaw : 0.03;
      const currentRateBase = fallbackRate
        ? {
            ...fallbackRate,
            margin: currentMargin,
            configured_margin: currentMargin,
            final_rate_usd: Number.isFinite(Number(fallbackRate?.rate))
              ? Number(fallbackRate.rate) * (1 + currentMargin)
              : fallbackRate?.final_rate_usd ?? null,
            final_rate_eur:
              Number.isFinite(Number(fallbackRate?.final_rate_eur)) && Number.isFinite(Number(fallbackRate?.margin))
                ? (Number(fallbackRate.final_rate_eur) / (1 + Number(fallbackRate.margin))) * (1 + currentMargin)
                : fallbackRate?.final_rate_eur ?? null,
          }
        : null;
      const currentRate = liveBcrgRate
        ? {
            ...(currentRateBase || {}),
            from_currency: 'USD',
            to_currency: 'GNF',
            rate: liveBcrgRate.usdGnf,
            margin: currentMargin,
            configured_margin: currentMargin,
            final_rate_usd: liveBcrgRate.usdGnf * (1 + currentMargin),
            final_rate_eur: liveBcrgRate.eurGnf ? liveBcrgRate.eurGnf * (1 + currentMargin) : currentRateBase?.final_rate_eur ?? null,
            source: 'bcrg-live-widget',
            source_type: 'official_html',
            source_url: liveBcrgRate.sourceUrl || BCRG_OFFICIAL_URL,
            retrieved_at: liveBcrgRate.retrievedAt,
          }
        : currentRateBase;
      const lastRetrievedAt = currentRate?.retrieved_at ? new Date(currentRate.retrieved_at).getTime() : null;
      const ageMinutes = lastRetrievedAt ? Math.floor((now - lastRetrievedAt) / 60000) : null;
      const staleThresholdMinutes = 90;
      const stale = ageMinutes === null || ageMinutes > staleThresholdMinutes;

      const runRows = recentRuns || [];
      const recentGnfRuns = runRows
        .filter((row) => row.currency_code === 'GNF')
        .slice(0, 2);
      const twoConsecutiveFailures = recentGnfRuns.length >= 2 && recentGnfRuns.every((row) => !isFxSuccessStatus(row.status));
      const shouldTriggerRefresh = !liveBcrgRate && (stale || !currentRate || twoConsecutiveFailures);

      let refreshMeta = {
        attempted: false,
        reason: null as string | null,
        ok: false,
        status: null as number | null,
        timed_out: false,
        payload: null as any,
      };

      if (shouldTriggerRefresh) {
        const refreshReason = !currentRate
          ? 'missing_current_rate'
          : twoConsecutiveFailures
            ? 'two_consecutive_failures'
            : 'stale_rates';

        const refreshResult = await triggerAfricanFxCollection(`fx_health_${refreshReason}`, _req.user?.id || null, 4000);
        refreshMeta = {
          attempted: true,
          reason: refreshReason,
          ok: refreshResult.ok,
          status: refreshResult.status,
          timed_out: refreshResult.timedOut,
          payload: refreshResult.payload,
        };

        if (!refreshResult.ok && !refreshResult.timedOut) {
          logger.warn(`[walletV2] FX health auto-refresh not confirmed (status=${refreshResult.status ?? 'n/a'})`);
        }
      }

      const todaysHistory = (todayRates || [])
        .filter((rate: any) => isAfricanBankRow(rate))
        .map((rate: any) => ({
          from_currency: rate.from_currency,
          to_currency: rate.to_currency,
          rate: rate.rate,
          margin: rate.margin,
          final_rate_usd: rate.final_rate_usd,
          final_rate_eur: rate.final_rate_eur,
          source: rate.source,
          source_type: rate.source_type,
          source_url: resolveOfficialBankSourceUrl(rate),
          retrieved_at: rate.retrieved_at,
        }));

      const sourceMap = new Map<string, { source: string | null; source_type: string | null; source_url: string | null; last_seen_at: string | null }>();
      const upsertSource = (entry: { source?: string | null; source_type?: string | null; source_url?: string | null; last_seen_at?: string | null }) => {
        const key = entry.source_url || `${entry.source || 'source'}:${entry.source_type || 'type'}`;
        if (!key) return;
        const current = sourceMap.get(key);
        const next = {
          source: entry.source || null,
          source_type: entry.source_type || null,
          source_url: entry.source_url || null,
          last_seen_at: entry.last_seen_at || null,
        };
        if (!current) {
          sourceMap.set(key, next);
          return;
        }
        const currentTs = current.last_seen_at ? new Date(current.last_seen_at).getTime() : 0;
        const nextTs = next.last_seen_at ? new Date(next.last_seen_at).getTime() : 0;
        if (nextTs >= currentTs) {
          sourceMap.set(key, next);
        }
      };

      for (const row of runRows.filter((row) => isAfricanBankRow(row))) {
        upsertSource({
          source: row.source,
          source_type: row.source_type,
          source_url: resolveOfficialBankSourceUrl(row),
          last_seen_at: row.collected_at,
        });
      }

      for (const rate of todaysHistory) {
        upsertSource({
          source: null,
          source_type: rate.source_type,
          source_url: rate.source_url,
          last_seen_at: rate.retrieved_at,
        });
      }

      const hasBcrgSource = Array.from(sourceMap.values()).some((source) => String(source?.source_url || '').includes('bcrg-guinee.org'));
      if (!hasBcrgSource) {
        upsertSource({
          source: 'Banque Centrale de Guinee (BCRG)',
          source_type: 'official_html',
          source_url: BCRG_OFFICIAL_URL,
          last_seen_at: currentRate?.retrieved_at || null,
        });
      }

      const bankSources = Array.from(sourceMap.values()).sort((a, b) => {
        const aTs = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
        const bTs = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
        return bTs - aTs;
      });

      const gnfTodayHistory = todaysHistory.filter((rate: any) => rate.from_currency === 'GNF' || rate.to_currency === 'GNF');

      res.json({
        success: true,
        data: {
          timezone: 'Africa/Conakry',
          start_of_day_iso: startOfDayIso,
          stale_threshold_minutes: staleThresholdMinutes,
          is_stale: stale,
          age_minutes: ageMinutes,
          last_rate: currentRateBase || null,
          configured_margin: currentMargin,
          two_consecutive_failures: twoConsecutiveFailures,
          current_rate: currentRate || null,
          refresh: refreshMeta,
          recent_runs: runRows.slice(0, 10),
          today_history: todaysHistory,
          gnf_today_history: gnfTodayHistory,
          bank_sources: bankSources,
          active_alerts: unresolvedAlerts || [],
        },
      });
    } catch (error: any) {
      logger.error(`FX health error: ${error.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement du monitoring FX' });
    }
  }
);

/**
 * GET /api/v2/wallet/admin/fx-conversion-stats
 * Statistiques conversions/transferts: volume utilisateur, pays et corridors pays->pays
 */
router.get(
  '/admin/fx-conversion-stats',
  verifyJWT,
  requirePermissionOrRole({
    permissionKey: 'manage_wallet_transactions',
    allowedRoles: ['admin', 'pdg', 'ceo'],
  }),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const windowHours = 24;
      const sinceIso = new Date(Date.now() - windowHours * 3600000).toISOString();

      const [{ data: txRows }, { data: wallets }, { data: profiles }] = await Promise.all([
        supabaseAdmin
          .from('wallet_transactions')
          .select('id, sender_wallet_id, receiver_wallet_id, amount, transaction_type, created_at')
          .eq('status', 'completed')
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(5000),
        supabaseAdmin
          .from('wallets')
          .select('id, user_id, currency'),
        supabaseAdmin
          .from('profiles')
          .select('id, country, email, first_name, last_name'),
      ]);

      const walletMap = new Map((wallets || []).map((w: any) => [w.id, w]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const byUser = new Map<string, { user_id: string; user_label: string; country: string; conversions_count: number; total_amount: number }>();
      const byCountry = new Map<string, { country: string; conversions_count: number; total_amount: number }>();
      const countryCorridors = new Map<string, { from_country: string; to_country: string; conversions_count: number; total_amount: number }>();

      let totalConversions = 0;
      let internationalConversions = 0;

      for (const tx of txRows || []) {
        if (tx.transaction_type !== 'transfer') continue;

        const senderWallet = walletMap.get(tx.sender_wallet_id);
        const receiverWallet = walletMap.get(tx.receiver_wallet_id);
        if (!senderWallet || !receiverWallet) continue;

        const senderProfile = profileMap.get(senderWallet.user_id);
        const receiverProfile = profileMap.get(receiverWallet.user_id);

        const senderCountry = String(senderProfile?.country || mapCurrencyToCountry(senderWallet.currency || null));
        const receiverCountry = String(receiverProfile?.country || mapCurrencyToCountry(receiverWallet.currency || null));
        const amount = Number(tx.amount || 0);

        totalConversions += 1;
        if (senderCountry !== receiverCountry) internationalConversions += 1;

        const senderName = `${String(senderProfile?.first_name || '').trim()} ${String(senderProfile?.last_name || '').trim()}`.trim();
        const senderLabel = senderName || String(senderProfile?.email || senderWallet.user_id);

        const currentUser = byUser.get(senderWallet.user_id) || {
          user_id: senderWallet.user_id,
          user_label: senderLabel,
          country: senderCountry,
          conversions_count: 0,
          total_amount: 0,
        };
        currentUser.conversions_count += 1;
        currentUser.total_amount += amount;
        byUser.set(senderWallet.user_id, currentUser);

        const senderCountryStats = byCountry.get(senderCountry) || {
          country: senderCountry,
          conversions_count: 0,
          total_amount: 0,
        };
        senderCountryStats.conversions_count += 1;
        senderCountryStats.total_amount += amount;
        byCountry.set(senderCountry, senderCountryStats);

        const corridorKey = `${senderCountry}=>${receiverCountry}`;
        const corridorStats = countryCorridors.get(corridorKey) || {
          from_country: senderCountry,
          to_country: receiverCountry,
          conversions_count: 0,
          total_amount: 0,
        };
        corridorStats.conversions_count += 1;
        corridorStats.total_amount += amount;
        countryCorridors.set(corridorKey, corridorStats);
      }

      res.json({
        success: true,
        data: {
          window_hours: windowHours,
          total_conversions: totalConversions,
          international_conversions: internationalConversions,
          by_user: Array.from(byUser.values()).sort((a, b) => b.conversions_count - a.conversions_count).slice(0, 50),
          by_country: Array.from(byCountry.values()).sort((a, b) => b.conversions_count - a.conversions_count),
          country_corridors: Array.from(countryCorridors.values()).sort((a, b) => b.conversions_count - a.conversions_count).slice(0, 100),
        },
      });
    } catch (error: any) {
      logger.error(`FX conversion stats error: ${error.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement des stats de conversion' });
    }
  }
);

/**
 * POST /api/v2/wallet/admin/fx-rate-alert-check
 * Bouton alerte: crée une alerte si un changement de taux est détecté en moins d'1h.
 */
router.post(
  '/admin/fx-rate-alert-check',
  verifyJWT,
  requirePermissionOrRole({
    permissionKey: 'manage_wallet_transactions',
    allowedRoles: ['admin', 'pdg', 'ceo'],
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { data: rateRows } = await supabaseAdmin
        .from('currency_exchange_rates')
        .select('from_currency, to_currency, rate, source_url, retrieved_at')
        .eq('is_active', true)
        .order('retrieved_at', { ascending: false })
        .limit(100);

      const validRates = (rateRows || []).filter((r: any) => isAfricanBankSourceUrl(r?.source_url));
      if (validRates.length < 2) {
        res.json({ success: true, data: { alert_created: false, reason: 'not_enough_data' } });
        return;
      }

      const latest = validRates[0] as any;
      const previous = validRates.find((r: any) => r.from_currency === latest.from_currency && r.to_currency === latest.to_currency && r.retrieved_at !== latest.retrieved_at) as any;
      if (!previous) {
        res.json({ success: true, data: { alert_created: false, reason: 'no_previous_same_pair' } });
        return;
      }

      const latestTs = latest.retrieved_at ? new Date(latest.retrieved_at).getTime() : 0;
      const previousTs = previous.retrieved_at ? new Date(previous.retrieved_at).getTime() : 0;
      const minutesBetween = Math.abs(latestTs - previousTs) / 60000;

      const latestRate = Number(latest.rate || 0);
      const previousRate = Number(previous.rate || 0);
      const changed = latestRate > 0 && previousRate > 0 && latestRate !== previousRate;
      const changedUnderOneHour = changed && minutesBetween <= 60;

      let alertCreated = false;
      if (changedUnderOneHour) {
        const thresholdIso = new Date(Date.now() - 60 * 60000).toISOString();
        const { data: existing } = await supabaseAdmin
          .from('financial_security_alerts')
          .select('id')
          .eq('alert_type', 'fx_rate_change_under_1h')
          .eq('is_resolved', false)
          .gte('created_at', thresholdIso)
          .limit(1)
          .maybeSingle();

        if (!existing) {
          await ignoreSupabaseError(supabaseAdmin.from('financial_security_alerts').insert({
            user_id: SYSTEM_USER_ID,
            alert_type: 'fx_rate_change_under_1h',
            severity: 'high',
            title: 'Changement de taux detecte en moins d\'1 heure',
            description: `${latest.from_currency}/${latest.to_currency} a change de ${previousRate} a ${latestRate} en ${Math.round(minutesBetween)} minutes.`,
            metadata: {
              actor_id: req.user!.id,
              latest,
              previous,
              minutes_between: Math.round(minutesBetween),
            },
          }));
          alertCreated = true;
        }
      }

      res.json({
        success: true,
        data: {
          alert_created: alertCreated,
          changed_under_one_hour: changedUnderOneHour,
          minutes_between: Math.round(minutesBetween),
          latest,
          previous,
        },
      });
    } catch (error: any) {
      logger.error(`FX rate alert check error: ${error.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors de la verification d\'alerte FX' });
    }
  }
);

/**
 * POST /api/v2/wallet/admin/fx-refresh
 * Déclenche manuellement une collecte des taux (PDG/Admin)
 */
router.post(
  '/admin/fx-margin',
  verifyJWT,
  requirePermissionOrRole({
    permissionKey: 'manage_wallet_transactions',
    allowedRoles: ['admin', 'pdg', 'ceo'],
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const marginPercentRaw = Number(req.body?.margin_percent);
      if (!Number.isFinite(marginPercentRaw) || marginPercentRaw < 0 || marginPercentRaw > 30) {
        res.status(400).json({ success: false, error: 'margin_percent invalide (attendu: 0 a 30)' });
        return;
      }

      const marginValue = marginPercentRaw / 100;
      const { error: upsertError } = await supabaseAdmin
        .from('margin_config')
        .upsert({
          config_key: 'default_margin',
          config_value: marginValue,
        }, { onConflict: 'config_key' });

      if (upsertError) {
        throw upsertError;
      }

      const refreshResult = await triggerAfricanFxCollection('pdg_margin_update', req.user!.id);

      if (!refreshResult.ok && !refreshResult.timedOut) {
        logger.warn(`FX margin update: refresh non confirmé (status=${refreshResult.status ?? 'n/a'})`);
      }

      res.json({
        success: true,
        data: {
          margin_percent: marginPercentRaw,
          margin_value: marginValue,
          refresh_triggered: refreshResult.ok,
          refresh_status: refreshResult.status,
          refresh_payload: refreshResult.payload,
          refresh_timed_out: refreshResult.timedOut,
        },
      });
    } catch (error: any) {
      logger.error(`FX margin update error: ${error.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors de la mise a jour de la commission FX' });
    }
  }
);

router.post(
  '/admin/fx-refresh',
  verifyJWT,
  requirePermissionOrRole({
    permissionKey: 'manage_wallet_transactions',
    allowedRoles: ['admin', 'pdg', 'ceo'],
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const refreshResult = await triggerAfricanFxCollection('pdg_manual_refresh', req.user!.id, 4000);

      if (!refreshResult.ok && !refreshResult.timedOut) {
        await ignoreSupabaseError(supabaseAdmin.from('financial_security_alerts').insert({
          user_id: SYSTEM_USER_ID,
          alert_type: 'fx_manual_refresh_failed',
          severity: 'high',
          title: 'Échec du refresh FX manuel',
          description: 'Le déclenchement manuel de la collecte FX a échoué.',
          metadata: {
            actor_id: req.user!.id,
            status: refreshResult.status,
            error: refreshResult.payload?.error || refreshResult.payload?.message || 'unknown',
          },
        }));

        res.status(refreshResult.status || 502).json({
          success: false,
          error: refreshResult.payload?.error || refreshResult.payload?.message || 'Le refresh FX manuel a échoué',
        });
        return;
      }

      res.json({
        success: true,
        data: refreshResult.payload || { queued: true },
        meta: {
          refresh_status: refreshResult.status,
          refresh_timed_out: refreshResult.timedOut,
        },
      });
    } catch (error: any) {
      logger.error(`FX manual refresh error: ${error.message}`);
      res.status(500).json({ success: false, error: 'Erreur lors du refresh FX manuel' });
    }
  }
);

export default router;
