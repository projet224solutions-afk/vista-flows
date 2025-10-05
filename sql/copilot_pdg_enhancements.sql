-- =====================================================
-- ENHANCEMENTS COPILOTE PDG - MODE ADDITIF UNIQUEMENT
-- Améliorations des tables existantes sans suppression
-- =====================================================

-- Vérifier et ajouter les colonnes manquantes à ai_chats si nécessaire
DO $$ 
BEGIN
    -- Ajouter colonne context si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_chats' AND column_name = 'context') THEN
        ALTER TABLE ai_chats ADD COLUMN context JSONB;
    END IF;
    
    -- Ajouter colonne metadata si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_chats' AND column_name = 'metadata') THEN
        ALTER TABLE ai_chats ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Vérifier et ajouter les colonnes manquantes à ai_logs si nécessaire
DO $$ 
BEGIN
    -- Ajouter colonne action_type si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_logs' AND column_name = 'action_type') THEN
        ALTER TABLE ai_logs ADD COLUMN action_type VARCHAR(50);
    END IF;
    
    -- Ajouter colonne severity si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_logs' AND column_name = 'severity') THEN
        ALTER TABLE ai_logs ADD COLUMN severity VARCHAR(20) DEFAULT 'info';
    END IF;
    
    -- Ajouter colonne status si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_logs' AND column_name = 'status') THEN
        ALTER TABLE ai_logs ADD COLUMN status VARCHAR(20) DEFAULT 'completed';
    END IF;
END $$;

-- Créer la table audit_reports si elle n'existe pas
CREATE TABLE IF NOT EXISTS audit_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary TEXT NOT NULL,
    issues_json JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    scan_duration_ms INTEGER,
    total_issues INTEGER DEFAULT 0,
    high_severity INTEGER DEFAULT 0,
    medium_severity INTEGER DEFAULT 0,
    low_severity INTEGER DEFAULT 0
);

-- Créer la table cursor_interactions si elle n'existe pas
CREATE TABLE IF NOT EXISTS cursor_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action VARCHAR(50) NOT NULL,
    payload JSONB,
    result JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Créer la table git_operations si elle n'existe pas
CREATE TABLE IF NOT EXISTS git_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    operation_type VARCHAR(50) NOT NULL,
    branch_name VARCHAR(100),
    commit_sha VARCHAR(40),
    pr_number INTEGER,
    pr_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Créer la table system_health si elle n'existe pas
CREATE TABLE IF NOT EXISTS system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    metrics JSONB,
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEX POUR PERFORMANCE (ADDITIF)
-- =====================================================

-- Index pour audit_reports
CREATE INDEX IF NOT EXISTS idx_audit_reports_created_at ON audit_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_reports_status ON audit_reports(status);
CREATE INDEX IF NOT EXISTS idx_audit_reports_created_by ON audit_reports(created_by);

-- Index pour cursor_interactions
CREATE INDEX IF NOT EXISTS idx_cursor_interactions_user_id ON cursor_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cursor_interactions_action ON cursor_interactions(action);
CREATE INDEX IF NOT EXISTS idx_cursor_interactions_status ON cursor_interactions(status);

-- Index pour git_operations
CREATE INDEX IF NOT EXISTS idx_git_operations_user_id ON git_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_git_operations_type ON git_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_git_operations_status ON git_operations(status);

-- Index pour system_health
CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health(component);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status);
CREATE INDEX IF NOT EXISTS idx_system_health_last_check ON system_health(last_check);

-- =====================================================
-- POLITIQUES RLS (ADDITIF)
-- =====================================================

-- Activer RLS sur les nouvelles tables
ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursor_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Politiques pour audit_reports
CREATE POLICY "Users can view their own audit reports" ON audit_reports
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "PDG can view all audit reports" ON audit_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('PDG', 'admin')
        )
    );

CREATE POLICY "System can insert audit reports" ON audit_reports
    FOR INSERT WITH CHECK (true);

-- Politiques pour cursor_interactions
CREATE POLICY "Users can view their own cursor interactions" ON cursor_interactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "PDG can view all cursor interactions" ON cursor_interactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('PDG', 'admin')
        )
    );

CREATE POLICY "System can insert cursor interactions" ON cursor_interactions
    FOR INSERT WITH CHECK (true);

-- Politiques pour git_operations
CREATE POLICY "Users can view their own git operations" ON git_operations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "PDG can view all git operations" ON git_operations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('PDG', 'admin')
        )
    );

CREATE POLICY "System can insert git operations" ON git_operations
    FOR INSERT WITH CHECK (true);

