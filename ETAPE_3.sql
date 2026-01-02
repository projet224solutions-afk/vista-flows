-- ETAPE 3: Creer policy pour PDG
CREATE POLICY "admin_manage_all_subscriptions" ON public.driver_subscriptions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'ceo')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'ceo')
  )
);
