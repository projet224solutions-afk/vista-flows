-- ETAPE 4: Creer policy service_role
CREATE POLICY "service_role_full_access" ON public.driver_subscriptions
FOR ALL TO service_role
USING (true)
WITH CHECK (true);
