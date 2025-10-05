-- =====================================================
-- FONCTIONS AVANCÉES DE TRANSFERT MULTI-DEVISES
-- =====================================================
-- Date: 2 janvier 2025
-- Description: Fonctions SQL pour les transferts multi-devises avancés avec contrôle PDG
-- Compatible avec le système existant 224SOLUTIONS

-- =====================================================
-- 1. FONCTION PRINCIPALE DE TRANSFERT AVANCÉ
-- =====================================================

CREATE OR REPLACE FUNCTION perform_advanced_multi_currency_transfer(
    p_sender_id UUID,
    p_receiver_email TEXT DEFAULT NULL,
    p_receiver_user_id UUID DEFAULT NULL,
    p_amount DECIMAL(15, 2),
    p_currency_sent VARCHAR(3),
    p_currency_received VARCHAR(3) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_reference TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    sender_wallet_id UUID;
    receiver_user_id UUID;
    receiver_wallet_id UUID;
    sender_balance DECIMAL(15, 2);
    sender_role VARCHAR;
    transfer_fees JSONB;
    exchange_rate_val DECIMAL(20, 8);
    amount_to_receive DECIMAL(15, 2);
    final_amount_to_debit DECIMAL(15, 2);
    transfer_record_id UUID;
    current_daily_transferred DECIMAL(15, 2);
    current_monthly_transferred DECIMAL(15, 2);
    daily_limit DECIMAL(15, 2);
    monthly_limit DECIMAL(15, 2);
    receiver_wallet_currency_id UUID;
    sender_wallet_currency_id UUID;
    internal_fees DECIMAL(15, 2);
    api_commission DECIMAL(15, 2);
    total_fees DECIMAL(15, 2);
    platform_gain DECIMAL(15, 2);
BEGIN
    -- 1. Vérifier et obtenir les IDs des wallets et des utilisateurs
    SELECT id, balance, currency_id, daily_transfer_limit, monthly_transfer_limit, daily_transferred_amount, monthly_transferred_amount
    INTO sender_wallet_id, sender_balance, sender_wallet_currency_id, daily_limit, monthly_limit, current_daily_transferred, current_monthly_transferred
    FROM wallets
    WHERE user_id = p_sender_id AND currency = p_currency_sent;

    IF sender_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Portefeuille de l''expéditeur non trouvé pour la devise %', p_currency_sent;
    END IF;

    -- Déterminer l'ID du destinataire
    IF p_receiver_user_id IS NOT NULL THEN
        receiver_user_id := p_receiver_user_id;
    ELSIF p_receiver_email IS NOT NULL THEN
        SELECT id INTO receiver_user_id FROM public.users WHERE email = p_receiver_email;
        
        IF receiver_user_id IS NULL THEN
            RAISE EXCEPTION 'Utilisateur destinataire non trouvé avec l''email %', p_receiver_email;
        END IF;
    ELSE
        RAISE EXCEPTION 'Email ou ID du destinataire requis';
    END IF;

    -- Déterminer la devise de réception
    p_currency_received := COALESCE(p_currency_received, p_currency_sent);

    -- Vérifier si le destinataire a un wallet pour cette devise
    SELECT id, currency_id INTO receiver_wallet_id, receiver_wallet_currency_id
    FROM wallets
    WHERE user_id = receiver_user_id AND currency = p_currency_received;

    -- Si le portefeuille du destinataire n'existe pas pour cette devise, le créer
    IF receiver_wallet_id IS NULL THEN
        INSERT INTO wallets (user_id, balance, currency, currency_id, status, wallet_address)
        VALUES (receiver_user_id, 0.00, p_currency_received, 
                (SELECT id FROM global_currencies WHERE code = p_currency_received), 
                'active', uuid_generate_v4())
        RETURNING id INTO receiver_wallet_id;
    END IF;

    -- 2. Obtenir le rôle de l'expéditeur pour les frais
    SELECT role INTO sender_role FROM public.users WHERE id = p_sender_id;
    sender_role := COALESCE(sender_role, 'client');

    -- 3. Calculer les frais avancés
    transfer_fees := calculate_advanced_fees(p_amount, p_currency_sent);
    internal_fees := (transfer_fees->>'internal_fees')::DECIMAL(15, 2);
    api_commission := (transfer_fees->>'api_commission')::DECIMAL(15, 2);
    total_fees := (transfer_fees->>'total_fees')::DECIMAL(15, 2);
    platform_gain := (transfer_fees->>'platform_gain')::DECIMAL(15, 2);
    final_amount_to_debit := (transfer_fees->>'total_charged')::DECIMAL(15, 2);

    -- 4. Vérifier le solde de l'expéditeur
    IF sender_balance < final_amount_to_debit THEN
        RAISE EXCEPTION 'Solde insuffisant. Solde actuel: %, Montant à débiter: %', sender_balance, final_amount_to_debit;
    END IF;

    -- 5. Vérifier les limites de transfert
    IF (current_daily_transferred + final_amount_to_debit) > daily_limit THEN
        RAISE EXCEPTION 'Limite de transfert quotidienne dépassée. Restant: %', (daily_limit - current_daily_transferred);
    END IF;

    IF (current_monthly_transferred + final_amount_to_debit) > monthly_limit THEN
        RAISE EXCEPTION 'Limite de transfert mensuelle dépassée. Restant: %', (monthly_limit - current_monthly_transferred);
    END IF;

    -- 6. Obtenir le taux de change et calculer le montant à recevoir
    exchange_rate_val := get_current_exchange_rate(p_currency_sent, p_currency_received);
    amount_to_receive := p_amount * exchange_rate_val;

    -- 7. Enregistrer le transfert comme 'pending'
    INSERT INTO advanced_multi_currency_transfers (
        sender_id, receiver_id, amount_sent, currency_sent,
        amount_received, currency_received, exchange_rate, 
        internal_fees, api_commission, total_fees, platform_gain,
        status, description, reference
    )
    VALUES (
        p_sender_id, receiver_user_id, p_amount, p_currency_sent,
        amount_to_receive, p_currency_received, exchange_rate_val,
        internal_fees, api_commission, total_fees, platform_gain,
        'pending', p_description, COALESCE(p_reference, 'TXN-' || gen_random_uuid())
    )
    RETURNING id INTO transfer_record_id;

    -- 8. Débiter l'expéditeur
    UPDATE wallets
    SET
        balance = balance - final_amount_to_debit,
        daily_transferred_amount = daily_transferred_amount + final_amount_to_debit,
        monthly_transferred_amount = monthly_transferred_amount + final_amount_to_debit,
        updated_at = NOW()
    WHERE id = sender_wallet_id;

    -- 9. Créditer le destinataire
    UPDATE wallets
    SET
        balance = balance + amount_to_receive,
        updated_at = NOW()
    WHERE id = receiver_wallet_id;

    -- 10. Mettre à jour le statut du transfert à 'completed'
    UPDATE advanced_multi_currency_transfers
    SET status = 'completed', updated_at = NOW()
    WHERE id = transfer_record_id;

    -- 11. Enregistrer dans les logs d'audit
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (p_sender_id, 'advanced_wallet_transfer_sent', 'advanced_multi_currency_transfer', transfer_record_id,
            jsonb_build_object('sender_id', p_sender_id, 'receiver_id', receiver_user_id,
                               'amount_sent', p_amount, 'currency_sent', p_currency_sent,
                               'amount_received', amount_to_receive, 'currency_received', p_currency_received,
                               'exchange_rate', exchange_rate_val, 'total_fees', total_fees,
                               'platform_gain', platform_gain, 'status', 'completed'));

    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (receiver_user_id, 'advanced_wallet_transfer_received', 'advanced_multi_currency_transfer', transfer_record_id,
            jsonb_build_object('sender_id', p_sender_id, 'receiver_id', receiver_user_id,
                               'amount_received', amount_to_receive, 'currency_received', p_currency_received,
                               'exchange_rate', exchange_rate_val, 'status', 'completed'));

    -- 12. Mettre à jour les statistiques
    INSERT INTO transaction_statistics (date, currency, total_transactions, total_volume, total_fees, platform_revenue)
    VALUES (CURRENT_DATE, p_currency_sent, 1, p_amount, total_fees, platform_gain)
    ON CONFLICT (date, currency) DO UPDATE SET
        total_transactions = transaction_statistics.total_transactions + 1,
        total_volume = transaction_statistics.total_volume + p_amount,
        total_fees = transaction_statistics.total_fees + total_fees,
        platform_revenue = transaction_statistics.platform_revenue + platform_gain,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', TRUE,
        'transfer_id', transfer_record_id,
        'amount_sent', p_amount,
        'currency_sent', p_currency_sent,
        'amount_received', amount_to_receive,
        'currency_received', p_currency_received,
        'exchange_rate', exchange_rate_val,
        'internal_fees', internal_fees,
        'api_commission', api_commission,
        'total_fees', total_fees,
        'total_charged', final_amount_to_debit,
        'platform_gain', platform_gain,
        'new_sender_balance', sender_balance - final_amount_to_debit
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Enregistrer l'erreur dans les logs d'audit
        INSERT INTO audit_logs (user_id, action, entity_type, new_value)
        VALUES (p_sender_id, 'advanced_wallet_transfer_failed', 'advanced_multi_currency_transfer',
                jsonb_build_object('sender_id', p_sender_id, 'receiver_email', p_receiver_email,
                                  'receiver_user_id', p_receiver_user_id, 'amount', p_amount, 
                                  'currency_sent', p_currency_sent, 'currency_received', p_currency_received,
                                  'error', SQLERRM));

        RETURN jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. FONCTION POUR CRÉER LA TABLE DES TRANSFERTS AVANCÉS
-- =====================================================

CREATE TABLE IF NOT EXISTS advanced_multi_currency_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_sent DECIMAL(15, 2) NOT NULL,
    currency_sent VARCHAR(3) NOT NULL REFERENCES global_currencies(code),
    amount_received DECIMAL(15, 2) NOT NULL,
    currency_received VARCHAR(3) NOT NULL REFERENCES global_currencies(code),
    exchange_rate DECIMAL(20, 8) NOT NULL,
    internal_fees DECIMAL(15, 2) DEFAULT 0.00,
    api_commission DECIMAL(15, 2) DEFAULT 0.00,
    total_fees DECIMAL(15, 2) DEFAULT 0.00,
    platform_gain DECIMAL(15, 2) DEFAULT 0.00,
    status transaction_status DEFAULT 'pending',
    description TEXT,
    reference VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. FONCTION POUR OBTENIR L'HISTORIQUE DES TRANSFERTS
-- =====================================================

CREATE OR REPLACE FUNCTION get_advanced_transfer_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    amount_sent DECIMAL(15, 2),
    currency_sent VARCHAR(3),
    amount_received DECIMAL(15, 2),
    currency_received VARCHAR(3),
    exchange_rate DECIMAL(20, 8),
    total_fees DECIMAL(15, 2),
    status transaction_status,
    description TEXT,
    reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        amct.id,
        amct.amount_sent,
        amct.currency_sent,
        amct.amount_received,
        amct.currency_received,
        amct.exchange_rate,
        amct.total_fees,
        amct.status,
        amct.description,
        amct.reference,
        amct.created_at
    FROM advanced_multi_currency_transfers amct
    WHERE amct.sender_id = p_user_id
    ORDER BY amct.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FONCTION POUR OBTENIR LES STATISTIQUES DE TRANSFERT
-- =====================================================

CREATE OR REPLACE FUNCTION get_advanced_transfer_statistics(
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    total_transfers INTEGER;
    total_volume DECIMAL(15, 2);
    total_fees DECIMAL(15, 2);
    most_used_currency VARCHAR(3);
    average_transfer_amount DECIMAL(15, 2);
    currency_counts JSONB;
BEGIN
    -- Compter le total des transferts
    SELECT COUNT(*), COALESCE(SUM(amount_sent), 0), COALESCE(SUM(total_fees)
    INTO total_transfers, total_volume, total_fees
    FROM advanced_multi_currency_transfers
    WHERE sender_id = p_user_id AND status = 'completed';

    -- Calculer la moyenne
    average_transfer_amount := CASE 
        WHEN total_transfers > 0 THEN total_volume / total_transfers 
        ELSE 0 
    END;

    -- Trouver la devise la plus utilisée
    SELECT currency_sent INTO most_used_currency
    FROM advanced_multi_currency_transfers
    WHERE sender_id = p_user_id AND status = 'completed'
    GROUP BY currency_sent
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- Obtenir les comptages par devise
    SELECT jsonb_object_agg(currency_sent, count)
    INTO currency_counts
    FROM (
        SELECT currency_sent, COUNT(*) as count
        FROM advanced_multi_currency_transfers
        WHERE sender_id = p_user_id AND status = 'completed'
        GROUP BY currency_sent
    ) currency_stats;

    RETURN jsonb_build_object(
        'total_transfers', total_transfers,
        'total_volume', total_volume,
        'total_fees', total_fees,
        'most_used_currency', COALESCE(most_used_currency, 'GNF'),
        'average_transfer_amount', average_transfer_amount,
        'currency_counts', COALESCE(currency_counts, '{}'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FONCTION POUR RÉINITIALISER LES LIMITES QUOTIDIENNES/MENSUELLES
-- =====================================================

CREATE OR REPLACE FUNCTION reset_advanced_transfer_limits()
RETURNS VOID AS $$
BEGIN
    -- Réinitialiser les montants transférés quotidiens
    UPDATE wallets
    SET daily_transferred_amount = 0.00
    WHERE updated_at < (NOW() - INTERVAL '24 hours');

    -- Réinitialiser les montants transférés mensuels
    UPDATE wallets
    SET monthly_transferred_amount = 0.00
    WHERE updated_at < (NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_advanced_multi_currency_transfers_sender 
ON advanced_multi_currency_transfers(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_advanced_multi_currency_transfers_receiver 
ON advanced_multi_currency_transfers(receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_advanced_multi_currency_transfers_status 
ON advanced_multi_currency_transfers(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_advanced_multi_currency_transfers_currency 
ON advanced_multi_currency_transfers(currency_sent, currency_received);

-- =====================================================
-- 7. RLS (Row Level Security)
-- =====================================================

ALTER TABLE advanced_multi_currency_transfers ENABLE ROW LEVEL SECURITY;

-- Politique pour les expéditeurs
CREATE POLICY "advanced_transfers_sender_policy" ON advanced_multi_currency_transfers
    FOR ALL USING (auth.uid() = sender_id);

-- Politique pour les destinataires
CREATE POLICY "advanced_transfers_receiver_policy" ON advanced_multi_currency_transfers
    FOR SELECT USING (auth.uid() = receiver_id);

-- Politique pour les admins/PDG
CREATE POLICY "advanced_transfers_admin_policy" ON advanced_multi_currency_transfers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'pdg')
        )
    );

-- =====================================================
-- 8. TRIGGER POUR MAINTENANCE AUTOMATIQUE
-- =====================================================

CREATE TRIGGER update_advanced_multi_currency_transfers_updated_at
    BEFORE UPDATE ON advanced_multi_currency_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE advanced_multi_currency_transfers IS 'Transferts multi-devises avancés avec contrôle PDG';
COMMENT ON FUNCTION perform_advanced_multi_currency_transfer IS 'Fonction principale pour les transferts multi-devises avancés';
COMMENT ON FUNCTION get_advanced_transfer_history IS 'Récupère l''historique des transferts avancés';
COMMENT ON FUNCTION get_advanced_transfer_statistics IS 'Calcule les statistiques des transferts avancés';
COMMENT ON FUNCTION reset_advanced_transfer_limits IS 'Réinitialise les limites de transfert quotidiennes/mensuelles';

COMMENT ON COLUMN advanced_multi_currency_transfers.internal_fees IS 'Frais internes de la plateforme';
COMMENT ON COLUMN advanced_multi_currency_transfers.api_commission IS 'Commission de l''API externe';
COMMENT ON COLUMN advanced_multi_currency_transfers.platform_gain IS 'Gain total de la plateforme';
COMMENT ON COLUMN advanced_multi_currency_transfers.exchange_rate IS 'Taux de change appliqué (précis à 8 décimales)';
