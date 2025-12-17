-- Table pour stocker les paiements CinetPay
CREATE TABLE IF NOT EXISTS public.cinetpay_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id TEXT NOT NULL UNIQUE,
    payment_token TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'GNF',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    description TEXT,
    payment_method TEXT,
    operator_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_cinetpay_payments_user_id ON public.cinetpay_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_cinetpay_payments_transaction_id ON public.cinetpay_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cinetpay_payments_status ON public.cinetpay_payments(status);

-- RLS
ALTER TABLE public.cinetpay_payments ENABLE ROW LEVEL SECURITY;

-- Politique: les utilisateurs peuvent voir leurs propres paiements
CREATE POLICY "Users can view own cinetpay payments"
ON public.cinetpay_payments
FOR SELECT
USING (auth.uid() = user_id);

-- Politique: les utilisateurs peuvent créer leurs propres paiements
CREATE POLICY "Users can insert own cinetpay payments"
ON public.cinetpay_payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique: les utilisateurs peuvent mettre à jour leurs propres paiements
CREATE POLICY "Users can update own cinetpay payments"
ON public.cinetpay_payments
FOR UPDATE
USING (auth.uid() = user_id);

-- Politique: les admins peuvent tout voir
CREATE POLICY "Admins can view all cinetpay payments"
ON public.cinetpay_payments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Fonction pour créditer le wallet (si elle n'existe pas)
CREATE OR REPLACE FUNCTION public.credit_wallet(
    p_user_id UUID,
    p_amount NUMERIC,
    p_description TEXT DEFAULT '',
    p_transaction_type TEXT DEFAULT 'deposit'
)
RETURNS VOID AS $$
BEGIN
    -- Mettre à jour le solde du wallet
    UPDATE wallets 
    SET balance = balance + p_amount, 
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Créer un wallet s'il n'existe pas
    IF NOT FOUND THEN
        INSERT INTO wallets (user_id, balance, currency)
        VALUES (p_user_id, p_amount, 'GNF');
    END IF;
    
    -- Enregistrer la transaction
    INSERT INTO wallet_transactions (
        sender_wallet_id,
        receiver_wallet_id,
        amount,
        fee,
        net_amount,
        currency,
        transaction_type,
        description,
        status
    )
    SELECT 
        w.id,
        w.id,
        p_amount,
        0,
        p_amount,
        'GNF',
        p_transaction_type,
        p_description,
        'completed'
    FROM wallets w
    WHERE w.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;