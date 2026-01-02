-- ETAPE 2: Creer policy pour utilisateurs
CREATE POLICY "users_manage_own_subscriptions" ON public.driver_subscriptions
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
