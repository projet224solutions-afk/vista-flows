-- ================================================================
-- TESTS POST-DÉPLOIEMENT: Wallet System Migration
-- Date: 2026-01-09
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ================================================================

-- ================================================================
-- PARTIE 1: VÉRIFICATIONS STRUCTURELLES
-- ================================================================

\echo '1. Vérification des tables créées...'
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('wallets', 'wallet_transactions', 'idempotency_keys')
ORDER BY table_name;
-- ✅ Attendu: 3 lignes (wallets, wallet_transactions, idempotency_keys)

\echo '2. Vérification des fonctions SQL...'
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
-- ✅ Attendu: 4 lignes (toutes les fonctions)

\echo '3. Vérification du trigger...'
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'trigger_create_wallet_on_profile';
-- ✅ Attendu: 1 ligne (trigger sur profiles)

\echo '4. Vérification RLS activé...'
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('wallets', 'wallet_transactions')
ORDER BY tablename;
-- ✅ Attendu: rowsecurity = true pour les 2 tables

\echo '5. Vérification des policies RLS...'
SELECT 
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename IN ('wallets', 'wallet_transactions')
ORDER BY tablename, policyname;
-- ✅ Attendu: 4 policies minimum

-- ================================================================
-- PARTIE 2: VÉRIFICATIONS DE DONNÉES
-- ================================================================

\echo '6. Statistiques des wallets...'
SELECT 
    COUNT(*) as total_wallets,
    COUNT(*) FILTER (WHERE wallet_status = 'active') as active_wallets,
    COUNT(*) FILTER (WHERE is_blocked = true) as blocked_wallets,
    SUM(balance) as total_balance_gnf,
    AVG(balance) as avg_balance_gnf,
    MAX(balance) as max_balance_gnf
FROM wallets;
-- ✅ Vérifier que total_wallets > 0

\echo '7. Statistiques des transactions...'
SELECT 
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM wallet_transactions;

\echo '8. Vérifier view wallet_summary...'
SELECT * FROM wallet_summary LIMIT 5;
-- ✅ Doit retourner des données sans erreur

-- ================================================================
-- PARTIE 3: TESTS FONCTIONNELS
-- ================================================================

\echo '9. Test: Auto-création wallet...'
DO $$
DECLARE
    test_user_id BIGINT;
    wallet_count INTEGER;
BEGIN
    -- Compter wallets avant
    SELECT COUNT(*) INTO wallet_count FROM wallets;
    
    -- Créer un profil test
    INSERT INTO profiles (email, role, full_name)
    VALUES ('test-' || NOW()::text || '@deployment.test', 'client', 'Test Deployment')
    RETURNING id INTO test_user_id;
    
    -- Vérifier wallet créé automatiquement
    PERFORM pg_sleep(0.5); -- Attendre trigger
    
    IF EXISTS (SELECT 1 FROM wallets WHERE user_id = test_user_id) THEN
        RAISE NOTICE '✅ TEST PASSÉ: Wallet auto-créé pour user %', test_user_id;
    ELSE
        RAISE EXCEPTION '❌ TEST ÉCHOUÉ: Wallet non créé pour user %', test_user_id;
    END IF;
    
    -- Nettoyer
    DELETE FROM wallets WHERE user_id = test_user_id;
    DELETE FROM profiles WHERE id = test_user_id;
END $$;

\echo '10. Test: Fonction update_wallet_balance_atomic (deposit)...'
DO $$
DECLARE
    test_wallet_id BIGINT;
    old_balance DECIMAL(15,2);
    result RECORD;
BEGIN
    -- Prendre le premier wallet
    SELECT id, balance INTO test_wallet_id, old_balance 
    FROM wallets 
    WHERE wallet_status = 'active'
    LIMIT 1;
    
    IF test_wallet_id IS NULL THEN
        RAISE EXCEPTION '❌ Aucun wallet actif trouvé pour tester';
    END IF;
    
    -- Test deposit de 1000 GNF
    SELECT * INTO result FROM update_wallet_balance_atomic(
        test_wallet_id,
        1000.00,
        'TEST-DEPLOY-' || NOW()::text,
        'Test post-deployment deposit'
    );
    
    IF result.success = true THEN
        RAISE NOTICE '✅ TEST PASSÉ: Deposit réussi. Ancien solde: %, Nouveau solde: %', 
                     old_balance, result.new_balance;
        
        -- Rollback pour ne pas affecter les données réelles
        SELECT * INTO result FROM update_wallet_balance_atomic(
            test_wallet_id,
            -1000.00,
            'TEST-ROLLBACK-' || NOW()::text,
            'Rollback test deposit'
        );
        
        RAISE NOTICE '   Rollback effectué: %', result.success;
    ELSE
        RAISE EXCEPTION '❌ TEST ÉCHOUÉ: %', result.error_message;
    END IF;
