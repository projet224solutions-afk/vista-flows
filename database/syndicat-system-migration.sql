-- database/syndicat-system-migration.sql
-- Migration pour le système complet des bureaux syndicaux

-- Table Bureaux Syndicaux
CREATE TABLE IF NOT EXISTS public.bureaux_syndicaux (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    email_president VARCHAR(255) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    interface_url TEXT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Travailleurs
CREATE TABLE IF NOT EXISTS public.travailleurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bureau_id UUID REFERENCES public.bureaux_syndicaux(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telephone VARCHAR(20),
    interface_url TEXT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    access_level VARCHAR(50) DEFAULT 'limité' CHECK (access_level IN ('limité', 'standard', 'élevé')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Motos
CREATE TABLE IF NOT EXISTS public.motos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bureau_id UUID REFERENCES public.bureaux_syndicaux(id) ON DELETE CASCADE,
    travailleur_id UUID REFERENCES public.travailleurs(id) ON DELETE SET NULL,
    numero_serie VARCHAR(100) UNIQUE NOT NULL,
    marque VARCHAR(100),
    modele VARCHAR(100),
    annee INTEGER,
    couleur VARCHAR(50),
    statut VARCHAR(50) DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'maintenance', 'volé')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Alertes
CREATE TABLE IF NOT EXISTS public.alertes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bureau_id UUID REFERENCES public.bureaux_syndicaux(id) ON DELETE CASCADE,
    travailleur_id UUID REFERENCES public.travailleurs(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL,
    level VARCHAR(20) DEFAULT 'info' CHECK (level IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Table Fonctionnalités
CREATE TABLE IF NOT EXISTS public.fonctionnalites_bureau (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Attribution des Fonctionnalités
CREATE TABLE IF NOT EXISTS public.bureau_fonctionnalites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bureau_id UUID REFERENCES public.bureaux_syndicaux(id) ON DELETE CASCADE,
    fonctionnalite_id UUID REFERENCES public.fonctionnalites_bureau(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bureau_id, fonctionnalite_id)
);

-- Table Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bureau_id UUID REFERENCES public.bureaux_syndicaux(id) ON DELETE CASCADE,
    travailleur_id UUID REFERENCES public.travailleurs(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Table Communications avec l'équipe technique
CREATE TABLE IF NOT EXISTS public.communications_technique (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bureau_id UUID REFERENCES public.bureaux_syndicaux(id) ON DELETE CASCADE,
    travailleur_id UUID REFERENCES public.travailleurs(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('sms', 'appel', 'email')),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_bureaux_syndicaux_token ON public.bureaux_syndicaux(token);
CREATE INDEX IF NOT EXISTS idx_travailleurs_bureau_id ON public.travailleurs(bureau_id);
CREATE INDEX IF NOT EXISTS idx_travailleurs_token ON public.travailleurs(token);
CREATE INDEX IF NOT EXISTS idx_motos_bureau_id ON public.motos(bureau_id);
CREATE INDEX IF NOT EXISTS idx_motos_travailleur_id ON public.motos(travailleur_id);
CREATE INDEX IF NOT EXISTS idx_motos_numero_serie ON public.motos(numero_serie);
CREATE INDEX IF NOT EXISTS idx_alertes_bureau_id ON public.alertes(bureau_id);
CREATE INDEX IF NOT EXISTS idx_alertes_level ON public.alertes(level);
CREATE INDEX IF NOT EXISTS idx_notifications_bureau_id ON public.notifications(bureau_id);
CREATE INDEX IF NOT EXISTS idx_notifications_travailleur_id ON public.notifications(travailleur_id);

-- RLS (Row Level Security)
ALTER TABLE public.bureaux_syndicaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travailleurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fonctionnalites_bureau ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bureau_fonctionnalites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications_technique ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour PDG (accès total)
CREATE POLICY "PDG can manage all bureaux" ON public.bureaux_syndicaux
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "PDG can manage all travailleurs" ON public.travailleurs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "PDG can manage all motos" ON public.motos
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "PDG can view all alertes" ON public.alertes
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Politiques RLS pour Bureaux (accès limité à leur bureau)
CREATE POLICY "Bureaux can manage their own data" ON public.travailleurs
    FOR ALL TO authenticated
    USING (bureau_id = (SELECT id FROM public.bureaux_syndicaux WHERE token = (SELECT raw_user_meta_data->>'bureau_token' FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "Bureaux can manage their motos" ON public.motos
    FOR ALL TO authenticated
    USING (bureau_id = (SELECT id FROM public.bureaux_syndicaux WHERE token = (SELECT raw_user_meta_data->>'bureau_token' FROM auth.users WHERE id = auth.uid())));

-- Politiques RLS pour Travailleurs (accès limité selon permissions)
CREATE POLICY "Travailleurs can view their own data" ON public.travailleurs
    FOR SELECT TO authenticated
    USING (id = (SELECT id FROM public.travailleurs WHERE token = (SELECT raw_user_meta_data->>'travailleur_token' FROM auth.users WHERE id = auth.uid())));

-- Insérer les fonctionnalités par défaut
INSERT INTO public.fonctionnalites_bureau (nom, description, version) VALUES
('Gestion Travailleurs', 'Ajouter et gérer les travailleurs du bureau', '1.0.0'),
('Enregistrement Motos', 'Enregistrer et suivre les numéros de série des motos', '1.0.0'),
('Notifications', 'Recevoir des notifications et alertes', '1.0.0'),
('Communication Technique', 'Contacter l''équipe technique via SMS ou appel', '1.0.0'),
('Rapports', 'Générer des rapports d''activité', '1.0.0'),
('Statistiques', 'Voir les statistiques du bureau', '1.0.0')
ON CONFLICT DO NOTHING;

-- Fonction pour créer automatiquement les attributions de fonctionnalités
CREATE OR REPLACE FUNCTION assign_default_features_to_bureau()
RETURNS TRIGGER AS $$
BEGIN
    -- Assigner toutes les fonctionnalités actives au nouveau bureau
    INSERT INTO public.bureau_fonctionnalites (bureau_id, fonctionnalite_id)
    SELECT NEW.id, id
    FROM public.fonctionnalites_bureau
    WHERE is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour assigner automatiquement les fonctionnalités
CREATE TRIGGER trigger_assign_default_features
    AFTER INSERT ON public.bureaux_syndicaux
    FOR EACH ROW
    EXECUTE FUNCTION assign_default_features_to_bureau();

-- Fonction pour générer les alertes automatiques
CREATE OR REPLACE FUNCTION create_alert(
    p_bureau_id UUID,
    p_travailleur_id UUID DEFAULT NULL,
    p_type VARCHAR(100),
    p_level VARCHAR(20),
    p_message TEXT
) RETURNS UUID AS $$
DECLARE
    v_alert_id UUID;
BEGIN
    INSERT INTO public.alertes (bureau_id, travailleur_id, type, level, message)
    VALUES (p_bureau_id, p_travailleur_id, p_type, p_level, p_message)
    RETURNING id INTO v_alert_id;
    
    RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour envoyer des notifications
CREATE OR REPLACE FUNCTION send_notification(
    p_bureau_id UUID,
    p_travailleur_id UUID DEFAULT NULL,
    p_type VARCHAR(100),
    p_title VARCHAR(255),
    p_message TEXT
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (bureau_id, travailleur_id, type, title, message)
    VALUES (p_bureau_id, p_travailleur_id, p_type, p_title, p_message)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;
