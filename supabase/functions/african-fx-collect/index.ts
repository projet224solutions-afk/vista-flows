import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * 🌍 African FX Rate Collector — Sources officielles
 *
 * Collecte les taux de change depuis les banques centrales africaines,
 * applique la marge configurable (défaut 3%), et stocke dans
 * `currency_exchange_rates` + `fx_collection_log`.
 *
 * === SOURCES PAR PRIORITÉ ===
 *
 * TIER 1 — Parités fixes officielles (aucun scraping nécessaire) :
 *   • XOF (UEMOA) : fixé à 1 EUR = 655.957 XOF (accord monétaire BCEAO)
 *   • XAF (CEMAC) : fixé à 1 EUR = 655.957 XAF (accord monétaire BEAC)
 *   • KMF (Comores) : fixé à 1 EUR = 491.96775 KMF
 *   • CVE (Cap-Vert) : fixé à 1 EUR = 110.265 CVE
 *   • STN (São Tomé) : fixé à 1 EUR = 24.5 STN (approx.)
 *   • DJF (Djibouti) : fixé à 1 USD = 177.721 DJF (currency board)
 *   • ERN (Érythrée) : fixé à 1 USD = 15.0 ERN (taux officiel)
 *
 * TIER 2 — Scraping banques centrales (HTML parsing) :
 *   • BCEAO (bceao.int) : taux croisés USD, GBP, CHF, CAD, JPY, CNY pour XOF
 *
 * TIER 3 — API de référence (fallback documenté et tracé) :
 *   • open.er-api.com pour les devises sans source officielle scrapable
 *   • Chaque entrée est marquée source="fallback-api" pour traçabilité
 *
 * Appelé par pg_cron toutes les heures + quotidiennement à minuit Africa/Conakry.
 */

// ═══════════════════════════════════════════════════════════
// CONFIGURATION DES DEVISES AFRICAINES
// ═══════════════════════════════════════════════════════════

interface CurrencyConfig {
  country: string;
  zone?: string;
  tier: 1 | 2 | 3;
  /** Pour tier 1 : taux fixe officiel */
  fixedRate?: { base: "EUR" | "USD"; rate: number };
}

const AFRICAN_CURRENCIES: Record<string, CurrencyConfig> = {
  // ── TIER 1 : Parités fixes officielles ──
  XOF: { country: "UEMOA", zone: "BCEAO", tier: 1, fixedRate: { base: "EUR", rate: 655.957 } },
  XAF: { country: "CEMAC", zone: "BEAC", tier: 1, fixedRate: { base: "EUR", rate: 655.957 } },
  KMF: { country: "Comores", tier: 1, fixedRate: { base: "EUR", rate: 491.96775 } },
  CVE: { country: "Cap-Vert", tier: 1, fixedRate: { base: "EUR", rate: 110.265 } },
  STN: { country: "São Tomé-et-Príncipe", tier: 1, fixedRate: { base: "EUR", rate: 24.5 } },
  DJF: { country: "Djibouti", tier: 1, fixedRate: { base: "USD", rate: 177.721 } },
  ERN: { country: "Érythrée", tier: 1, fixedRate: { base: "USD", rate: 15.0 } },

  // ── TIER 3 : API de référence (banques centrales non scrapables) ──
  GNF: { country: "Guinée", tier: 3 },
  NGN: { country: "Nigeria", tier: 3 },
  ZAR: { country: "Afrique du Sud", tier: 3 },
  EGP: { country: "Égypte", tier: 3 },
  MAD: { country: "Maroc", tier: 3 },
  TND: { country: "Tunisie", tier: 3 },
  DZD: { country: "Algérie", tier: 3 },
  KES: { country: "Kenya", tier: 3 },
  GHS: { country: "Ghana", tier: 3 },
  TZS: { country: "Tanzanie", tier: 3 },
  UGX: { country: "Ouganda", tier: 3 },
  ETB: { country: "Éthiopie", tier: 3 },
  MZN: { country: "Mozambique", tier: 3 },
  AOA: { country: "Angola", tier: 3 },
  CDF: { country: "RD Congo", tier: 3 },
  RWF: { country: "Rwanda", tier: 3 },
  BIF: { country: "Burundi", tier: 3 },
  MGA: { country: "Madagascar", tier: 3 },
  MUR: { country: "Maurice", tier: 3 },
  SCR: { country: "Seychelles", tier: 3 },
  GMD: { country: "Gambie", tier: 3 },
  SLL: { country: "Sierra Leone", tier: 3 },
  LRD: { country: "Liberia", tier: 3 },
  BWP: { country: "Botswana", tier: 3 },
  NAD: { country: "Namibie", tier: 3 },
  SZL: { country: "Eswatini", tier: 3 },
  LSL: { country: "Lesotho", tier: 3 },
  MWK: { country: "Malawi", tier: 3 },
  ZMW: { country: "Zambie", tier: 3 },
  SDG: { country: "Soudan", tier: 3 },
  SSP: { country: "Soudan du Sud", tier: 3 },
  SOS: { country: "Somalie", tier: 3 },
  LYD: { country: "Libye", tier: 3 },
  MRU: { country: "Mauritanie", tier: 3 },
  ZWL: { country: "Zimbabwe", tier: 3 },
};

