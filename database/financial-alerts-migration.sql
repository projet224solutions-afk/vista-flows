-- =====================================================
-- MIGRATION ALERTES FINANCIÈRES - 224SOLUTIONS
-- =====================================================
-- Date: 18 octobre 2025
-- Version: 1.0.0
-- Description: Tables pour le monitoring des paiements et alertes financières

-- =====================================================
-- 1. TABLE PAYMENT_ALERTS
-- =====================================================

-- Table pour stocker les alertes de paiements en attente
CREATE TABLE IF NOT EXISTS public.payment_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payment_links(id) ON DELETE CASCADE,
    vendeur_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    alert_level VARCHAR(20) NOT NULL CHECK (alert_level IN ('warning', 'critical')),
    hours_pending INTEGER NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'GNF',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_payment_alerts_payment_id ON public.payment_alerts(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_alerts_vendeur_id ON public.payment_alerts(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_payment_alerts_alert_level ON public.payment_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_payment_alerts_status ON public.payment_alerts(status);
CREATE INDEX IF NOT EXISTS idx_payment_alerts_created_at ON public.payment_alerts(created_at DESC);

-- =====================================================
-- 2. TABLE NOTIFICATION_QUEUE
-- =====================================================

-- Table pour la queue des notifications
CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'email', 'slack', 'sms', 'push'
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON public.notification_queue(type);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON public.notification_queue(priority);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON public.notification_queue(created_at);

-- =====================================================
-- 3. TABLE DASHBOARD_NOTIFICATIONS
-- =====================================================

-- Table pour les notifications du dashboard
CREATE TABLE IF NOT EXISTS public.dashboard_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'payment_alert', 'system_alert', 'user_alert'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_user_id ON public.dashboard_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_type ON public.dashboard_notifications(type);
CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_priority ON public.dashboard_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_is_read ON public.dashboard_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_created_at ON public.dashboard_notifications(created_at DESC);

-- =====================================================
-- 4. TABLE MONITORING_REPORTS
-- =====================================================

-- Table pour les rapports de monitoring
CREATE TABLE IF NOT EXISTS public.monitoring_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL, -- 'payments_monitoring', 'system_health', 'user_activity'
    report_data JSONB NOT NULL,
    generated_by VARCHAR(50) DEFAULT 'system', -- 'system', 'user', 'cron'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_monitoring_reports_type ON public.monitoring_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_reports_created_at ON public.monitoring_reports(created_at DESC);

-- =====================================================
-- 5. POLITIQUES RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.payment_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_reports ENABLE ROW LEVEL SECURITY;

-- Politiques pour payment_alerts (lecture pour les admins et vendeurs concernés)
CREATE POLICY payment_alerts_read_policy ON public.payment_alerts
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (role IN ('admin', 'pdg') OR id = vendeur_id)
        )
    );

-- Politiques pour dashboard_notifications (accès à ses propres notifications)
CREATE POLICY dashboard_notifications_own_policy ON public.dashboard_notifications
    FOR ALL TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Politiques pour notification_queue (lecture pour les admins)
CREATE POLICY notification_queue_read_policy ON public.notification_queue
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'pdg')
        )
    );

-- Politiques pour monitoring_reports (lecture pour les admins)
CREATE POLICY monitoring_reports_read_policy ON public.monitoring_reports
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

