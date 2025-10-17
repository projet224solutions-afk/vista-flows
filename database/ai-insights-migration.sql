-- =====================================================
-- MIGRATION AI INSIGHTS - 224SOLUTIONS
-- =====================================================
-- Date: 18 octobre 2025
-- Version: 1.0.0
-- Description: Tables pour le module Insights IA avec feature flag

-- =====================================================
-- 1. TABLE AI_INSIGHTS
-- =====================================================

-- Table pour stocker les insights générés par l'IA
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- 'financial', 'users', 'payments', 'vendors', 'security'
    type VARCHAR(100) NOT NULL, -- Type spécifique d'insight
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1), -- 0.0 à 1.0
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    recommendation TEXT NOT NULL,
    action_required BOOLEAN DEFAULT FALSE,
    metadata JSONB, -- Données supplémentaires
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Optionnel pour les insights temporaires
    generated_by VARCHAR(50) DEFAULT 'ai_engine' -- 'ai_engine', 'manual', 'cron'
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_ai_insights_category ON public.ai_insights(category);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON public.ai_insights(priority);
CREATE INDEX IF NOT EXISTS idx_ai_insights_active ON public.ai_insights(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON public.ai_insights(created_at DESC);

-- =====================================================
-- 2. TABLE AI_INSIGHTS_ACTIONS
-- =====================================================

-- Table pour suivre les actions prises sur les insights
CREATE TABLE IF NOT EXISTS public.ai_insights_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_id UUID NOT NULL REFERENCES public.ai_insights(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'viewed', 'dismissed', 'acted', 'scheduled'
    action_data JSONB, -- Données de l'action
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_ai_insights_actions_insight_id ON public.ai_insights_actions(insight_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_actions_user_id ON public.ai_insights_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_actions_type ON public.ai_insights_actions(action_type);

-- =====================================================
-- 3. TABLE AI_INSIGHTS_CONFIG
-- =====================================================

-- Table pour la configuration du module IA
CREATE TABLE IF NOT EXISTS public.ai_insights_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name VARCHAR(100) UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    config_data JSONB, -- Configuration spécifique
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_ai_insights_config_feature_name ON public.ai_insights_config(feature_name);
CREATE INDEX IF NOT EXISTS idx_ai_insights_config_enabled ON public.ai_insights_config(is_enabled);

-- =====================================================
-- 4. TABLE AI_INSIGHTS_METRICS
-- =====================================================

-- Table pour les métriques de performance du module IA
CREATE TABLE IF NOT EXISTS public.ai_insights_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50), -- 'count', 'percentage', 'currency', etc.
    category VARCHAR(50) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_ai_insights_metrics_name ON public.ai_insights_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_ai_insights_metrics_category ON public.ai_insights_metrics(category);
CREATE INDEX IF NOT EXISTS idx_ai_insights_metrics_period ON public.ai_insights_metrics(period_start, period_end);

-- =====================================================
-- 5. POLITIQUES RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights_metrics ENABLE ROW LEVEL SECURITY;

-- Politiques pour ai_insights (lecture pour les utilisateurs autorisés)
CREATE POLICY ai_insights_read_policy ON public.ai_insights
    FOR SELECT TO authenticated
    USING (
        is_active = TRUE AND (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'pdg')
            )
        )
    );

-- Politiques pour ai_insights_actions (accès à ses propres actions)
CREATE POLICY ai_insights_actions_own_policy ON public.ai_insights_actions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- Politiques pour ai_insights_config (lecture pour les admins)
CREATE POLICY ai_insights_config_read_policy ON public.ai_insights_config
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'pdg')
        )
    );

-- Politiques pour ai_insights_metrics (lecture pour les admins)
CREATE POLICY ai_insights_metrics_read_policy ON public.ai_insights_metrics
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'pdg')
        )
    );

-- =====================================================
-- 6. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour nettoyer les insights expirés
CREATE OR REPLACE FUNCTION public.cleanup_expired_insights()
RETURNS void AS $$
BEGIN
    DELETE FROM public.ai_insights 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques des insights