-- Politiques pour system_health
CREATE POLICY "PDG can view system health" ON system_health
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('PDG', 'admin')
        )
    );

CREATE POLICY "System can manage system health" ON system_health
    FOR ALL WITH CHECK (true);

-- =====================================================
-- FONCTIONS UTILITAIRES (ADDITIF)
-- =====================================================

-- Fonction pour obtenir les statistiques d'audit
CREATE OR REPLACE FUNCTION get_audit_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_reports', COUNT(*),
        'pending_reports', COUNT(*) FILTER (WHERE status = 'pending'),
        'completed_reports', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_reports', COUNT(*) FILTER (WHERE status = 'failed'),
        'total_issues', COALESCE(SUM(total_issues), 0),
        'high_severity', COALESCE(SUM(high_severity), 0),
        'medium_severity', COALESCE(SUM(medium_severity), 0),
        'low_severity', COALESCE(SUM(low_severity), 0),
        'last_audit', MAX(created_at)
    ) INTO result
    FROM audit_reports;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques Cursor
CREATE OR REPLACE FUNCTION get_cursor_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_interactions', COUNT(*),
        'pending_interactions', COUNT(*) FILTER (WHERE status = 'pending'),
        'completed_interactions', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_interactions', COUNT(*) FILTER (WHERE status = 'failed'),
        'analyze_actions', COUNT(*) FILTER (WHERE action = 'analyze'),
        'patch_actions', COUNT(*) FILTER (WHERE action = 'patch'),
        'last_interaction', MAX(created_at)
    ) INTO result
    FROM cursor_interactions;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques Git
CREATE OR REPLACE FUNCTION get_git_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_operations', COUNT(*),
        'pending_operations', COUNT(*) FILTER (WHERE status = 'pending'),
        'completed_operations', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_operations', COUNT(*) FILTER (WHERE status = 'failed'),
        'auto_fix_operations', COUNT(*) FILTER (WHERE operation_type = 'auto_fix'),
        'pr_operations', COUNT(*) FILTER (WHERE operation_type = 'create_pr'),
        'last_operation', MAX(created_at)
    ) INTO result
    FROM git_operations;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les anciennes données
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Supprimer les logs de plus de 90 jours
    DELETE FROM ai_logs 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Supprimer les chats de plus de 30 jours
    DELETE FROM ai_chats 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Supprimer les rapports d'audit de plus de 60 jours
    DELETE FROM audit_reports 
    WHERE created_at < NOW() - INTERVAL '60 days';
    
    -- Supprimer les interactions Cursor de plus de 30 jours
    DELETE FROM cursor_interactions 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Supprimer les opérations Git de plus de 30 jours
    DELETE FROM git_operations 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Supprimer les métriques de santé de plus de 7 jours
    DELETE FROM system_health 
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS (ADDITIF)
-- =====================================================

-- Trigger pour mettre à jour updated_at sur audit_reports
CREATE OR REPLACE FUNCTION update_audit_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_audit_reports_updated_at
    BEFORE UPDATE ON audit_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_reports_updated_at();

-- =====================================================
-- DONNÉES DE TEST (OPTIONNEL)
-- =====================================================

-- Insérer des données de test pour system_health
INSERT INTO system_health (component, status, metrics) VALUES
('copilot_api', 'healthy', '{"response_time": 150, "uptime": 99.9}'),
('audit_system', 'healthy', '{"last_scan": "2024-01-01T00:00:00Z", "issues_found": 0}'),
('cursor_connector', 'healthy', '{"last_interaction": "2024-01-01T00:00:00Z", "success_rate": 100}'),
('git_autopush', 'healthy', '{"last_push": "2024-01-01T00:00:00Z", "success_rate": 100}')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE audit_reports IS 'Rapports d\'audit système générés par l\'IA';
COMMENT ON TABLE cursor_interactions IS 'Interactions avec Cursor pour analyse et correction';
COMMENT ON TABLE git_operations IS 'Opérations Git automatiques (branches, commits, PRs)';
COMMENT ON TABLE system_health IS 'Métriques de santé du système Copilote PDG';

COMMENT ON COLUMN audit_reports.issues_json IS 'Liste des issues détectées au format JSON';
COMMENT ON COLUMN audit_reports.scan_duration_ms IS 'Durée du scan en millisecondes';
COMMENT ON COLUMN cursor_interactions.payload IS 'Données envoyées à Cursor';
COMMENT ON COLUMN cursor_interactions.result IS 'Résultat retourné par Cursor';
COMMENT ON COLUMN git_operations.pr_url IS 'URL de la Pull Request créée';
COMMENT ON COLUMN system_health.metrics IS 'Métriques détaillées du composant';
