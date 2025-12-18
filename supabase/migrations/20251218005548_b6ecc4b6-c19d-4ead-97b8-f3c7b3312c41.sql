-- Supprimer les politiques RLS de la table cinetpay_payments
DROP POLICY IF EXISTS "Users can view own cinetpay payments" ON public.cinetpay_payments;
DROP POLICY IF EXISTS "Users can insert own cinetpay payments" ON public.cinetpay_payments;
DROP POLICY IF EXISTS "Users can update own cinetpay payments" ON public.cinetpay_payments;
DROP POLICY IF EXISTS "Admins can view all cinetpay payments" ON public.cinetpay_payments;

-- Supprimer les index
DROP INDEX IF EXISTS idx_cinetpay_payments_user_id;
DROP INDEX IF EXISTS idx_cinetpay_payments_transaction_id;
DROP INDEX IF EXISTS idx_cinetpay_payments_status;

-- Supprimer la table cinetpay_payments
DROP TABLE IF EXISTS public.cinetpay_payments;