CREATE OR REPLACE FUNCTION public.get_insights_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_insights', (SELECT COUNT(*) FROM public.ai_insights WHERE is_active = TRUE),
        'critical_insights', (SELECT COUNT(*) FROM public.ai_insights WHERE priority = 'critical' AND is_active = TRUE),
        'high_priority_insights', (SELECT COUNT(*) FROM public.ai_insights WHERE priority IN ('high', 'critical') AND is_active = TRUE),
        'action_required_insights', (SELECT COUNT(*) FROM public.ai_insights WHERE action_required = TRUE AND is_active = TRUE),
        'user_actions', (
            SELECT COUNT(*) FROM public.ai_insights_actions 
            WHERE user_id = p_user_id
        ),
        'categories', (
            SELECT jsonb_object_agg(category, count)
            FROM (
                SELECT category, COUNT(*) as count
                FROM public.ai_insights 
                WHERE is_active = TRUE
                GROUP BY category
            ) t
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour enregistrer une action sur un insight
CREATE OR REPLACE FUNCTION public.record_insight_action(
    p_insight_id UUID,
    p_user_id UUID,
    p_action_type VARCHAR(50),
    p_action_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    action_id UUID;
BEGIN
    INSERT INTO public.ai_insights_actions (
        insight_id, user_id, action_type, action_data
    ) VALUES (
        p_insight_id, p_user_id, p_action_type, p_action_data
    ) RETURNING id INTO action_id;
    
    RETURN action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour générer des métriques
CREATE OR REPLACE FUNCTION public.generate_insights_metrics()
RETURNS void AS $$
DECLARE
    total_insights INTEGER;
    active_insights INTEGER;
    critical_insights INTEGER;
    avg_confidence DECIMAL(3,2);
BEGIN
    -- Compter les insights
    SELECT COUNT(*) INTO total_insights FROM public.ai_insights;
    SELECT COUNT(*) INTO active_insights FROM public.ai_insights WHERE is_active = TRUE;
    SELECT COUNT(*) INTO critical_insights FROM public.ai_insights WHERE priority = 'critical' AND is_active = TRUE;
    SELECT AVG(confidence) INTO avg_confidence FROM public.ai_insights WHERE is_active = TRUE;
    
    -- Insérer les métriques
    INSERT INTO public.ai_insights_metrics (metric_name, metric_value, metric_unit, category, period_start, period_end)
    VALUES 
        ('total_insights', total_insights, 'count', 'insights', NOW() - INTERVAL '1 day', NOW()),
        ('active_insights', active_insights, 'count', 'insights', NOW() - INTERVAL '1 day', NOW()),
        ('critical_insights', critical_insights, 'count', 'insights', NOW() - INTERVAL '1 day', NOW()),
        ('avg_confidence', COALESCE(avg_confidence, 0), 'percentage', 'insights', NOW() - INTERVAL '1 day', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TRIGGERS POUR AUDIT AUTOMATIQUE
-- =====================================================

-- Fonction de trigger pour l'audit des insights
CREATE OR REPLACE FUNCTION public.audit_insights_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Enregistrer l'audit pour les modifications importantes
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.ai_insights_metrics (metric_name, metric_value, metric_unit, category, period_start, period_end)
        VALUES (
            'insights_generated',
            1,
            'count',
            'generation',
            NOW(),
            NOW()
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.is_active != OLD.is_active THEN
            INSERT INTO public.ai_insights_metrics (metric_name, metric_value, metric_unit, category, period_start, period_end)
            VALUES (
                CASE WHEN NEW.is_active THEN 'insights_activated' ELSE 'insights_deactivated' END,
                1,
                'count',
                'status_change',
                NOW(),
                NOW()
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers pour l'audit automatique
CREATE TRIGGER ai_insights_audit_trigger
    AFTER INSERT OR UPDATE ON public.ai_insights
    FOR EACH ROW EXECUTE FUNCTION public.audit_insights_changes();

-- =====================================================
-- 8. INSERTION DE LA CONFIGURATION PAR DÉFAUT
-- =====================================================

-- Insérer la configuration par défaut
INSERT INTO public.ai_insights_config (feature_name, is_enabled, config_data) VALUES
('ai_insights', FALSE, '{"auto_generation": true, "cron_schedule": "0 */6 * * *", "max_insights": 100, "retention_days": 30}'),
('financial_analysis', FALSE, '{"enabled": true, "thresholds": {"revenue_high": 1000000, "revenue_decline": -10}}'),
('user_analysis', FALSE, '{"enabled": true, "thresholds": {"activation_rate": 70, "growth_threshold": 10}}'),
('payment_analysis', FALSE, '{"enabled": true, "thresholds": {"success_rate": 80, "pending_threshold": 5}}'),
('security_analysis', FALSE, '{"enabled": true, "thresholds": {"failed_logins": 10, "suspicious_activities": 5}}')
ON CONFLICT (feature_name) DO NOTHING;

-- =====================================================
-- 9. VUES DE SÉCURITÉ
-- =====================================================

-- Vue pour les administrateurs (statistiques des insights)
CREATE OR REPLACE VIEW public.ai_insights_stats_view AS
SELECT 
    category,
    priority,
    COUNT(*) as total_insights,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_insights,
    COUNT(CASE WHEN action_required = TRUE THEN 1 END) as action_required_insights,
    AVG(confidence) as avg_confidence,
    MAX(created_at) as last_generated
FROM public.ai_insights
GROUP BY category, priority
ORDER BY total_insights DESC;

-- Vue pour les métriques des insights
CREATE OR REPLACE VIEW public.ai_insights_metrics_view AS
SELECT 
    metric_name,
    metric_value,
    metric_unit,
    category,
    period_start,
    period_end,
    created_at
FROM public.ai_insights_metrics
ORDER BY created_at DESC;

-- =====================================================
-- 10. PERMISSIONS
-- =====================================================

-- Accorder les permissions nécessaires
GRANT SELECT ON public.ai_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights_actions TO authenticated;
GRANT SELECT ON public.ai_insights_config TO authenticated;
GRANT SELECT ON public.ai_insights_metrics TO authenticated;

-- Permissions pour les vues
GRANT SELECT ON public.ai_insights_stats_view TO authenticated;
GRANT SELECT ON public.ai_insights_metrics_view TO authenticated;

-- Permissions pour les fonctions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_insights() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_insights_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_insight_action(UUID, UUID, VARCHAR, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_insights_metrics() TO authenticated;

-- =====================================================
-- 11. COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.ai_insights IS 'Insights générés par l''IA pour l''analyse des données';
COMMENT ON COLUMN public.ai_insights.confidence IS 'Niveau de confiance de l''insight (0.0 à 1.0)';
COMMENT ON COLUMN public.ai_insights.priority IS 'Priorité de l''insight (low, medium, high, critical)';
COMMENT ON COLUMN public.ai_insights.metadata IS 'Données supplémentaires de l''insight';

COMMENT ON TABLE public.ai_insights_actions IS 'Actions prises sur les insights par les utilisateurs';
COMMENT ON COLUMN public.ai_insights_actions.action_type IS 'Type d''action (viewed, dismissed, acted, scheduled)';
COMMENT ON COLUMN public.ai_insights_actions.action_data IS 'Données de l''action effectuée';

COMMENT ON TABLE public.ai_insights_config IS 'Configuration du module Insights IA';
COMMENT ON COLUMN public.ai_insights_config.config_data IS 'Configuration spécifique du module';

COMMENT ON TABLE public.ai_insights_metrics IS 'Métriques de performance du module IA';
COMMENT ON COLUMN public.ai_insights_metrics.metric_value IS 'Valeur de la métrique';
COMMENT ON COLUMN public.ai_insights_metrics.metric_unit IS 'Unité de la métrique';

COMMENT ON FUNCTION public.get_insights_stats IS 'Retourne les statistiques des insights pour un utilisateur';
COMMENT ON FUNCTION public.record_insight_action IS 'Enregistre une action sur un insight';
COMMENT ON FUNCTION public.generate_insights_metrics IS 'Génère les métriques des insights';
