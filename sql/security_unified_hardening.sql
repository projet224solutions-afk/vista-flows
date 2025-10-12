-- Unified security hardening
-- Enable RLS on all public tables; add service_role policy; basic indexes

-- Revoke PUBLIC
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC;

-- Optimize RLS policies on public.profiles to avoid per-row re-evaluation
-- Replace auth.uid() calls with scalar subqueries (select auth.uid())
-- and ensure admin policies also use the scalar subquery form
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    -- Drop existing policies if present
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles';

    -- Recreate with scalar subqueries to prevent per-row re-evaluation
    EXECUTE 'CREATE POLICY "Users can view their own profile" ON public.profiles
      FOR SELECT USING ((select auth.uid()) = id)';

    EXECUTE 'CREATE POLICY "Users can update their own profile" ON public.profiles
      FOR UPDATE USING ((select auth.uid()) = id)';

    EXECUTE 'CREATE POLICY "Admins can view all profiles" ON public.profiles
      FOR SELECT USING (public.has_role((select auth.uid()), ''admin''))';

    EXECUTE 'CREATE POLICY "Admins can update all profiles" ON public.profiles
      FOR UPDATE USING (public.has_role((select auth.uid()), ''admin''))';
  END IF;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type='BASE TABLE'
  ) LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
    -- Policy for service_role
    EXECUTE format('DROP POLICY IF EXISTS service_role_all ON public.%I', r.table_name);
    EXECUTE format('CREATE POLICY service_role_all ON public.%I USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')', r.table_name);
    -- Optional read for authenticated on non-sensitive catalog-like tables
    IF r.table_name IN ('products','inventory') THEN
      EXECUTE format('DROP POLICY IF EXISTS authenticated_read ON public.%I', r.table_name);
      EXECUTE format('CREATE POLICY authenticated_read ON public.%I FOR SELECT USING (auth.role() = ''authenticated'')', r.table_name);
    END IF;
  END LOOP;
END $$;

-- Basic performance indexes: created_at and common FKs if present
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type='BASE TABLE'
  ) LOOP
    -- created_at
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=r.table_name AND column_name='created_at'
    ) THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I_created_at_idx ON public.%I (created_at)', r.table_name, r.table_name);
    END IF;
    -- user_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=r.table_name AND column_name='user_id'
    ) THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I_user_id_idx ON public.%I (user_id)', r.table_name, r.table_name);
    END IF;
    -- agent_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=r.table_name AND column_name='agent_id'
    ) THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I_agent_id_idx ON public.%I (agent_id)', r.table_name, r.table_name);
    END IF;
    -- driver_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=r.table_name AND column_name='driver_id'
    ) THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I_driver_id_idx ON public.%I (driver_id)', r.table_name, r.table_name);
    END IF;
  END LOOP;
END $$;