-- Fonction pour nettoyer les notifications anciennes
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    -- Supprimer les notifications lues de plus de 30 jours
    DELETE FROM public.dashboard_notifications 
    WHERE is_read = TRUE 
    AND read_at < NOW() - INTERVAL '30 days';
    
    -- Supprimer les notifications expirées
    DELETE FROM public.dashboard_notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    -- Supprimer les notifications en échec de plus de 7 jours
    DELETE FROM public.notification_queue 
    WHERE status = 'failed' 
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques des alertes
CREATE OR REPLACE FUNCTION public.get_payment_alerts_stats()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_alerts', (SELECT COUNT(*) FROM public.payment_alerts WHERE status = 'active'),
        'critical_alerts', (SELECT COUNT(*) FROM public.payment_alerts WHERE alert_level = 'critical' AND status = 'active'),
        'warning_alerts', (SELECT COUNT(*) FROM public.payment_alerts WHERE alert_level = 'warning' AND status = 'active'),
        'total_amount', (SELECT COALESCE(SUM(amount), 0) FROM public.payment_alerts WHERE status = 'active'),
        'avg_pending_hours', (SELECT COALESCE(AVG(hours_pending), 0) FROM public.payment_alerts WHERE status = 'active'),
        'alerts_by_vendor', (
            SELECT jsonb_object_agg(v.business_name, count)
            FROM (
                SELECT p.business_name, COUNT(*) as count
                FROM public.payment_alerts pa
                JOIN public.profiles p ON pa.vendeur_id = p.id
                WHERE pa.status = 'active'
                GROUP BY p.business_name
            ) v
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer une alerte de paiement
CREATE OR REPLACE FUNCTION public.create_payment_alert(
    p_payment_id UUID,
    p_alert_level VARCHAR(20),
    p_hours_pending INTEGER
) RETURNS UUID AS $$
DECLARE
    alert_id UUID;
    payment_data RECORD;
BEGIN
    -- Récupérer les données du paiement
    SELECT pl.id, pl.vendeur_id, pl.client_id, pl.montant, pl.devise
    INTO payment_data
    FROM public.payment_links pl
    WHERE pl.id = p_payment_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paiement non trouvé';
    END IF;
    
    -- Créer l'alerte
    INSERT INTO public.payment_alerts (
        payment_id, vendeur_id, client_id, alert_level, hours_pending, amount, currency
    ) VALUES (
        p_payment_id, payment_data.vendeur_id, payment_data.client_id, 
        p_alert_level, p_hours_pending, payment_data.montant, payment_data.devise
    ) RETURNING id INTO alert_id;
    
    RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour résoudre une alerte
CREATE OR REPLACE FUNCTION public.resolve_payment_alert(
    p_alert_id UUID,
    p_resolved_by UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.payment_alerts 
    SET 
        status = 'resolved',
        resolved_by = p_resolved_by,
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_alert_id 
    AND status = 'active';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TRIGGERS POUR AUDIT AUTOMATIQUE
-- =====================================================

-- Fonction de trigger pour l'audit des alertes
CREATE OR REPLACE FUNCTION public.audit_payment_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Enregistrer l'audit pour les modifications importantes
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.dashboard_notifications (
            type, title, message, priority, metadata
        ) VALUES (
            'payment_alert',
            'Nouvelle alerte de paiement',
            'Paiement en attente depuis ' || NEW.hours_pending || ' heures',
            CASE WHEN NEW.alert_level = 'critical' THEN 'critical' ELSE 'high' END,
            jsonb_build_object(
                'alert_id', NEW.id,
                'payment_id', NEW.payment_id,
                'vendeur_id', NEW.vendeur_id,
                'amount', NEW.amount,
                'currency', NEW.currency
            )
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status != OLD.status AND NEW.status = 'resolved' THEN
            INSERT INTO public.dashboard_notifications (
                type, title, message, priority, metadata
            ) VALUES (
                'payment_alert_resolved',
                'Alerte de paiement résolue',
                'L''alerte de paiement a été marquée comme résolue',
                'medium',
                jsonb_build_object(
                    'alert_id', NEW.id,
                    'payment_id', NEW.payment_id,
                    'resolved_by', NEW.resolved_by
                )
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers pour l'audit automatique
CREATE TRIGGER payment_alerts_audit_trigger
    AFTER INSERT OR UPDATE ON public.payment_alerts
    FOR EACH ROW EXECUTE FUNCTION public.audit_payment_alerts();

-- =====================================================
-- 8. VUES DE SÉCURITÉ
-- =====================================================

-- Vue pour les administrateurs (statistiques des alertes)
CREATE OR REPLACE VIEW public.payment_alerts_stats_view AS
SELECT 
    pa.alert_level,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN pa.status = 'active' THEN 1 END) as active_alerts,
    COUNT(CASE WHEN pa.status = 'resolved' THEN 1 END) as resolved_alerts,
    COALESCE(SUM(pa.amount), 0) as total_amount,
    COALESCE(AVG(pa.hours_pending), 0) as avg_pending_hours,
    MAX(pa.created_at) as last_alert_date
FROM public.payment_alerts pa
GROUP BY pa.alert_level
ORDER BY total_alerts DESC;

-- Vue pour les alertes actives avec détails
CREATE OR REPLACE VIEW public.payment_alerts_active_view AS
SELECT 
    pa.id,
    pa.payment_id,
    pa.alert_level,
    pa.hours_pending,
    pa.amount,
    pa.currency,
    pa.created_at,
    p.business_name as vendeur_name,
    p.email as vendeur_email,
    c.first_name as client_first_name,
    c.last_name as client_last_name,
    c.email as client_email
FROM public.payment_alerts pa
JOIN public.profiles p ON pa.vendeur_id = p.id
LEFT JOIN public.profiles c ON pa.client_id = c.id
WHERE pa.status = 'active'
ORDER BY pa.created_at DESC;

-- =====================================================
-- 9. PERMISSIONS
-- =====================================================

-- Accorder les permissions nécessaires
GRANT SELECT ON public.payment_alerts TO authenticated;
GRANT SELECT ON public.notification_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_notifications TO authenticated;
GRANT SELECT ON public.monitoring_reports TO authenticated;

-- Permissions pour les vues
GRANT SELECT ON public.payment_alerts_stats_view TO authenticated;
GRANT SELECT ON public.payment_alerts_active_view TO authenticated;

-- Permissions pour les fonctions
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_alerts_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_alert(UUID, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_payment_alert(UUID, UUID) TO authenticated;

-- =====================================================
-- 10. COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.payment_alerts IS 'Alertes pour les paiements en attente';
COMMENT ON COLUMN public.payment_alerts.alert_level IS 'Niveau d''alerte (warning, critical)';
COMMENT ON COLUMN public.payment_alerts.hours_pending IS 'Nombre d''heures en attente';
COMMENT ON COLUMN public.payment_alerts.status IS 'Statut de l''alerte (active, resolved, dismissed)';

COMMENT ON TABLE public.notification_queue IS 'Queue des notifications à envoyer';
COMMENT ON COLUMN public.notification_queue.type IS 'Type de notification (email, slack, sms, push)';
COMMENT ON COLUMN public.notification_queue.priority IS 'Priorité de la notification';
COMMENT ON COLUMN public.notification_queue.attempts IS 'Nombre de tentatives d''envoi';

COMMENT ON TABLE public.dashboard_notifications IS 'Notifications du dashboard';
COMMENT ON COLUMN public.dashboard_notifications.type IS 'Type de notification';
COMMENT ON COLUMN public.dashboard_notifications.priority IS 'Priorité de la notification';
COMMENT ON COLUMN public.dashboard_notifications.is_read IS 'Notification lue ou non';

COMMENT ON TABLE public.monitoring_reports IS 'Rapports de monitoring du système';
COMMENT ON COLUMN public.monitoring_reports.report_type IS 'Type de rapport';
COMMENT ON COLUMN public.monitoring_reports.report_data IS 'Données du rapport en JSON';

COMMENT ON FUNCTION public.get_payment_alerts_stats IS 'Retourne les statistiques des alertes de paiement';
COMMENT ON FUNCTION public.create_payment_alert IS 'Crée une alerte de paiement';
COMMENT ON FUNCTION public.resolve_payment_alert IS 'Résout une alerte de paiement';
