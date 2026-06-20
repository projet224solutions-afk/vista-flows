-- ================================================================
-- FIX : Vidéos débloquées pour abonnements Pro et Premium
-- Coller dans Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- ── 1. Fixer can_upload_video sur les bons plans ────────────────
-- La migration précédente ciblait 'elite' qui n'existe pas.
-- Les vrais plans payants qui doivent débloquer les vidéos : pro et premium

UPDATE public.service_plans
SET can_upload_video = true
WHERE name IN ('pro', 'premium')
  AND is_active = true;

-- Vérification
SELECT name, display_name, monthly_price_gnf, can_upload_video
FROM public.service_plans
WHERE is_active = true
ORDER BY monthly_price_gnf;

-- ── 2. Remplacer le RPC get_service_subscription ────────────────
-- Ajout du champ can_upload_video dans les données retournées.
-- SECURITY DEFINER : contourne RLS → accessible même aux non-authentifiés.

DROP FUNCTION IF EXISTS public.get_service_subscription(UUID);

CREATE OR REPLACE FUNCTION public.get_service_subscription(p_service_id UUID)
RETURNS TABLE(
  subscription_id    UUID,
  plan_id            UUID,
  plan_name          TEXT,
  plan_display_name  TEXT,
  status             TEXT,
  current_period_end TIMESTAMPTZ,
  auto_renew         BOOLEAN,
  price_paid         NUMERIC,
  max_bookings       INTEGER,
  max_products       INTEGER,
  max_staff          INTEGER,
  priority_listing   BOOLEAN,
  analytics_access   BOOLEAN,
  can_upload_video   BOOLEAN,
  features           JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Abonnement actif trouvé → retourner ses détails
  RETURN QUERY
  SELECT
    ss.id                           AS subscription_id,
    sp.id                           AS plan_id,
    sp.name::TEXT                   AS plan_name,
    sp.display_name::TEXT           AS plan_display_name,
    ss.status::TEXT,
    ss.current_period_end,
    ss.auto_renew,
    ss.price_paid_gnf               AS price_paid,
    sp.max_bookings_per_month       AS max_bookings,
    sp.max_products,
    sp.max_staff,
    sp.priority_listing,
    sp.analytics_access,
    COALESCE(sp.can_upload_video, false) AS can_upload_video,
    sp.features
  FROM public.service_subscriptions ss
  JOIN public.service_plans sp ON sp.id = ss.plan_id
  WHERE ss.professional_service_id = p_service_id
    AND ss.status = 'active'
    AND ss.current_period_end > now()
  ORDER BY ss.created_at DESC
  LIMIT 1;

  -- Aucun abonnement actif → plan gratuit lié au type de service
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      NULL::UUID                        AS subscription_id,
      sp.id                             AS plan_id,
      sp.name::TEXT                     AS plan_name,
      sp.display_name::TEXT             AS plan_display_name,
      'free'::TEXT                      AS status,
      NULL::TIMESTAMPTZ                 AS current_period_end,
      false                             AS auto_renew,
      0::NUMERIC                        AS price_paid,
      sp.max_bookings_per_month         AS max_bookings,
      sp.max_products,
      sp.max_staff,
      sp.priority_listing,
      sp.analytics_access,
      false                             AS can_upload_video,
      sp.features
    FROM public.service_plans sp
    JOIN public.professional_services ps ON ps.service_type_id = sp.service_type_id
    WHERE sp.name = 'free'
      AND ps.id = p_service_id
      AND sp.is_active = true
    LIMIT 1;
  END IF;

  -- Fallback ultime si aucun plan gratuit trouvé
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      NULL::UUID,
      NULL::UUID,
      'free'::TEXT,
      'Gratuit'::TEXT,
      'free'::TEXT,
      NULL::TIMESTAMPTZ,
      false,
      0::NUMERIC,
      10::INTEGER,
      5::INTEGER,
      1::INTEGER,
      false,
      false,
      false,
      '[]'::JSONB;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_service_subscription(UUID) TO anon, authenticated;

-- ── 3. Vérification finale ───────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM public.service_plans WHERE can_upload_video = true AND is_active = true)
    AS plans_video_actifs,
  (SELECT COUNT(*) FROM public.service_subscriptions WHERE status = 'active' AND current_period_end > now())
    AS abonnements_actifs;
