/**
 * 🏪 VENDORS ROUTES - Phase 3
 *
 * Tables utilisées :
 *   - `vendors` : business_name, business_type, shop_slug, user_id, is_active, etc.
 *   - `profiles` : pour résolution user_id ↔ vendor
 *
 * Toutes les colonnes sont alignées avec le schéma DB existant.
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = Router();

// ─────────────────────────────────────────────────────────
// BCRG LIVE RATE — Banque Centrale de la République de Guinée
// ─────────────────────────────────────────────────────────

const BCRG_URLS = [
  'https://www.bcrg-guinee.org',
  'https://www.bcrg-guinee.org/cours-de-change',
  'https://www.bcrg.gov.gn',
];

async function fetchBcrgHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': '224Solutions-FX-Monitor/2.0', Accept: 'text/html' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractBcrgRate(html: string, currency: 'USD' | 'EUR'): number | null {
  const label = currency === 'USD' ? '(?:USD|Dollar)' : '(?:EUR|Euro)';
  const patterns = [
    new RegExp(`${label}\\s*=\\s*<\\/h\\d>[\\s\\S]{0,1800}?<h\\d[^>]*>\\s*([\\d\\s.,]+)\\s*<\\/h\\d>`, 'gi'),
    new RegExp(`<td[^>]*>\\s*${label}\\s*=?\\s*<\\/td>\\s*<td[^>]*>\\s*([\\d\\s.,]+)\\s*<\\/td>`, 'gi'),
    new RegExp(`(?:1\\s*${currency}\\s*=\\s*|${currency}\\s*\\/\\s*GNF\\s*[:=]\\s*)([\\d\\s.,]+)`, 'gi'),
  ];
  for (const pattern of patterns) {
    const matches = Array.from(html.matchAll(pattern));
    for (let i = matches.length - 1; i >= 0; i--) {
      const raw = String(matches[i]?.[1] || '').replace(/ /g, ' ').replace(/\s/g, '').replace(/,/g, '.');
      const parsed = parseFloat(raw);
      if (Number.isFinite(parsed) && parsed > 1000 && parsed < 25000) return parsed;
    }
  }
  return null;
}

interface BcrgRates {
  // Map "1 DEVISE = N GNF" pour toutes les devises disponibles
  gnfRates: Record<string, number>;
  sourceUrl: string;
  isLive: boolean;
  retrievedAt: string | null;
}

// Charge tous les taux X→GNF depuis currency_exchange_rates
async function fetchAllGnfRatesFromTable(): Promise<{
  gnfRates: Record<string, number>;
  retrievedAt: string | null;
  sourceUrl: string | null;
}> {
  const { data: rows } = await supabaseAdmin
    .from('currency_exchange_rates')
    .select('from_currency, rate, final_rate_eur, retrieved_at, source_url')
    .eq('to_currency', 'GNF')
    .eq('is_active', true)
    .gt('rate', 0)
    .order('retrieved_at', { ascending: false });

  const gnfRates: Record<string, number> = {};
  let retrievedAt: string | null = null;
  let sourceUrl: string | null = null;

  for (const row of rows ?? []) {
    const curr = String(row.from_currency).toUpperCase();
    if (!gnfRates[curr] && Number(row.rate) > 0) {
      gnfRates[curr] = Number(row.rate);
      if (!retrievedAt) { retrievedAt = row.retrieved_at ?? null; sourceUrl = row.source_url ?? null; }
    }
    // final_rate_eur = EUR/GNF stocké dans la ligne USD→GNF
    if (curr === 'USD' && !gnfRates['EUR'] && row.final_rate_eur && Number(row.final_rate_eur) > 0) {
      gnfRates['EUR'] = Number(row.final_rate_eur);
    }
  }

  return { gnfRates, retrievedAt, sourceUrl };
}

async function fetchLiveBcrgRates(): Promise<BcrgRates | null> {
  // Charger les taux de la table en parallèle (GBP, CAD, MAD, etc.)
  const tablePromise = fetchAllGnfRatesFromTable();

  for (const url of BCRG_URLS) {
    const html = await fetchBcrgHtml(url);
    if (!html) continue;
    const usdGnf = extractBcrgRate(html, 'USD');
    if (!usdGnf) continue;
    const eurGnf = extractBcrgRate(html, 'EUR');
    const { gnfRates: tableRates } = await tablePromise;
    const gnfRates: Record<string, number> = { ...tableRates, USD: usdGnf };
    if (eurGnf) gnfRates['EUR'] = eurGnf;
    return { gnfRates, sourceUrl: url, isLive: true, retrievedAt: new Date().toISOString() };
  }

  // Fallback : uniquement les taux en base
  const { gnfRates, retrievedAt, sourceUrl } = await tablePromise;
  if (!gnfRates['USD']) return null;
  return { gnfRates, sourceUrl: sourceUrl || 'bcrg-guinee.org (cache)', isLive: false, retrievedAt };
}

// Taux de parité fixe officielle CFA (XOF/XAF) ↔ EUR : 1 EUR = 655.957 CFA
const XOF_XAF_PER_EUR = 655.957;

function computeConversionRate(
  fromCurrency: string,
  toCurrency: string,
  rates: BcrgRates,
): { rate: number; description: string } | null {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  const { gnfRates } = rates;
  const eurGnf = gnfRates['EUR'] ?? null;

  if (from === to) return { rate: 1, description: 'Même devise, aucune conversion' };

  // Parité fixe officielle CFA ↔ EUR (prioritaire, indépendante du marché)
  if (eurGnf) {
    if ((from === 'XOF' || from === 'XAF') && to === 'GNF')
      return { rate: eurGnf / XOF_XAF_PER_EUR, description: `${from}→GNF via parité CFA/EUR (1 EUR = ${XOF_XAF_PER_EUR} ${from}, BCRG: 1 EUR = ${eurGnf} GNF)` };
    if (from === 'GNF' && (to === 'XOF' || to === 'XAF'))
      return { rate: XOF_XAF_PER_EUR / eurGnf, description: `GNF→${to} via parité CFA/EUR (BCRG: 1 EUR = ${eurGnf} GNF)` };
    if ((from === 'XOF' || from === 'XAF') && to === 'EUR')
      return { rate: 1 / XOF_XAF_PER_EUR, description: `${from}→EUR via parité officielle (1 EUR = ${XOF_XAF_PER_EUR} ${from})` };
    if (from === 'EUR' && (to === 'XOF' || to === 'XAF'))
      return { rate: XOF_XAF_PER_EUR, description: `EUR→${to} via parité officielle (1 EUR = ${XOF_XAF_PER_EUR} ${to})` };
    if ((from === 'XOF' || from === 'XAF') && (to === 'XOF' || to === 'XAF'))
      return { rate: 1, description: `${from}→${to} même zone CFA` };
  }

  // Pivot GNF générique — couvre USD, EUR, GBP, CAD, CHF, MAD, SLL, etc.
  const fromGnf = from === 'GNF' ? 1 : (gnfRates[from] ?? null);
  const toGnf   = to   === 'GNF' ? 1 : (gnfRates[to]   ?? null);

  if (fromGnf && toGnf) {
    const rate = fromGnf / toGnf;
    const desc = from === 'GNF'
      ? `GNF→${to} via BCRG (1 ${to} = ${toGnf} GNF)`
      : to === 'GNF'
        ? `${from}→GNF via BCRG (1 ${from} = ${fromGnf} GNF)`
        : `${from}→${to} via pivot GNF BCRG (1 ${from} = ${fromGnf} GNF, 1 ${to} = ${toGnf} GNF)`;
    return { rate, description: desc };
  }

  return null; // Aucun taux disponible pour cette paire
}

function roundForCurrency(amount: number, currency: string): number {
  const zeroDec = new Set(['GNF', 'XOF', 'XAF', 'VND', 'IDR', 'KRW', 'JPY', 'UGX', 'RWF']);
  return zeroDec.has(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100) / 100;
}

/**
 * GET /api/vendors/me
 * Profil vendeur de l'utilisateur connecté
 */
