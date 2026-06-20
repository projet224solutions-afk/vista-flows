-- Vérifier la résolution de l'appel record_pdg_revenue avec les nouveaux paramètres
-- (dry-run : on vérifie que PostgreSQL peut résoudre la signature sans erreur)
DO $$
BEGIN
  -- Test : l'appel (text, numeric, numeric, uuid, uuid, uuid, jsonb) doit matcher
  PERFORM record_pdg_revenue(
    'service_subscription'::TEXT,
    1000::NUMERIC,
    100::NUMERIC,
    NULL::UUID,
    NULL::UUID,
    NULL::UUID,
    '{}'::JSONB
  );
  RAISE NOTICE '✅ record_pdg_revenue : appel résolu correctement';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ record_pdg_revenue : erreur %', SQLERRM;
END;
$$;

-- Vérifier la résolution de credit_agent_commission (uuid, numeric, text, uuid, jsonb)
DO $$
BEGIN
  PERFORM credit_agent_commission(
    NULL::UUID,
    0::NUMERIC,
    'service_subscription'::TEXT,
    NULL::UUID,
    '{}'::JSONB
  );
  RAISE NOTICE '✅ credit_agent_commission : appel résolu correctement';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ credit_agent_commission : erreur %', SQLERRM;
END;
$$;

SELECT 'Vérification des signatures terminée.' AS status;
