-- =====================================================
-- MODULE SÉCURITÉ INTELLIGENTE - MOTOS VOLÉES
-- 224Solutions - Système de détection et d'alerte
-- =====================================================

-- 1. Ajout de champs à la table taxi_motos existante
ALTER TABLE taxi_motos
ADD COLUMN IF NOT EXISTS numero_serie TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS vin TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'actif', -- actif / suspendu / vole / retrouve
ADD COLUMN IF NOT EXISTS ville_enregistrement TEXT,
ADD COLUMN IF NOT EXISTS date_enregistrement TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS alerte_envoyee BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bureau_id UUID REFERENCES bureau_syndicat(id),
ADD COLUMN IF NOT EXISTS chauffeur_id UUID REFERENCES users(id);

-- 2. Table des alertes de motos volées
CREATE TABLE IF NOT EXISTS moto_alertes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_serie TEXT NOT NULL,
    vin TEXT,
    chauffeur_id UUID REFERENCES users(id),
    bureau_origine_id UUID REFERENCES bureau_syndicat(id),
    bureau_detection_id UUID REFERENCES bureau_syndicat(id),
    ville_signalement TEXT NOT NULL,
    ville_detection TEXT,
    description TEXT,
    statut VARCHAR(50) DEFAULT 'en_cours', -- en_cours / resolue / faux_positif
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Table des notifications de sécurité
CREATE TABLE IF NOT EXISTS security_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- moto_alert / vol_detected / resolution
    target_bureau_origin UUID REFERENCES bureau_syndicat(id),
    target_bureau_detection UUID REFERENCES bureau_syndicat(id),
    target_pdg BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table d'audit pour toutes les actions de sécurité
CREATE TABLE IF NOT EXISTS moto_security_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL, -- report_stolen / detection / resolution / block
    numero_serie TEXT,
    vin TEXT,
    user_id UUID REFERENCES users(id),
    bureau_id UUID REFERENCES bureau_syndicat(id),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Index pour performance
CREATE INDEX IF NOT EXISTS idx_moto_alertes_numero_serie ON moto_alertes(numero_serie);
CREATE INDEX IF NOT EXISTS idx_moto_alertes_statut ON moto_alertes(statut);
CREATE INDEX IF NOT EXISTS idx_moto_alertes_created_at ON moto_alertes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_taxi_motos_numero_serie ON taxi_motos(numero_serie);
CREATE INDEX IF NOT EXISTS idx_taxi_motos_vin ON taxi_motos(vin);
CREATE INDEX IF NOT EXISTS idx_taxi_motos_statut ON taxi_motos(statut);
CREATE INDEX IF NOT EXISTS idx_security_notifications_type ON security_notifications(type);
CREATE INDEX IF NOT EXISTS idx_security_notifications_created_at ON security_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moto_security_audit_action ON moto_security_audit(action);
CREATE INDEX IF NOT EXISTS idx_moto_security_audit_created_at ON moto_security_audit(created_at DESC);

