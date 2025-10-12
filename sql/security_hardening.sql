-- Security hardening for Supabase/Postgres
-- 1) Revoke PUBLIC grants on schema and tables
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema='public' LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC', r.table_schema, r.table_name);
  END LOOP;
END $$;

-- 2) Enable RLS + create service_role-only policies on sensitive tables if present
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wallets','virtual_cards','transactions','commissions','orders','order_items',
    'ai_logs','wallet_logs','system_metrics','taxi_drivers','taxi_trips','agents',
    'bureau_transactions','bureaus','members','vehicles','sos_alerts',
    'users','products','inventory'
  ]
  LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS service_role_all ON public.%I', t);
      EXECUTE format('CREATE POLICY service_role_all ON public.%I USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')', t);
    END IF;
  END LOOP;
END $$;

-- 3) Optional: allow read-only access for authenticated users on catalog tables (products/inventory)
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    DROP POLICY IF EXISTS authenticated_read ON public.products;
    CREATE POLICY authenticated_read ON public.products FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
  IF to_regclass('public.inventory') IS NOT NULL THEN
    DROP POLICY IF EXISTS authenticated_read ON public.inventory;
    CREATE POLICY authenticated_read ON public.inventory FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;