const VARIATION_THRESHOLD = 0.001; // 0.1 %

// ═══════════════════════════════════════════════════════════
// TIER 2 — SCRAPING BCEAO
// ═══════════════════════════════════════════════════════════

interface BceaoRates {
  /** Taux USD → XOF (achat moyen) */
  usdXof: number;
}

/**
 * Scrape la page publique de la BCEAO pour obtenir le taux USD/XOF du jour.
 * URL : https://www.bceao.int/fr/cours/cours-des-devises
 * La page contient un tableau "Cours des devises" avec colonnes Devise | Achat | Vente.
 */
async function scrapeBceao(): Promise<BceaoRates | null> {
  try {
    const url = "https://www.bceao.int/fr/cours/cours-des-devises";
    const resp = await fetch(url, {
      headers: { "User-Agent": "224Solutions-FX-Collector/1.0", "Accept": "text/html" },
    });
    if (!resp.ok) {
      console.warn(`[BCEAO] HTTP ${resp.status}`);
      await resp.text(); // consume body
      return null;
    }
    const html = await resp.text();

    // Parse "Dollar us" row: | Dollar us | 565,250 | 572,250 |
    // We take the average of buy/sell
    const dollarMatch = html.match(
      /Dollar\s+us[^<]*<\/td>\s*<td[^>]*>\s*([\d\s,.]+)\s*<\/td>\s*<td[^>]*>\s*([\d\s,.]+)/i
    );
    if (!dollarMatch) {
      // Try markdown-style table from simplified HTML
      const mdMatch = html.match(/Dollar\s+us\s*\|\s*([\d\s,.]+)\s*\|\s*([\d\s,.]+)/i);
      if (!mdMatch) {
        console.warn("[BCEAO] Could not find Dollar row in HTML");
        return null;
      }
      const buy = parseFloat(mdMatch[1].replace(/\s/g, "").replace(",", "."));
      const sell = parseFloat(mdMatch[2].replace(/\s/g, "").replace(",", "."));
      if (isNaN(buy) || isNaN(sell)) return null;
      return { usdXof: (buy + sell) / 2 };
    }

    const buy = parseFloat(dollarMatch[1].replace(/\s/g, "").replace(",", "."));
    const sell = parseFloat(dollarMatch[2].replace(/\s/g, "").replace(",", "."));
    if (isNaN(buy) || isNaN(sell) || buy <= 0 || sell <= 0) return null;

    return { usdXof: (buy + sell) / 2 };
  } catch (e) {
    console.error("[BCEAO] Scraping failed:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// TIER 1 — PARITÉS FIXES
// ═══════════════════════════════════════════════════════════

/**
 * Pour les devises à parité fixe avec l'EUR ou l'USD,
 * on a besoin du taux EUR/USD du jour pour calculer le cross.
 */
function computeFixedRates(
  config: CurrencyConfig,
  eurUsdRate: number,
): { rateUsd: number; rateEur: number } {
  const fixed = config.fixedRate!;
  if (fixed.base === "EUR") {
    // 1 EUR = X devise → 1 USD = X / eurUsdRate devise
    return { rateEur: fixed.rate, rateUsd: fixed.rate / eurUsdRate };
  }
  // 1 USD = X devise → 1 EUR = X * eurUsdRate devise
  return { rateUsd: fixed.rate, rateEur: fixed.rate * eurUsdRate };
}

// ═══════════════════════════════════════════════════════════
// TIER 3 — API FALLBACK (documenté, tracé, secondaire)
// ═══════════════════════════════════════════════════════════

async function fetchFallbackRates(): Promise<{
  usd: Record<string, number>;
  eur: Record<string, number>;
  eurUsd: number;
} | null> {
  try {
    const [usdRes, eurRes] = await Promise.all([
      fetch("https://open.er-api.com/v6/latest/USD", { headers: { accept: "application/json" } }),
      fetch("https://open.er-api.com/v6/latest/EUR", { headers: { accept: "application/json" } }),
    ]);
    const usdJson = await usdRes.json();
    const eurJson = await eurRes.json();

    if (usdJson?.result !== "success" || eurJson?.result !== "success") {
      console.error("[FALLBACK] API returned error");
      return null;
    }

    const eurUsd = usdJson.rates?.EUR ? 1 / usdJson.rates.EUR : 1.08;
    return { usd: usdJson.rates, eur: eurJson.rates, eurUsd };
  } catch (e) {
    console.error("[FALLBACK] Fetch failed:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results: { currency: string; status: string; tier: number; source: string; rateUsd?: number; rateEur?: number }[] = [];

  try {
    // ── 1. Récupérer la marge depuis margin_config ──
    const { data: marginRow } = await supabase
      .from("margin_config")
      .select("config_value")
      .eq("config_key", "default_margin")
      .single();
    const margin = marginRow?.config_value ?? 0.03;

    // ── 2. Récupérer les taux existants pour détecter les variations ──
    const { data: existingRates } = await supabase
      .from("currency_exchange_rates")
      .select("from_currency, to_currency, rate")
      .eq("is_active", true)
      .in("to_currency", Object.keys(AFRICAN_CURRENCIES));

    const existingMap = new Map<string, number>();
    if (existingRates) {
      for (const r of existingRates) {
        existingMap.set(`${r.from_currency}->${r.to_currency}`, Number(r.rate));
      }
    }

    const now = new Date().toISOString();
    const today = now.split("T")[0];

    // ── 3. TIER 2 : Scraper la BCEAO pour le taux USD/XOF officiel ──
    const bceaoRates = await scrapeBceao();
    let bceaoUsdXof: number | null = null;
    if (bceaoRates) {
      bceaoUsdXof = bceaoRates.usdXof;
      console.log(`[BCEAO] Taux USD/XOF officiel scrappé : ${bceaoUsdXof}`);
    } else {
      console.warn("[BCEAO] Scraping échoué, fallback sera utilisé pour USD/XOF si nécessaire");
    }

    // ── 4. Récupérer le fallback API pour les devises tier 3 et pour EUR/USD ──
    const fallback = await fetchFallbackRates();
    if (!fallback) {
      console.error("[COLLECT] Fallback API aussi indisponible. Seuls les taux fixes et BCEAO seront mis à jour.");
    }

    // EUR/USD du jour (nécessaire pour calculer les cross des parités fixes)
    const eurUsdRate = fallback?.eurUsd ?? 1.08;

    // ── 5. Traiter chaque devise ──
    for (const [code, config] of Object.entries(AFRICAN_CURRENCIES)) {
      let rateUsd: number | undefined;
      let rateEur: number | undefined;
      let source: string;
      let sourceUrl: string;

      // ─── TIER 1 : Parité fixe officielle ───
      if (config.tier === 1 && config.fixedRate) {
        const fixed = computeFixedRates(config, eurUsdRate);
        rateUsd = fixed.rateUsd;
        rateEur = fixed.rateEur;
        source = `official-peg-${config.fixedRate.base}`;
        sourceUrl = config.zone === "BCEAO"
          ? "https://www.bceao.int"
          : config.zone === "BEAC"
            ? "https://www.beac.int"
            : "official-monetary-agreement";

        // Pour XOF : si BCEAO a fourni un taux USD, utiliser celui-là (plus précis que le calcul via EUR/USD)
        if (code === "XOF" && bceaoUsdXof) {
          rateUsd = bceaoUsdXof;
          source = "bceao-scrape+peg";
          sourceUrl = "https://www.bceao.int/fr/cours/cours-des-devises";
        }
        // XAF a le même peg que XOF mais pas de BCEAO
        if (code === "XAF" && bceaoUsdXof) {
          // XAF et XOF ont le même taux fixe EUR, donc même cross USD
          rateUsd = bceaoUsdXof;
          source = "beac-peg+bceao-cross";
        }
      }
      // ─── TIER 3 : API fallback (documenté) ───
      else if (config.tier === 3) {
        if (!fallback) {
          // Pas de source disponible → garder le dernier taux connu
          await supabase.from("fx_collection_log").insert({
            currency_code: code,
            source: "none",
            source_url: "N/A",
            status: "FALLBACK",
            error_message: `Aucune source disponible pour ${code}. Dernier taux conservé.`,
          });
          results.push({ currency: code, status: "FALLBACK", tier: 3, source: "none" });
          continue;
        }

        rateUsd = fallback.usd[code];
        rateEur = fallback.eur[code];
        source = "fallback-api";
        sourceUrl = "https://open.er-api.com";

        if (!rateUsd || !rateEur) {
          await supabase.from("fx_collection_log").insert({
            currency_code: code,
            source: "fallback-api",
            source_url: sourceUrl,
            status: "FALLBACK",
            error_message: `Taux non disponible pour ${code} dans l'API de référence`,
          });
          results.push({ currency: code, status: "FALLBACK", tier: 3, source: "fallback-api" });
          continue;
        }
      } else {
        continue; // Should not happen
      }

      if (!rateUsd || !rateEur) continue;

      // ─── Vérifier si variation significative ───
      const existingUsd = existingMap.get(`USD->${code}`);
      if (existingUsd && Math.abs(rateUsd - existingUsd) / existingUsd < VARIATION_THRESHOLD) {
        results.push({ currency: code, status: "NO_CHANGE", tier: config.tier, source, rateUsd, rateEur });
        continue;
      }

      // ─── Appliquer la marge au taux ───
      const finalRateUsd = rateUsd * (1 + margin);
      const finalRateEur = rateEur * (1 + margin);

      // ─── Upsert les 4 directions ───
      const upsertPromises = [
        // USD → DEVISE
        supabase.from("currency_exchange_rates").upsert({
          from_currency: "USD", to_currency: code,
          rate: rateUsd, rate_usd: rateUsd, rate_eur: rateEur,
          margin, final_rate_usd: finalRateUsd, final_rate_eur: finalRateEur,
          source, source_url: sourceUrl, effective_date: today,
          retrieved_at: now, status: "OK", is_active: true,
        }, { onConflict: "from_currency,to_currency", ignoreDuplicates: false }),

        // EUR → DEVISE
        supabase.from("currency_exchange_rates").upsert({
          from_currency: "EUR", to_currency: code,
          rate: rateEur, rate_usd: rateUsd, rate_eur: rateEur,
          margin, final_rate_usd: finalRateUsd, final_rate_eur: finalRateEur,
          source, source_url: sourceUrl, effective_date: today,
          retrieved_at: now, status: "OK", is_active: true,
        }, { onConflict: "from_currency,to_currency", ignoreDuplicates: false }),

        // DEVISE → USD (inverse)
        rateUsd > 0
          ? supabase.from("currency_exchange_rates").upsert({
              from_currency: code, to_currency: "USD",
              rate: 1 / rateUsd, source, effective_date: today,
              retrieved_at: now, status: "OK", is_active: true,
            }, { onConflict: "from_currency,to_currency", ignoreDuplicates: false })
          : Promise.resolve(),

        // DEVISE → EUR (inverse)
        rateEur > 0
          ? supabase.from("currency_exchange_rates").upsert({
              from_currency: code, to_currency: "EUR",
              rate: 1 / rateEur, source, effective_date: today,
              retrieved_at: now, status: "OK", is_active: true,
            }, { onConflict: "from_currency,to_currency", ignoreDuplicates: false })
          : Promise.resolve(),
      ];

      await Promise.all(upsertPromises);

      // ─── Log de collecte ───
      await supabase.from("fx_collection_log").insert({
        currency_code: code,
        rate_usd: rateUsd,
        rate_eur: rateEur,
        source,
        source_url: sourceUrl,
        status: "OK",
      });

      results.push({ currency: code, status: "OK", tier: config.tier, source, rateUsd, rateEur });
    }

    // ── 6. Résumé ──
    const okCount = results.filter(r => r.status === "OK").length;
    const noChangeCount = results.filter(r => r.status === "NO_CHANGE").length;
    const fallbackCount = results.filter(r => r.status === "FALLBACK").length;
    const tier1Count = results.filter(r => r.tier === 1 && r.status === "OK").length;
    const tier3Count = results.filter(r => r.tier === 3 && r.status === "OK").length;

    console.log(
      `[african-fx-collect] Done: ${results.length} currencies. ` +
      `OK=${okCount} (tier1=${tier1Count}, tier3=${tier3Count}), ` +
      `NO_CHANGE=${noChangeCount}, FALLBACK=${fallbackCount}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        margin,
        processed: results.length,
        updated: okCount,
        unchanged: noChangeCount,
        fallback: fallbackCount,
        sources: {
          tier1_fixed_peg: tier1Count,
          tier2_bceao_scrape: bceaoRates ? "OK" : "FAILED",
          tier3_fallback_api: tier3Count,
        },
        timestamp: now,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[african-fx-collect] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