-- 6. Fonction pour créer une alerte automatiquement
CREATE OR REPLACE FUNCTION create_moto_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier si la moto existe déjà avec un statut "volé"
    IF EXISTS (
        SELECT 1 FROM taxi_motos 
        WHERE (numero_serie = NEW.numero_serie OR vin = NEW.vin) 
        AND statut = 'vole' 
        AND id != NEW.id
    ) THEN
        -- Créer une alerte de détection
        INSERT INTO moto_alertes (
            numero_serie, vin, bureau_detection_id, ville_detection,
            description, statut
        ) VALUES (
            NEW.numero_serie, NEW.vin, NEW.bureau_id, NEW.ville_enregistrement,
            'Tentative d''enregistrement sur moto signalée volée', 'en_cours'
        );
        
        -- Créer une notification
        INSERT INTO security_notifications (
            title, body, type, target_bureau_detection, target_pdg, metadata
        ) VALUES (
            '🚨 Moto volée détectée',
            'Moto ' || NEW.numero_serie || ' détectée dans ' || NEW.ville_enregistrement,
            'vol_detected',
            NEW.bureau_id,
            TRUE,
            jsonb_build_object('numero_serie', NEW.numero_serie, 'vin', NEW.vin)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger pour détection automatique
DROP TRIGGER IF EXISTS trigger_moto_alert ON taxi_motos;
CREATE TRIGGER trigger_moto_alert
    AFTER INSERT ON taxi_motos
    FOR EACH ROW
    EXECUTE FUNCTION create_moto_alert();

-- 8. Fonction pour marquer une moto comme retrouvée
CREATE OR REPLACE FUNCTION mark_moto_found(alert_id UUID, resolver_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    alert_record moto_alertes%ROWTYPE;
BEGIN
    -- Récupérer l'alerte
    SELECT * INTO alert_record FROM moto_alertes WHERE id = alert_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Marquer l'alerte comme résolue
    UPDATE moto_alertes 
    SET statut = 'resolue', resolved_at = NOW(), resolved_by = resolver_id
    WHERE id = alert_id;
    
    -- Mettre à jour le statut de la moto
    UPDATE taxi_motos 
    SET statut = 'retrouve'
    WHERE numero_serie = alert_record.numero_serie;
    
    -- Créer une notification de résolution
    INSERT INTO security_notifications (
        title, body, type, target_bureau_origin, target_pdg, metadata
    ) VALUES (
        '✅ Moto retrouvée',
        'Moto ' || alert_record.numero_serie || ' marquée comme retrouvée',
        'resolution',
        alert_record.bureau_origine_id,
        TRUE,
        jsonb_build_object('numero_serie', alert_record.numero_serie, 'alert_id', alert_id)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. Vue pour les statistiques de sécurité
CREATE OR REPLACE VIEW moto_security_stats AS
SELECT 
    COUNT(*) as total_alertes,
    COUNT(*) FILTER (WHERE statut = 'en_cours') as alertes_en_cours,
    COUNT(*) FILTER (WHERE statut = 'resolue') as alertes_resolues,
    COUNT(*) FILTER (WHERE statut = 'faux_positif') as faux_positifs,
    COUNT(DISTINCT numero_serie) as motos_uniques_signalées,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as temps_moyen_resolution_heures
FROM moto_alertes;

-- 10. RLS (Row Level Security) pour la sécurité
ALTER TABLE moto_alertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE moto_security_audit ENABLE ROW LEVEL SECURITY;

-- Politique pour les bureaux syndicats
CREATE POLICY "Bureaux can view their alerts" ON moto_alertes
    FOR SELECT USING (
        bureau_origine_id IN (
            SELECT id FROM bureau_syndicat WHERE id = bureau_origine_id
        ) OR bureau_detection_id IN (
            SELECT id FROM bureau_syndicat WHERE id = bureau_detection_id
        )
    );

-- Politique pour le PDG (accès total)
CREATE POLICY "PDG can view all alerts" ON moto_alertes
    FOR ALL USING (true);

-- 11. Données de test (optionnel)
INSERT INTO taxi_motos (numero_serie, vin, statut, ville_enregistrement, bureau_id, chauffeur_id)
VALUES 
    ('TM-2024-001', 'VIN123456789', 'actif', 'Conakry', (SELECT id FROM bureau_syndicat LIMIT 1), (SELECT id FROM users WHERE role = 'taxi' LIMIT 1)),
    ('TM-2024-002', 'VIN987654321', 'vole', 'Kindia', (SELECT id FROM bureau_syndicat LIMIT 1), (SELECT id FROM users WHERE role = 'taxi' LIMIT 1))
ON CONFLICT (numero_serie) DO NOTHING;

-- 12. Commentaires pour documentation
COMMENT ON TABLE moto_alertes IS 'Alertes de motos volées et détections inter-bureaux';
COMMENT ON TABLE security_notifications IS 'Notifications de sécurité pour bureaux et PDG';
COMMENT ON TABLE moto_security_audit IS 'Audit trail pour toutes les actions de sécurité';
COMMENT ON FUNCTION create_moto_alert() IS 'Fonction trigger pour détection automatique de motos volées';
COMMENT ON FUNCTION mark_moto_found(UUID, UUID) IS 'Fonction pour marquer une moto comme retrouvée';

-- =====================================================
-- MIGRATION TERMINÉE
-- =====================================================