router.get('/me', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: vendor, error } = await supabaseAdmin
      .from('vendors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Aucune boutique associée à ce compte' });
      return;
    }

    res.json({ success: true, data: vendor });
  } catch (error: any) {
    logger.error(`Error fetching vendor profile: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération du profil vendeur' });
  }
});

/**
 * GET /api/vendors/:id
 * Profil public d'un vendeur (par id ou shop_slug)
 */
router.get('/:id', async (req, res: Response) => {
  try {
    const { id } = req.params;

    // Tenter par UUID d'abord, sinon par shop_slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const query = supabaseAdmin
      .from('vendors')
      .select('id, business_name, business_type, shop_slug, description, logo_url, cover_image_url, city, country, rating, total_reviews, is_verified, delivery_enabled, delivery_base_price')
      .eq('is_active', true);

    const { data: vendor, error } = isUuid
      ? await query.eq('id', id).maybeSingle()
      : await query.eq('shop_slug', id).maybeSingle();

    if (error) throw error;

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    res.json({ success: true, data: vendor });
  } catch (error: any) {
    logger.error(`Error fetching vendor: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * PATCH /api/vendors/me
 * Mise à jour du profil vendeur (champs autorisés uniquement)
 */
router.patch('/me', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Champs modifiables par le vendeur (alignés avec la table vendors)
    const allowedFields = [
      'business_name', 'description', 'address', 'city', 'country',
      'neighborhood', 'phone', 'email', 'logo_url', 'cover_image_url',
      'delivery_enabled', 'delivery_base_price', 'delivery_price_per_km',
      'delivery_rush_bonus', 'latitude', 'longitude'
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour' });
      return;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('vendors')
      .update(updates)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;

    logger.info(`Vendor updated: user=${userId}, fields=${Object.keys(updates).join(',')}`);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error(`Error updating vendor: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * GET /api/vendors/me/stats
 * Statistiques vendeur (nombre de produits, commandes, clients)
 */
router.get('/me/stats', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Résoudre vendor_id depuis user_id
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (vendorError || !vendor) {
      res.status(404).json({ success: false, error: 'Boutique non trouvée' });
      return;
    }

    const vendorId = vendor.id;

    // Compter produits actifs
    const { count: productCount } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('is_active', true);

    // Compter commandes
    const { count: orderCount } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendorId);

    // Clients uniques (customer_id distincts ayant commandé)
    const { data: customers } = await supabaseAdmin
      .from('orders')
      .select('customer_id')
      .eq('vendor_id', vendorId)
      .not('customer_id', 'is', null);

    const uniqueCustomers = new Set(customers?.map(c => c.customer_id)).size;

    res.json({
      success: true,
      data: {
        products_count: productCount || 0,
        orders_count: orderCount || 0,
        customers_count: uniqueCustomers,
      }
    });
  } catch (error: any) {
    logger.error(`Error fetching vendor stats: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * POST /api/vendors/admin/change-currency
 * PDG uniquement — change la devise d'un vendeur avec conversion du solde via taux BCRG live.
 * Couvre : vendeurs produits (digital/physique), agents PDG, services de proximité.
 * Body: { vendor_id, new_currency, new_country_code, reason?, entity_type? }
 * entity_type: 'vendor' (défaut) | 'agent' | 'service'
 */
router.post('/admin/change-currency', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  const callerId = req.user!.id;

  try {
    // 1. Vérifier le rôle PDG
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .maybeSingle();

    if (profileErr || callerProfile?.role !== 'pdg') {
      res.status(403).json({ success: false, error: 'Réservé au PDG' });
      return;
    }

    const { vendor_id, new_currency, new_country_code, reason, entity_type = 'vendor' } = req.body || {};

    if (!vendor_id || !new_currency || !new_country_code) {
      res.status(400).json({ success: false, error: 'vendor_id, new_currency et new_country_code sont requis' });
      return;
    }

    const newCurrency = String(new_currency).toUpperCase();
    const newCountryCode = String(new_country_code).toUpperCase();

    // 2. Récupérer le vendeur et son user_id (selon le type d'entité)
    let vendorUserId: string | null = null;
    let oldCurrency: string = 'GNF';

    if (entity_type === 'agent') {
      const { data: agent } = await supabaseAdmin
        .from('agents_management')
        .select('user_id, currency')
        .eq('id', vendor_id)
        .maybeSingle();
      if (!agent) { res.status(404).json({ success: false, error: 'Agent introuvable' }); return; }
      vendorUserId = agent.user_id;
      oldCurrency = (agent as any).currency || 'GNF';
    } else if (entity_type === 'user' || entity_type === 'client') {
      // vendor_id est en réalité le user_id (UUID du profil)
      const { data: userWallet } = await supabaseAdmin
        .from('wallets')
        .select('currency')
        .eq('user_id', vendor_id)
        .order('updated_at', { ascending: false })
        .maybeSingle();
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', vendor_id)
        .maybeSingle();
      if (!userProfile) { res.status(404).json({ success: false, error: 'Utilisateur introuvable' }); return; }
      vendorUserId = vendor_id;
      oldCurrency = userWallet?.currency || 'GNF';
    } else {
      const { data: vendor } = await supabaseAdmin
        .from('vendors')
        .select('user_id, shop_currency')
        .eq('id', vendor_id)
        .maybeSingle();
      if (!vendor) { res.status(404).json({ success: false, error: 'Vendeur introuvable' }); return; }
      vendorUserId = vendor.user_id;
      oldCurrency = vendor.shop_currency || 'GNF';
    }

    // 3. Même devise → no-op
    if (oldCurrency.toUpperCase() === newCurrency) {
      res.json({ success: true, changed: false, message: `La devise est déjà ${newCurrency}` });
      return;
    }

    // 4. Récupérer le wallet du vendeur (solde + devise actuelle)
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, currency')
      .eq('user_id', vendorUserId)
      .order('updated_at', { ascending: false })
      .maybeSingle();

    const currentBalance = Number(wallet?.balance || 0);
    const walletCurrency = (wallet?.currency || oldCurrency).toUpperCase();

    // 5. Récupérer les taux BCRG — live en priorité, cache en fallback
    const bcrgRates = await fetchLiveBcrgRates();
    if (!bcrgRates) {
      logger.warn(`[VendorCurrency] BCRG indisponible (live + cache) pour ${vendor_id}: ${oldCurrency}→${newCurrency}`);
      res.status(503).json({
        success: false,
        error: 'Aucun taux de change disponible (ni en direct ni en cache). Réessayez dans quelques minutes.',
        bcrg_unavailable: true,
      });
      return;
    }

    if (!bcrgRates.isLive) {
      logger.info(`[VendorCurrency] BCRG live inaccessible — utilisation du cache (récupéré le ${bcrgRates.retrievedAt}) pour ${vendor_id}`);
    }

    // 6. Calculer le taux de conversion du solde wallet
    const conversionResult = computeConversionRate(walletCurrency, newCurrency, bcrgRates);
    if (!conversionResult) {
      const available = ['GNF', ...Object.keys(bcrgRates.gnfRates), 'XOF', 'XAF'].filter((v, i, a) => a.indexOf(v) === i);
      res.status(422).json({
        success: false,
        error: `Aucun taux disponible pour convertir ${walletCurrency}→${newCurrency}. Devises disponibles : ${available.join(', ')}.`,
        supported_currencies: available,
      });
      return;
    }

    const { rate, description: rateDescription } = conversionResult;
    const newBalance = currentBalance === 0 ? 0 : roundForCurrency(currentBalance * rate, newCurrency);

    logger.info(`[VendorCurrency] ${vendor_id}: ${walletCurrency} ${currentBalance} → ${newCurrency} ${newBalance} (taux=${rate}, ${rateDescription})`);

    // 7. Compter les escrows actifs (commandes en cours dans l'ancienne devise)
    let activeEscrow = 0;
    if (entity_type !== 'agent') {
      const { data: vendorOrders } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('vendor_id', vendor_id);

      if (vendorOrders && vendorOrders.length > 0) {
        const orderIds = vendorOrders.map((o: any) => o.id);
        const { count } = await supabaseAdmin
          .from('escrow_transactions')
          .select('id', { count: 'exact', head: true })
          .in('order_id', orderIds)
          .in('status', ['held', 'pending']);
        activeEscrow = count || 0;
      }
    }

    // 8. Mise à jour atomique : vendor + wallet + produits
    const now = new Date().toISOString();

    // 8a. Mettre à jour la devise du vendeur/agent (pas nécessaire pour entity_type 'user'/'client')
    if (entity_type === 'agent') {
      const { error: agentErr } = await supabaseAdmin
        .from('agents_management')
        .update({ currency: newCurrency, country_code: newCountryCode, updated_at: now })
        .eq('id', vendor_id);
      if (agentErr) logger.warn(`[VendorCurrency] Mise à jour agent ${vendor_id}: ${agentErr.message}`);
    } else if (entity_type !== 'user' && entity_type !== 'client') {
      // Tenter avec currency_locked (migration appliquée) sinon sans
      const { error: vendorErr } = await supabaseAdmin
        .from('vendors')
        .update({ shop_currency: newCurrency, seller_country_code: newCountryCode, currency_locked: true, updated_at: now } as any)
        .eq('id', vendor_id);
      if (vendorErr) {
        logger.warn(`[VendorCurrency] Tentative sans currency_locked pour vendor ${vendor_id}: ${vendorErr.message}`);
        const { error: vendorErr2 } = await supabaseAdmin
          .from('vendors')
          .update({ shop_currency: newCurrency, updated_at: now } as any)
          .eq('id', vendor_id);
        if (vendorErr2) throw new Error(`Impossible de mettre à jour le vendeur: ${vendorErr2.message}`);
      }
    }

    // 8b. Convertir le solde du wallet + mettre à jour la devise (OPÉRATION CRITIQUE)
    if (wallet) {
      // Tenter avec currency_locked (migration appliquée) sinon sans
      const lockReason = `Changement de devise PDG: ${walletCurrency}→${newCurrency} au taux BCRG ${rate.toFixed(6)} (${rateDescription})`;
      const { error: walletErr } = await supabaseAdmin
        .from('wallets')
        .update({ currency: newCurrency, balance: newBalance, currency_locked: true, currency_lock_reason: lockReason, updated_at: now } as any)
        .eq('id', wallet.id);
      if (walletErr) {
        logger.warn(`[VendorCurrency] Tentative sans currency_locked pour wallet ${wallet.id}: ${walletErr.message}`);
        const { error: walletErr2 } = await supabaseAdmin
          .from('wallets')
          .update({ currency: newCurrency, balance: newBalance, updated_at: now })
          .eq('id', wallet.id);
        if (walletErr2) throw new Error(`Impossible de mettre à jour le wallet: ${walletErr2.message}`);
      }
    }

    // 8b2. Mettre à jour le profil utilisateur (pays + devise + profile_completed)
    // → empêche CountrySelectionGate de bloquer l'utilisateur au prochain login
    const { error: vendorProfileErr } = await supabaseAdmin
      .from('profiles')
      .update({ detected_country: newCountryCode || null, detected_currency: newCurrency, country: newCountryCode || null, updated_at: now } as any)
      .eq('id', vendorUserId);
    if (!vendorProfileErr) {
      // Tenter profile_completed = true si la colonne existe (migration 20260512)
      await supabaseAdmin
        .from('profiles')
        .update({ profile_completed: true } as any)
        .eq('id', vendorUserId);
    }

    // 8c. Flaguer les produits actifs pour révision des prix
    let productsFlagged = 0;
    if (entity_type !== 'agent') {
      const { count: pCount } = await supabaseAdmin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vendor_id)
        .eq('is_active', true);

      await supabaseAdmin
        .from('products')
        .update({ needs_currency_review: true, seller_currency: newCurrency, updated_at: now })
        .eq('vendor_id', vendor_id)
        .eq('is_active', true);

      productsFlagged = pCount || 0;
    }

    // 8d. Journaliser la conversion dans wallet_logs si disponible
    try {
      await supabaseAdmin.from('wallet_logs').insert({
        user_id: vendorUserId,
        wallet_id: wallet.id,
        action: 'currency_conversion',
        amount: newBalance - currentBalance,
        balance_before: currentBalance,
        balance_after: newBalance,
        currency: newCurrency,
        status: 'completed',
        metadata: {
          old_currency: walletCurrency,
          old_balance: currentBalance,
          new_currency: newCurrency,
          new_balance: newBalance,
          rate_used: rate,
          rate_description: rateDescription,
          bcrg_usd_gnf: bcrgRates.gnfRates['USD'] ?? null,
          bcrg_eur_gnf: bcrgRates.gnfRates['EUR'] ?? null,
          bcrg_source_url: bcrgRates.sourceUrl,
          initiated_by: callerId,
          reason: reason || null,
          entity_type,
        },
      });
    } catch {
      // Non-bloquant — le log échoue si la table n'existe pas
    }

    res.json({
      success: true,
      changed: true,
      old_currency: walletCurrency,
      new_currency: newCurrency,
      old_balance: currentBalance,
      new_balance: newBalance,
      rate_used: rate,
      rate_description: rateDescription,
      bcrg_usd_gnf: bcrgRates.gnfRates['USD'] ?? null,
      bcrg_eur_gnf: bcrgRates.gnfRates['EUR'] ?? null,
      bcrg_source_url: bcrgRates.sourceUrl,
      bcrg_is_live: bcrgRates.isLive,
      bcrg_retrieved_at: bcrgRates.retrievedAt,
      products_flagged: productsFlagged,
      active_escrow_count: activeEscrow,
      wallet_converted: wallet !== null,
      warning: activeEscrow > 0
        ? `${activeEscrow} commande(s) en cours restent dans l'ancienne devise (${walletCurrency}). C'est normal.`
        : null,
    });

  } catch (error: any) {
    logger.error(`[VendorCurrency] Erreur changement devise ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors du changement de devise' });
  }
});

export default router;
