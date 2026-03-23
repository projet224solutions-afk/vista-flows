import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * 🌍 African FX Rate Collector
 * Fetches official exchange rates for all African currencies,
 * applies a configurable margin (default 3%), and stores them
 * in `currency_exchange_rates` + `fx_collection_log`.
 *
 * Sources (in priority order):
 *  1. open.er-api.com (free, all currencies, daily refresh)
 *  2. exchangerate.host (fallback)
 *
 * Called by pg_cron every hour + daily at midnight Africa/Conakry.
 */

// All African currency codes with their country context
const AFRICAN_CURRENCIES: Record<string, { country: string; zone?: string }> = {
  GNF: { country: "Guinée" },
  XOF: { country: "UEMOA (Sénégal, Côte d'Ivoire, Mali, Burkina, Togo, Bénin, Niger)", zone: "BCEAO" },
  XAF: { country: "CEMAC (Cameroun, Congo, Gabon, Tchad, RCA, Guinée Éq.)", zone: "BEAC" },
  NGN: { country: "Nigeria" },
  ZAR: { country: "Afrique du Sud" },
  EGP: { country: "Égypte" },
  MAD: { country: "Maroc" },
  TND: { country: "Tunisie" },
  DZD: { country: "Algérie" },
  KES: { country: "Kenya" },
  GHS: { country: "Ghana" },
  TZS: { country: "Tanzanie" },
  UGX: { country: "Ouganda" },
  ETB: { country: "Éthiopie" },
  MZN: { country: "Mozambique" },
  AOA: { country: "Angola" },
  CDF: { country: "RD Congo" },
  RWF: { country: "Rwanda" },
  BIF: { country: "Burundi" },
  MGA: { country: "Madagascar" },
  MUR: { country: "Maurice" },
  SCR: { country: "Seychelles" },
  GMD: { country: "Gambie" },
  SLL: { country: "Sierra Leone" },
  LRD: { country: "Liberia" },
  CVE: { country: "Cap-Vert" },
  BWP: { country: "Botswana" },
  NAD: { country: "Namibie" },
  SZL: { country: "Eswatini" },
  LSL: { country: "Lesotho" },
  MWK: { country: "Malawi" },
  ZMW: { country: "Zambie" },
  SDG: { country: "Soudan" },
  SSP: { country: "Soudan du Sud" },
  SOS: { country: "Somalie" },
  DJF: { country: "Djibouti" },
  ERN: { country: "Érythrée" },
  LYD: { country: "Libye" },
  STN: { country: "São Tomé-et-Príncipe" },
  KMF: { country: "Comores" },
  MRU: { country: "Mauritanie" },
  ZWL: { country: "Zimbabwe" },
};

