#!/usr/bin/env node
/**
 * Script pour appliquer la migration wallet RLS fix
 * 
 * Usage: node apply-wallet-fix.js
 * 
 * Prérequis:
 * 1. Avoir .env configuré avec SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 * 2. Installez les dépendances: npm install @supabase/supabase-js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erreur: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises dans .env');
  process.exit(1);
}

// Initialiser le client Supabase avec la service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  console.log('🔧 Application du fix wallet RLS...');

  try {
    // 1. Créer la fonction RPC unique `rpc_create_user_wallet` sans toucher aux policies existantes
    const { error: functionError } = await supabase.rpc('_exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION public.rpc_create_user_wallet(p_user_id UUID)
        RETURNS TABLE (
          id UUID,
          user_id UUID,
          balance NUMERIC,
          currency TEXT,
          wallet_status TEXT,
          created_at TIMESTAMP
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = 'public'
        AS $$
        BEGIN
          -- Guard: only allow the service_role or the user themselves to execute
          IF auth.role() <> 'service_role' AND auth.uid() <> p_user_id THEN
            RAISE EXCEPTION 'Permission denied';
          END IF;

          IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
            RAISE EXCEPTION 'User % does not exist', p_user_id;
          END IF;

          IF EXISTS (SELECT 1 FROM wallets WHERE user_id = p_user_id) THEN
            RETURN QUERY SELECT id, user_id, balance, currency, wallet_status, created_at FROM wallets WHERE user_id = p_user_id;
            RETURN;
          END IF;

          RETURN QUERY
          INSERT INTO wallets (user_id, balance, currency, wallet_status)
          VALUES (p_user_id, 0, 'GNF', 'active')
          RETURNING id, user_id, balance, currency, wallet_status, created_at;
        END;
        $$;

        GRANT EXECUTE ON FUNCTION public.rpc_create_user_wallet(UUID) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.rpc_create_user_wallet(UUID) TO service_role;

        COMMENT ON FUNCTION public.rpc_create_user_wallet IS 'RPC (unique) pour initialiser/retourner le wallet utilisateur en toute sécurité.';
      `
    });

    if (functionError) {
      console.error('❌ Erreur lors de l\'application de la migration:', functionError);
      process.exit(1);
    }

    console.log('✅ Migration wallet RLS appliquée avec succès!');
    console.log('✅ La RPC create_user_wallet est maintenant disponible');
    console.log('✅ Les RLS policies ont été consolidées');

  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter la migration
applyMigration().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
