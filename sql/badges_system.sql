-- =====================================================
-- SYSTÈME DE BADGES TAXI-MOTO - SCHEMA SUPABASE
-- 224Solutions - Badge Management System
-- =====================================================

-- Table des badges générés
CREATE TABLE IF NOT EXISTS badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bureau_id UUID NOT NULL REFERENCES syndicate_bureaus(id) ON DELETE CASCADE,
    member_id UUID REFERENCES users(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    gilet_number VARCHAR(20),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    plate VARCHAR(20) NOT NULL,
    serial_number VARCHAR(50) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_badges_bureau_id ON badges(bureau_id);
CREATE INDEX IF NOT EXISTS idx_badges_member_id ON badges(member_id);
CREATE INDEX IF NOT EXISTS idx_badges_serial_number ON badges(serial_number);
CREATE INDEX IF NOT EXISTS idx_badges_created_at ON badges(created_at);

-- RLS (Row Level Security) pour les badges
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Politique : Les PDG peuvent voir tous les badges
CREATE POLICY "PDG can view all badges" ON badges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'pdg'
        )
    );

-- Politique : Les présidents de bureau peuvent voir les badges de leur bureau
CREATE POLICY "Bureau presidents can view their badges" ON badges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM syndicate_bureaus sb
            JOIN users u ON u.id = sb.president_id
            WHERE sb.id = badges.bureau_id
            AND u.id = auth.uid()
        )
    );

-- Politique : Les membres peuvent voir leurs propres badges
CREATE POLICY "Members can view their own badges" ON badges
    FOR SELECT USING (
        member_id = auth.uid()
    );

-- Politique : Seuls les PDG et présidents de bureau peuvent créer des badges
CREATE POLICY "PDG and bureau presidents can create badges" ON badges
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'pdg' OR users.role = 'bureau_president')
        )
    );

-- Politique : Seuls les PDG peuvent modifier/supprimer les badges
CREATE POLICY "PDG can update badges" ON badges
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'pdg'
        )
    );

CREATE POLICY "PDG can delete badges" ON badges
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'pdg'
        )
    );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER trigger_update_badges_updated_at
    BEFORE UPDATE ON badges
    FOR EACH ROW
    EXECUTE FUNCTION update_badges_updated_at();

-- Vue pour les statistiques des badges
CREATE OR REPLACE VIEW badge_statistics AS
SELECT 
    b.bureau_id,
    sb.prefecture,
    sb.commune,
    COUNT(b.id) as total_badges,
    COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as badges_last_30_days,
    COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as badges_last_7_days,
    MAX(b.created_at) as last_badge_created
FROM badges b
JOIN syndicate_bureaus sb ON sb.id = b.bureau_id
GROUP BY b.bureau_id, sb.prefecture, sb.commune;

-- Fonction pour obtenir les badges d'un bureau
CREATE OR REPLACE FUNCTION get_bureau_badges(bureau_uuid UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    first_name VARCHAR,
    phone VARCHAR,
    plate VARCHAR,
    serial_number VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    public_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.first_name,
        b.phone,
        b.plate,
        b.serial_number,
        b.created_at,
        b.public_url
    FROM badges b
    WHERE b.bureau_id = bureau_uuid
    ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les badges d'un membre
CREATE OR REPLACE FUNCTION get_member_badges(member_uuid UUID)
RETURNS TABLE (
    id UUID,
    bureau_name TEXT,
    name VARCHAR,
    first_name VARCHAR,
    phone VARCHAR,
    plate VARCHAR,
    serial_number VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    public_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        CONCAT(sb.prefecture, ' - ', sb.commune) as bureau_name,
        b.name,
        b.first_name,
        b.phone,
        b.plate,
        b.serial_number,
        b.created_at,
        b.public_url
    FROM badges b
    JOIN syndicate_bureaus sb ON sb.id = b.bureau_id
    WHERE b.member_id = member_uuid
    ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insertion de données de test (optionnel)
-- INSERT INTO badges (bureau_id, name, first_name, phone, plate, serial_number, file_path, public_url, created_by)
-- VALUES (
--     (SELECT id FROM syndicate_bureaus LIMIT 1),
--     'Diallo',
--     'Mamadou',
--     '+221 77 123 45 67',
--     'GN-1234-A',
--     'TM-2024-001',
--     'badges/test_badge.pdf',
--     'https://example.com/badge.pdf',
--     'pdg'
-- );

-- Commentaires sur les colonnes
COMMENT ON TABLE badges IS 'Table des badges générés pour les conducteurs taxi-moto';
COMMENT ON COLUMN badges.bureau_id IS 'ID du bureau syndical';
COMMENT ON COLUMN badges.member_id IS 'ID du membre (optionnel)';
COMMENT ON COLUMN badges.file_path IS 'Chemin du fichier dans Supabase Storage';
COMMENT ON COLUMN badges.public_url IS 'URL publique du badge';
COMMENT ON COLUMN badges.serial_number IS 'Numéro de série unique du badge';
COMMENT ON COLUMN badges.gilet_number IS 'Numéro de gilet du conducteur';
COMMENT ON COLUMN badges.plate IS 'Numéro de plaque du véhicule';
