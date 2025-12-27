import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

type FxRatesRequest = {
  base?: string;
  symbols?: string[];
};

type FxRatesResponse = {
  base: string;
  rates: Record<string, number>;
  provider: "open-er-api";
  time_last_update_utc: string | null;
  fetched_at: string;
};

let cache: {
  key: string;
  expires_at: number;
  payload: FxRatesResponse;
} | null = null;

function isCurrencyCode(value: string) {
  return /^[A-Z]{3}$/.test(value);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as FxRatesRequest;

    const base = String(body.base || "GNF").toUpperCase();
    const symbols = Array.isArray(body.symbols)
      ? body.symbols
          .map((s) => String(s).toUpperCase())
          .filter((s) => isCurrencyCode(s))
      : [];

    if (!isCurrencyCode(base)) {
      return new Response(JSON.stringify({ error: "Base devise invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (symbols.length === 0) {
      return new Response(JSON.stringify({ error: "Aucune devise cible" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = `${base}:${symbols.slice().sort().join(",")}`;
    const now = Date.now();

    if (cache && cache.key === cacheKey && cache.expires_at > now) {
      return new Response(JSON.stringify(cache.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Source: Open Exchange Rates by ER-API (gratuit, sans clé)
    // https://open.er-api.com/v6/latest/{BASE}
    const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
    const fxRes = await fetch(url, { headers: { accept: "application/json" } });
    const fxJson = await fxRes.json();

    if (!fxRes.ok || fxJson?.result !== "success" || !fxJson?.rates) {
      console.error("[fx-rates] provider_error", fxRes.status, fxJson);
      throw new Error("Fournisseur de taux indisponible");
    }

    const rates: Record<string, number> = {};
    for (const sym of symbols) {
      const v = fxJson.rates?.[sym];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        rates[sym] = v;
      }
    }

    if (Object.keys(rates).length === 0) {
      return new Response(JSON.stringify({ error: "Taux manquants" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: FxRatesResponse = {
      base,
      rates,
      provider: "open-er-api",
      time_last_update_utc: typeof fxJson?.time_last_update_utc === "string" ? fxJson.time_last_update_utc : null,
      fetched_at: new Date().toISOString(),
    };

    cache = { key: cacheKey, expires_at: now + 15 * 60_000, payload };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[fx-rates] error", error);
    return new Response(JSON.stringify({ error: "Erreur récupération taux" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