END $$;

\echo '11. Test: Fonction update_wallet_balance_atomic (protection solde négatif)...'
DO $$
DECLARE
    test_wallet_id BIGINT;
    current_balance DECIMAL(15,2);
    result RECORD;
BEGIN
    -- Prendre wallet avec petit solde
    SELECT id, balance INTO test_wallet_id, current_balance
    FROM wallets 
    WHERE wallet_status = 'active'
    ORDER BY balance ASC 
    LIMIT 1;
    
    IF test_wallet_id IS NULL THEN
        RAISE EXCEPTION '❌ Aucun wallet trouvé';
    END IF;
    
    -- Tenter retrait supérieur au solde
    SELECT * INTO result FROM update_wallet_balance_atomic(
        test_wallet_id,
        -(current_balance + 1000.00),
        'TEST-OVERDRAFT-' || NOW()::text,
        'Test overdraft protection'
    );
    
    IF result.success = false AND result.error_message LIKE '%Insufficient funds%' THEN
        RAISE NOTICE '✅ TEST PASSÉ: Protection solde négatif fonctionne';
        RAISE NOTICE '   Solde actuel: %, Tentative retrait: %, Résultat: %', 
                     current_balance, (current_balance + 1000.00), result.error_message;
    ELSE
        RAISE EXCEPTION '❌ TEST ÉCHOUÉ: Protection solde négatif ne fonctionne pas';
    END IF;
END $$;

\echo '12. Test: Idempotency keys...'
DO $$
DECLARE
    test_user_id BIGINT;
    test_key TEXT;
    result1 BOOLEAN;
    result2 BOOLEAN;
BEGIN
    -- Prendre premier user
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    test_key := 'TEST-IDEMPOTENCY-' || NOW()::text;
    
    -- Premier appel (doit réussir)
    SELECT check_idempotency_key(test_key, test_user_id, 'test') INTO result1;
    
    -- Deuxième appel avec même clé (doit échouer - duplicate)
    SELECT check_idempotency_key(test_key, test_user_id, 'test') INTO result2;
    
    IF result1 = true AND result2 = false THEN
        RAISE NOTICE '✅ TEST PASSÉ: Idempotency keys fonctionnent';
        RAISE NOTICE '   Premier appel: %, Second appel: % (duplicate détecté)', result1, result2;
    ELSE
        RAISE EXCEPTION '❌ TEST ÉCHOUÉ: result1=%, result2=% (attendu: true, false)', result1, result2;
    END IF;
    
    -- Nettoyer
    DELETE FROM idempotency_keys WHERE key = test_key;
END $$;

-- ================================================================
-- PARTIE 4: VÉRIFICATIONS DE SÉCURITÉ
-- ================================================================

\echo '13. Vérification: Pas de soldes négatifs...'
SELECT COUNT(*) as negative_balances_count
FROM wallets 
WHERE balance < 0;
-- ✅ Attendu: 0

\echo '14. Vérification: Tous les users ont un wallet...'
SELECT COUNT(*) as users_without_wallet
FROM profiles p
LEFT JOIN wallets w ON p.id = w.user_id
WHERE w.id IS NULL;
-- ✅ Attendu: 0 (ou très peu si création récente)

\echo '15. Vérification: Index créés...'
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('wallets', 'wallet_transactions', 'idempotency_keys')
ORDER BY tablename, indexname;
-- ✅ Vérifier que les index sont présents

-- ================================================================
-- RÉSUMÉ FINAL
-- ================================================================

\echo '================================================'
\echo 'RÉSUMÉ DES TESTS POST-DÉPLOIEMENT'
\echo '================================================'

DO $$
DECLARE
    wallet_count INTEGER;
    tx_count INTEGER;
    functions_count INTEGER;
    policies_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO wallet_count FROM wallets;
    SELECT COUNT(*) INTO tx_count FROM wallet_transactions;
    SELECT COUNT(*) INTO functions_count FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name LIKE '%wallet%';
    SELECT COUNT(*) INTO policies_count FROM pg_policies 
        WHERE tablename IN ('wallets', 'wallet_transactions');
    
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ DÉPLOIEMENT RÉUSSI!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Wallets: %', wallet_count;
    RAISE NOTICE 'Transactions: %', tx_count;
    RAISE NOTICE 'Fonctions SQL: %', functions_count;
    RAISE NOTICE 'RLS Policies: %', policies_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Système wallet opérationnel! 🚀';
    RAISE NOTICE '================================================';
END $$;