const VARIATION_THRESHOLD = 0.001; // 0.1%

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results: { currency: string; status: string; rateUsd?: number; rateEur?: number }[] = [];

  try {
    // 1. Get margin from config
    const { data: marginRow } = await supabase
      .from("margin_config")
      .select("config_value")
      .eq("config_key", "default_margin")
      .single();
    const margin = marginRow?.config_value ?? 0.03;

    // 2. Fetch all rates from USD base
    const usdUrl = "https://open.er-api.com/v6/latest/USD";
    const eurUrl = "https://open.er-api.com/v6/latest/EUR";

    const [usdRes, eurRes] = await Promise.all([
      fetch(usdUrl, { headers: { accept: "application/json" } }),
      fetch(eurUrl, { headers: { accept: "application/json" } }),
    ]);

    const usdJson = await usdRes.json();
    const eurJson = await eurRes.json();

    if (usdJson?.result !== "success" || eurJson?.result !== "success") {
      throw new Error("API provider returned error");
    }

    const usdRates = usdJson.rates as Record<string, number>;
    const eurRates = eurJson.rates as Record<string, number>;
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    // 3. Get existing rates to check for significant variation
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

    // 4. Process each African currency
    for (const [code, info] of Object.entries(AFRICAN_CURRENCIES)) {
      const rateUsd = usdRates[code];
      const rateEur = eurRates[code];

      if (!rateUsd || !rateEur) {
        // Log failure, keep last known rate
        await supabase.from("fx_collection_log").insert({
          currency_code: code,
          source: "open-er-api",
          source_url: usdUrl,
          status: "FALLBACK",
          error_message: `Rate not available for ${code}`,
        });
        results.push({ currency: code, status: "FALLBACK" });
        continue;
      }

      // Check if variation is significant
      const existingUsd = existingMap.get(`USD->${code}`);
      if (existingUsd && Math.abs(rateUsd - existingUsd) / existingUsd < VARIATION_THRESHOLD) {
        // No significant change – still log but skip DB update
        results.push({ currency: code, status: "NO_CHANGE", rateUsd, rateEur });
        continue;
      }

      const finalRateUsd = rateUsd * (1 + margin);
      const finalRateEur = rateEur * (1 + margin);

      // Upsert USD -> CURRENCY
      await supabase
        .from("currency_exchange_rates")
        .upsert(
          {
            from_currency: "USD",
            to_currency: code,
            rate: rateUsd,
            rate_usd: rateUsd,
            rate_eur: rateEur,
            margin,
            final_rate_usd: finalRateUsd,
            final_rate_eur: finalRateEur,
            source: "open-er-api",
            source_url: usdUrl,
            effective_date: today,
            retrieved_at: now,
            status: "OK",
            is_active: true,
          },
          { onConflict: "from_currency,to_currency", ignoreDuplicates: false }
        );

      // Upsert EUR -> CURRENCY
      await supabase
        .from("currency_exchange_rates")
        .upsert(
          {
            from_currency: "EUR",
            to_currency: code,
            rate: rateEur,
            rate_usd: rateUsd,
            rate_eur: rateEur,
            margin,
            final_rate_usd: finalRateUsd,
            final_rate_eur: finalRateEur,
            source: "open-er-api",
            source_url: eurUrl,
            effective_date: today,
            retrieved_at: now,
            status: "OK",
            is_active: true,
          },
          { onConflict: "from_currency,to_currency", ignoreDuplicates: false }
        );

      // Upsert CURRENCY -> USD (inverse)
      if (rateUsd > 0) {
        await supabase
          .from("currency_exchange_rates")
          .upsert(
            {
              from_currency: code,
              to_currency: "USD",
              rate: 1 / rateUsd,
              source: "open-er-api",
              effective_date: today,
              retrieved_at: now,
              status: "OK",
              is_active: true,
            },
            { onConflict: "from_currency,to_currency", ignoreDuplicates: false }
          );
      }

      // Upsert CURRENCY -> EUR (inverse)
      if (rateEur > 0) {
        await supabase
          .from("currency_exchange_rates")
          .upsert(
            {
              from_currency: code,
              to_currency: "EUR",
              rate: 1 / rateEur,
              source: "open-er-api",
              effective_date: today,
              retrieved_at: now,
              status: "OK",
              is_active: true,
            },
            { onConflict: "from_currency,to_currency", ignoreDuplicates: false }
          );
      }

      // Also upsert cross-rates between African currencies via USD pivot
      // (GNF <-> XOF, etc.) — handled by convert_with_margin SQL function

      // Log collection
      await supabase.from("fx_collection_log").insert({
        currency_code: code,
        rate_usd: rateUsd,
        rate_eur: rateEur,
        source: "open-er-api",
        source_url: usdUrl,
        status: "OK",
      });

      results.push({ currency: code, status: "OK", rateUsd, rateEur });
    }

    console.log(`[african-fx-collect] Processed ${results.length} currencies. OK: ${results.filter(r => r.status === "OK").length}, FALLBACK: ${results.filter(r => r.status === "FALLBACK").length}`);

    return new Response(
      JSON.stringify({
        success: true,
        margin,
        processed: results.length,
        updated: results.filter(r => r.status === "OK").length,
        unchanged: results.filter(r => r.status === "NO_CHANGE").length,
        fallback: results.filter(r => r.status === "FALLBACK").length,
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
