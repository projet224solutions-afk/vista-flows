-- ETAPE 1: Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can manage driver subscriptions" ON public.driver_subscriptions;
DROP POLICY IF EXISTS "users_own_driver_subscriptions" ON public.driver_subscriptions;
