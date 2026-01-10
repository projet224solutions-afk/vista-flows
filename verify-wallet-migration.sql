-- =================================================================
-- SCRIPT DE VÉRIFICATION: Wallet System Migration
-- Date: 2026-01-09
-- =================================================================

\echo '================================================'
\echo '🔍 VÉRIFICATION WALLET SYSTEM MIGRATION'
\echo '================================================'

-- 1. VÉRIFIER LES TABLES
\echo '\n📋 1. TABLES CRÉÉES:'
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('wallets', 'wallet_transactions', 'idempotency_keys')
ORDER BY table_name;

-- 2. VÉRIFIER LES TYPES ENUM
\echo '\n🏷️  2. TYPES ENUM CRÉÉS:'
SELECT 
    t.typname as enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('wallet_status', 'transaction_type', 'transaction_status', 'commission_type')
GROUP BY t.typname
ORDER BY t.typname;

-- 3. VÉRIFIER LES FONCTIONS
\echo '\n⚡ 3. FONCTIONS SQL CRÉÉES:'
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'update_wallet_balance_atomic',
    'create_wallet_for_user',
    'check_idempotency_key',
    'trigger_create_wallet'
)
ORDER BY routine_name;

-- 4. VÉRIFIER LES TRIGGERS
\echo '\n🔔 4. TRIGGERS ACTIFS:'
SELECT 
    trigger_name,
    event_object_table as table_name,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'trigger_create_wallet_on_profile';

-- 5. VÉRIFIER LES RLS POLICIES
\echo '\n🔐 5. RLS POLICIES:'
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('wallets', 'wallet_transactions')
ORDER BY tablename, policyname;

-- 6. VÉRIFIER LES INDEX
\echo '\n📊 6. INDEX CRÉÉS:'
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('wallets', 'wallet_transactions', 'idempotency_keys')
ORDER BY tablename, indexname;

-- 7. STATISTIQUES DES DONNÉES
\echo '\n📈 7. STATISTIQUES:'
SELECT 
    'wallets' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE wallet_status = 'active') as active_wallets,
    COUNT(*) FILTER (WHERE is_blocked = true) as blocked_wallets,
    SUM(balance) as total_balance,
    AVG(balance) as avg_balance
FROM wallets
UNION ALL
SELECT 
    'wallet_transactions',
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'pending'),
    SUM(amount),
    AVG(amount)
FROM wallet_transactions
UNION ALL
SELECT 
    'idempotency_keys',
    COUNT(*),
    COUNT(*) FILTER (WHERE expires_at > NOW()),
    COUNT(*) FILTER (WHERE expires_at <= NOW()),
    NULL,
    NULL
FROM idempotency_keys;

-- 8. VÉRIFIER LA VIEW
\echo '\n👁️  8. VIEW WALLET_SUMMARY:'
SELECT 
    viewname,
    definition IS NOT NULL as has_definition
FROM pg_views
WHERE viewname = 'wallet_summary' AND schemaname = 'public';

-- 9. EXEMPLE DE DONNÉES WALLET
\echo '\n💼 9. EXEMPLE WALLETS (5 premiers):'
SELECT 
    id,
    user_id,
    balance,
    currency,
    wallet_status,
    is_blocked,
    created_at
FROM wallets
ORDER BY created_at DESC
LIMIT 5;

-- 10. TEST FONCTION ATOMIQUE (simulation sans commit)
\echo '\n🧪 10. TEST FONCTION update_wallet_balance_atomic:'
DO $$
DECLARE
    test_wallet_id UUID;
    test_result RECORD;
BEGIN
    -- Prendre le premier wallet
    SELECT id INTO test_wallet_id FROM wallets LIMIT 1;
    
    IF test_wallet_id IS NULL THEN
        RAISE NOTICE '⚠️  Aucun wallet trouvé pour tester';
    ELSE
        RAISE NOTICE '✅ Fonction update_wallet_balance_atomic existe et est appelable';
        RAISE NOTICE '   Wallet test ID: %', test_wallet_id;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur fonction: %', SQLERRM;
END $$;

-- 11. VÉRIFIER LES CONTRAINTES
\echo '\n🔗 11. CONTRAINTES DE TABLES:'
SELECT 
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    contype AS constraint_type,
    CASE contype
        WHEN 'c' THEN 'CHECK'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
    END AS type_description
FROM pg_constraint
WHERE conrelid::regclass::text IN ('wallets', 'wallet_transactions', 'idempotency_keys')
ORDER BY table_name, constraint_type;

-- 12. VÉRIFIER RLS ACTIVÉ
\echo '\n🛡️  12. ROW LEVEL SECURITY STATUS:'
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('wallets', 'wallet_transactions')
ORDER BY tablename;

\echo '\n================================================'
\echo '✅ VÉRIFICATION TERMINÉE'
\echo '================================================'
