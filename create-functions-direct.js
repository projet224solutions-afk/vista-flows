/**
 * 🔧 CRÉATION DIRECTE DES FONCTIONS SUPABASE
 * 
 * Ce script utilise l'API SQL de Supabase pour créer les fonctions
 * directement dans la base de données.
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuration Supabase
const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 CRÉATION DIRECTE DES FONCTIONS SUPABASE');
console.log('='.repeat(60));
console.log(`📅 Date: ${new Date().toLocaleString()}`);
console.log('='.repeat(60));

// ===================================================
// FONCTIONS SQL À CRÉER
// ===================================================

const functions = [
    {
        name: 'generate_custom_id',
        sql: `CREATE OR REPLACE FUNCTION generate_custom_id() RETURNS TEXT AS $$
DECLARE
    v_letters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    v_numbers TEXT := '0123456789';
    v_result TEXT := '';
    v_i INTEGER;
BEGIN
    -- Générer 3 lettres aléatoires
    FOR v_i IN 1..3 LOOP
        v_result := v_result || substr(v_letters, floor(random() * length(v_letters) + 1)::integer, 1);
    END LOOP;
    
    -- Générer 4 chiffres aléatoires
    FOR v_i IN 1..4 LOOP
        v_result := v_result || substr(v_numbers, floor(random() * length(v_numbers) + 1)::integer, 1);
    END LOOP;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;`
    },
    {
        name: 'create_user_complete',
        sql: `CREATE OR REPLACE FUNCTION create_user_complete(
    p_email TEXT,
    p_full_name TEXT,
    p_phone TEXT,
    p_role TEXT DEFAULT 'client',
    p_location TEXT DEFAULT 'Conakry, Guinée'
) RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_wallet_id UUID;
    v_custom_id TEXT;
    v_result JSON;
BEGIN
    -- Générer un ID personnalisé (3 lettres + 4 chiffres)
    v_custom_id := generate_custom_id();
    
    -- Créer le profil utilisateur
    INSERT INTO profiles (email, full_name, phone, role, location, custom_id)
    VALUES (p_email, p_full_name, p_phone, p_role, p_location, v_custom_id)
    RETURNING id INTO v_user_id;
    
    -- Créer le wallet automatiquement
    INSERT INTO wallets (user_id, balance, currency, status)
    VALUES (v_user_id, 0, 'GNF', 'active')
    RETURNING id INTO v_wallet_id;
    
    -- Créer l'ID personnalisé
    INSERT INTO user_ids (user_id, custom_id, created_at)
    VALUES (v_user_id, v_custom_id, NOW());
    
    -- Créer le rôle utilisateur
    INSERT INTO user_roles (user_id, role, is_active)
    VALUES (v_user_id, p_role, true);
    
    -- Retourner le résultat
    v_result := json_build_object(
        'user_id', v_user_id,
        'wallet_id', v_wallet_id,
        'custom_id', v_custom_id,
        'status', 'created'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;`
    },
    {
        name: 'get_user_complete',
        sql: `CREATE OR REPLACE FUNCTION get_user_complete(p_user_id UUID) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'user', row_to_json(p.*),
        'wallet', row_to_json(w.*),
        'custom_id', ui.custom_id,
        'roles', array_agg(ur.role)
    )
    INTO v_result
    FROM profiles p
    LEFT JOIN wallets w ON p.id = w.user_id
    LEFT JOIN user_ids ui ON p.id = ui.user_id
    LEFT JOIN user_roles ur ON p.id = ur.user_id
    WHERE p.id = p_user_id
    GROUP BY p.id, w.id, ui.custom_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;`
    },
    {
        name: 'process_transaction',
        sql: `CREATE OR REPLACE FUNCTION process_transaction(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_amount DECIMAL,
    p_transaction_type TEXT,
    p_description TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_from_wallet_id UUID;
    v_to_wallet_id UUID;
    v_from_balance DECIMAL;
    v_to_balance DECIMAL;
    v_transaction_id UUID;
    v_result JSON;
BEGIN
    -- Vérifier que l'utilisateur source a un wallet
    SELECT id, balance INTO v_from_wallet_id, v_from_balance
    FROM wallets
    WHERE user_id = p_from_user_id AND status = 'active';
    
    IF v_from_wallet_id IS NULL THEN
        RETURN json_build_object('error', 'Wallet source non trouvé');
    END IF;
    
    -- Vérifier que l'utilisateur destinataire a un wallet
    SELECT id, balance INTO v_to_wallet_id, v_to_balance
    FROM wallets
    WHERE user_id = p_to_user_id AND status = 'active';
    
    IF v_to_wallet_id IS NULL THEN
        RETURN json_build_object('error', 'Wallet destinataire non trouvé');
    END IF;
    
    -- Vérifier le solde suffisant
    IF v_from_balance < p_amount THEN
        RETURN json_build_object('error', 'Solde insuffisant');
    END IF;
    
    -- Effectuer la transaction
    BEGIN
        -- Débiter le wallet source
        UPDATE wallets 
        SET balance = balance - p_amount,
            updated_at = NOW()
        WHERE id = v_from_wallet_id;
        
        -- Créditer le wallet destinataire
        UPDATE wallets 
        SET balance = balance + p_amount,
            updated_at = NOW()
        WHERE id = v_to_wallet_id;
        
        -- Enregistrer la transaction
        INSERT INTO wallet_transactions (
            from_wallet_id, to_wallet_id, amount, transaction_type, description, status
        ) VALUES (
            v_from_wallet_id, v_to_wallet_id, p_amount, p_transaction_type, p_description, 'completed'
        ) RETURNING id INTO v_transaction_id;
        
        -- Retourner le succès
        v_result := json_build_object(
            'transaction_id', v_transaction_id,
            'status', 'success',
            'amount', p_amount,
            'from_balance', v_from_balance - p_amount,
            'to_balance', v_to_balance + p_amount
        );
        
        RETURN v_result;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN json_build_object('error', 'Erreur lors de la transaction: ' || SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql;`
    },
    {
        name: 'get_wallet_balance',
        sql: `CREATE OR REPLACE FUNCTION get_wallet_balance(p_user_id UUID) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'user_id', p_user_id,
        'balance', w.balance,
        'currency', w.currency,
        'status', w.status,
        'last_transaction', (
            SELECT json_build_object(
                'date', wt.created_at,
                'amount', wt.amount,
                'type', wt.transaction_type
            )
            FROM wallet_transactions wt
            WHERE wt.from_wallet_id = w.id OR wt.to_wallet_id = w.id
            ORDER BY wt.created_at DESC
            LIMIT 1
        )
    )
    INTO v_result
    FROM wallets w
    WHERE w.user_id = p_user_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;`
    },
    {
        name: 'create_order',
        sql: `CREATE OR REPLACE FUNCTION create_order(
    p_customer_id UUID,
    p_vendor_id UUID,
    p_items JSON,
    p_delivery_address TEXT,
    p_delivery_city TEXT DEFAULT 'Conakry',
    p_delivery_country TEXT DEFAULT 'Guinée'
) RETURNS JSON AS $$
DECLARE
    v_order_id UUID;
    v_total_amount DECIMAL := 0;
    v_item JSON;
    v_result JSON;
BEGIN
    -- Calculer le montant total
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        v_total_amount := v_total_amount + (v_item->>'price')::DECIMAL * (v_item->>'quantity')::INTEGER;
    END LOOP;
    
    -- Créer la commande
    INSERT INTO orders (
        customer_id, vendor_id, total_amount, status, 
        delivery_address, delivery_city, delivery_country
    ) VALUES (
        p_customer_id, p_vendor_id, v_total_amount, 'pending',
        p_delivery_address, p_delivery_city, p_delivery_country
    ) RETURNING id INTO v_order_id;
    
    -- Créer les items de commande
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        INSERT INTO order_items (
            order_id, product_id, quantity, price, total_price
        ) VALUES (
            v_order_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'price')::DECIMAL,
            (v_item->>'price')::DECIMAL * (v_item->>'quantity')::INTEGER
        );
    END LOOP;
    
    v_result := json_build_object(
        'order_id', v_order_id,
        'total_amount', v_total_amount,
        'status', 'created',
        'items_count', json_array_length(p_items)
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;`
    },
    {
        name: 'update_order_status',
        sql: `CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id UUID,
    p_status TEXT
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    UPDATE orders 
    SET status = p_status, updated_at = NOW()
    WHERE id = p_order_id;
    
    IF FOUND THEN
        v_result := json_build_object(
            'order_id', p_order_id,
            'status', p_status,
            'updated_at', NOW()
        );
    ELSE
        v_result := json_build_object('error', 'Commande non trouvée');
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;`
    },
    {
        name: 'log_security_incident',
        sql: `CREATE OR REPLACE FUNCTION log_security_incident(
    p_incident_type TEXT,
    p_severity TEXT,
    p_description TEXT,
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_incident_id UUID;
    v_result JSON;
BEGIN
    INSERT INTO security_incidents (
        incident_type, severity, description, user_id, ip_address, created_at
    ) VALUES (
        p_incident_type, p_severity, p_description, p_user_id, p_ip_address, NOW()
    ) RETURNING id INTO v_incident_id;
    
    v_result := json_build_object(
        'incident_id', v_incident_id,
        'status', 'logged',
        'created_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;`
    },
    {
        name: 'block_ip_address',
        sql: `CREATE OR REPLACE FUNCTION block_ip_address(
    p_ip_address INET,
    p_reason TEXT,
    p_duration_hours INTEGER DEFAULT 24
) RETURNS JSON AS $$
DECLARE
    v_block_id UUID;
    v_result JSON;
BEGIN
    INSERT INTO blocked_ips (
        ip_address, reason, blocked_until, created_at
    ) VALUES (
        p_ip_address, p_reason, NOW() + (p_duration_hours || ' hours')::INTERVAL, NOW()
    ) RETURNING id INTO v_block_id;
    
    v_result := json_build_object(
        'block_id', v_block_id,
        'ip_address', p_ip_address,
        'blocked_until', NOW() + (p_duration_hours || ' hours')::INTERVAL,
        'status', 'blocked'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;`
    },
    {
        name: 'clean_demo_data',
        sql: `CREATE OR REPLACE FUNCTION clean_demo_data() RETURNS JSON AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_result JSON;
BEGIN
    -- Supprimer les données de démonstration
    DELETE FROM profiles WHERE email LIKE '%@demo.%' OR email LIKE '%@test.%';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Supprimer les commandes orphelines
    DELETE FROM orders WHERE customer_id NOT IN (SELECT id FROM profiles);
    v_deleted_count := v_deleted_count + ROW_COUNT;
    
    -- Supprimer les wallets orphelins
    DELETE FROM wallets WHERE user_id NOT IN (SELECT id FROM profiles);
    v_deleted_count := v_deleted_count + ROW_COUNT;
    
    v_result := json_build_object(
        'deleted_records', v_deleted_count,
        'status', 'cleaned',
        'timestamp', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;`
    },
    {
        name: 'update_locations_to_guinea',
        sql: `CREATE OR REPLACE FUNCTION update_locations_to_guinea() RETURNS JSON AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_result JSON;
BEGIN
    -- Mettre à jour les localisations
    UPDATE profiles 
    SET location = 'Conakry, Guinée'
    WHERE location ILIKE '%dakar%' OR location ILIKE '%sénégal%' OR location ILIKE '%senegal%';
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    UPDATE orders 
    SET delivery_city = 'Conakry', delivery_country = 'Guinée'
    WHERE delivery_city ILIKE '%dakar%' OR delivery_country ILIKE '%sénégal%' OR delivery_country ILIKE '%senegal%';
    v_updated_count := v_updated_count + ROW_COUNT;
    
    v_result := json_build_object(
        'updated_records', v_updated_count,
        'status', 'updated',
        'timestamp', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;`
    }
];

// ===================================================
// EXÉCUTION DES FONCTIONS VIA API SQL
// ===================================================

async function executeSQL(sql) {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey
            },
            body: JSON.stringify({ sql })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`Erreur API: ${error.message}`);
    }
}

async function createSupabaseFunctions() {
    console.log('\n🚀 CRÉATION DES FONCTIONS SUPABASE');
    console.log('='.repeat(60));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const func of functions) {
        try {
            console.log(`\n🔧 Création: ${func.name}`);
            
            const result = await executeSQL(func.sql);
            
            if (result.error) {
                console.log(`❌ Erreur ${func.name}: ${result.error}`);
                errorCount++;
            } else {
                console.log(`✅ ${func.name}: Créé avec succès`);
                successCount++;
            }
        } catch (err) {
            console.log(`❌ Exception ${func.name}: ${err.message}`);
            errorCount++;
        }
    }
    
    console.log('\n📊 RÉSUMÉ DE LA CRÉATION');
    console.log('='.repeat(60));
    console.log(`✅ Fonctions créées: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📊 Total: ${functions.length}`);
    
    return { successCount, errorCount };
}

// ===================================================
// VÉRIFICATION DES FONCTIONS
// ===================================================

async function verifyFunctions() {
    console.log('\n🔍 VÉRIFICATION DES FONCTIONS');
    console.log('-'.repeat(50));
    
    try {
        // Tester la fonction generate_custom_id
        const { data: customId, error: customIdError } = await supabase.rpc('generate_custom_id');
        if (customIdError) {
            console.log(`❌ generate_custom_id: ${customIdError.message}`);
        } else {
            console.log(`✅ generate_custom_id: ${customId}`);
        }
        
        // Tester la fonction clean_demo_data
        const { data: cleanData, error: cleanError } = await supabase.rpc('clean_demo_data');
        if (cleanError) {
            console.log(`❌ clean_demo_data: ${cleanError.message}`);
        } else {
            console.log(`✅ clean_demo_data: ${JSON.stringify(cleanData)}`);
        }
        
        // Tester la fonction update_locations_to_guinea
        const { data: updateLoc, error: updateLocError } = await supabase.rpc('update_locations_to_guinea');
        if (updateLocError) {
            console.log(`❌ update_locations_to_guinea: ${updateLocError.message}`);
        } else {
            console.log(`✅ update_locations_to_guinea: ${JSON.stringify(updateLoc)}`);
        }
        
    } catch (err) {
        console.log(`❌ Erreur vérification: ${err.message}`);
    }
}

// ===================================================
// FONCTION PRINCIPALE
// ===================================================

async function runFunctionCreation() {
    console.log('\n🚀 DÉMARRAGE DE LA CRÉATION DES FONCTIONS');
    console.log('='.repeat(60));
    
    try {
        const results = await createSupabaseFunctions();
        await verifyFunctions();
        
        console.log('\n🎯 PROCHAINES ÉTAPES:');
        console.log('1. Vérifier les fonctions dans Supabase Dashboard');
        console.log('2. Pousser le code sur GitHub');
        console.log('3. Tester le système complet');
        console.log('4. Déployer en production');
        
        console.log('\n🏁 FIN DE LA CRÉATION DES FONCTIONS');
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ ERREUR CRITIQUE:', error);
        process.exit(1);
    }
}

// Lancer la création des fonctions
runFunctionCreation().catch(console.error);
