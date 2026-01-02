-- ETAPE 5: Fonction de test
CREATE OR REPLACE FUNCTION test_pdg_subscription_permissions()
RETURNS TABLE(
  test_name TEXT,
  can_insert BOOLEAN,
  can_update BOOLEAN,
  can_select BOOLEAN,
  message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Admin Role Check'::TEXT,
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))::BOOLEAN,
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))::BOOLEAN,
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))::BOOLEAN,
    'Test permissions'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
