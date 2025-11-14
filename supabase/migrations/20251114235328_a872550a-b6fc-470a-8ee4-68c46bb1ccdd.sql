-- Module Gestion des Agents PDG - Structure complète

-- 1. Ajouter colonnes manquantes à agents_management
ALTER TABLE agents_management
ADD COLUMN IF NOT EXISTS type_agent TEXT DEFAULT 'principal' CHECK (type_agent IN ('principal', 'sous_agent')),
ADD COLUMN IF NOT EXISTS commission_agent_principal NUMERIC DEFAULT 15,
ADD COLUMN IF NOT EXISTS commission_sous_agent NUMERIC DEFAULT 15,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Mettre à jour full_name avec name existant
UPDATE agents_management SET full_name = name WHERE full_name IS NULL;

-- 2. Créer table pour logs de commissions
CREATE TABLE IF NOT EXISTS agent_commissions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents_management(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  source_type TEXT NOT NULL,
  related_user_id UUID,
  transaction_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_commissions_log ENABLE ROW LEVEL SECURITY;

-- RLS pour agent_commissions_log
CREATE POLICY "PDG can view all commission logs"
ON agent_commissions_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pdg_management
    WHERE pdg_management.user_id = auth.uid()
    AND pdg_management.is_active = true
  )
);

CREATE POLICY "Agents can view own commission logs"
ON agent_commissions_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agents_management
    WHERE agents_management.id = agent_commissions_log.agent_id
    AND agents_management.user_id = auth.uid()
    AND agents_management.is_active = true
  )
);

-- 3. Fonction pour générer ID agent (AGP-XXXX ou SAG-XXXX)
CREATE OR REPLACE FUNCTION public.generate_agent_id(p_type_agent TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_number TEXT;
  v_agent_id TEXT;
  v_attempts INTEGER := 0;
  v_max_attempts INTEGER := 100;
BEGIN
  -- Déterminer le préfixe selon le type
  IF p_type_agent = 'principal' THEN
    v_prefix := 'AGP';
  ELSIF p_type_agent = 'sous_agent' THEN
    v_prefix := 'SAG';
  ELSE
    RAISE EXCEPTION 'Type agent invalide: %', p_type_agent;
  END IF;

  -- Générer un ID unique
  LOOP
    -- Générer 4 chiffres aléatoires
    v_number := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    v_agent_id := v_prefix || '-' || v_number;
    
    -- Vérifier l'unicité
    IF NOT EXISTS (
      SELECT 1 FROM agents_management WHERE agent_code = v_agent_id
    ) THEN
      RETURN v_agent_id;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'Impossible de générer un ID unique après % tentatives', v_max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- 4. Fonction pour calculer et distribuer les commissions
CREATE OR REPLACE FUNCTION public.calculate_agent_commission(
  p_agent_id UUID,
  p_amount NUMERIC,
  p_source_type TEXT,
  p_related_user_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent RECORD;
  v_parent_agent RECORD;
  v_sous_agent_commission NUMERIC;
  v_principal_commission NUMERIC;
  v_result JSONB;
BEGIN
  -- Récupérer l'agent
  SELECT * INTO v_agent
  FROM agents_management
  WHERE id = p_agent_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent non trouvé ou inactif';
  END IF;

  -- Calculer les commissions
  IF v_agent.type_agent = 'sous_agent' THEN
    -- Commission du sous-agent
    v_sous_agent_commission := p_amount * (v_agent.commission_sous_agent / 100);
    
    -- Créditer le wallet du sous-agent
    UPDATE agent_wallets
    SET balance = balance + v_sous_agent_commission,
        updated_at = NOW()
    WHERE agent_id = p_agent_id;
    
    -- Logger la commission du sous-agent
    INSERT INTO agent_commissions_log (
      agent_id, amount, source_type, related_user_id, transaction_id, description
    ) VALUES (
      p_agent_id, v_sous_agent_commission, p_source_type, p_related_user_id, p_transaction_id,
      'Commission sous-agent ' || v_agent.commission_sous_agent || '%'
    );

    -- Si le sous-agent a un parent, calculer la commission du parent
    IF v_agent.parent_agent_id IS NOT NULL THEN
      SELECT * INTO v_parent_agent
      FROM agents_management
      WHERE id = v_agent.parent_agent_id AND is_active = true;
      
      IF FOUND THEN
        v_principal_commission := p_amount * (v_parent_agent.commission_agent_principal / 100);
        
        -- Créditer le wallet de l'agent principal
        UPDATE agent_wallets
        SET balance = balance + v_principal_commission,
            updated_at = NOW()
        WHERE agent_id = v_parent_agent.id;
        
        -- Logger la commission de l'agent principal
        INSERT INTO agent_commissions_log (
          agent_id, amount, source_type, related_user_id, transaction_id, description
        ) VALUES (
          v_parent_agent.id, v_principal_commission, p_source_type, p_related_user_id, p_transaction_id,
          'Commission agent principal ' || v_parent_agent.commission_agent_principal || '%'
        );
      END IF;
    END IF;
    
    v_result := jsonb_build_object(
      'sous_agent_commission', v_sous_agent_commission,
      'principal_commission', COALESCE(v_principal_commission, 0),
      'total_commissions', v_sous_agent_commission + COALESCE(v_principal_commission, 0)
    );
    
  ELSE
    -- Agent principal
    v_principal_commission := p_amount * (v_agent.commission_agent_principal / 100);
    
    -- Créditer le wallet
    UPDATE agent_wallets
    SET balance = balance + v_principal_commission,
        updated_at = NOW()
    WHERE agent_id = p_agent_id;
    
    -- Logger la commission
    INSERT INTO agent_commissions_log (
      agent_id, amount, source_type, related_user_id, transaction_id, description
    ) VALUES (
      p_agent_id, v_principal_commission, p_source_type, p_related_user_id, p_transaction_id,
      'Commission agent principal ' || v_agent.commission_agent_principal || '%'
    );
    
    v_result := jsonb_build_object(
      'principal_commission', v_principal_commission,
      'total_commissions', v_principal_commission
    );
  END IF;

  RETURN v_result;
END;
$$;

-- 5. Index pour performance
CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent_id ON agent_commissions_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_created_at ON agent_commissions_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_management_type ON agents_management(type_agent);
CREATE INDEX IF NOT EXISTS idx_agents_management_parent ON agents_management(parent_agent_id);

-- Commentaires
COMMENT ON FUNCTION generate_agent_id IS 'Génère un ID unique au format AGP-XXXX (principal) ou SAG-XXXX (sous-agent)';
COMMENT ON FUNCTION calculate_agent_commission IS 'Calcule et distribue automatiquement les commissions hiérarchiques';
COMMENT ON TABLE agent_commissions_log IS 'Historique de toutes les commissions versées aux agents';