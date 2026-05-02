/**
 * 🔐 CONFIGURATION SUPABASE
 * Client Supabase pour le backend Node.js
 */

import { createClient } from '@supabase/supabase-js';
// dotenv.config() appelé dans server.ts

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration in environment variables');
}

/**
 * Client Supabase avec SERVICE_ROLE_KEY
 * ⚠️ À utiliser UNIQUEMENT côté serveur
 * Bypass les RLS policies
 */
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Client Supabase avec ANON_KEY
 * Respecte les RLS policies
 * Utilisé pour les opérations standards
 */
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Vérifie la connexion à Supabase
 */
export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) throw error;

    return { success: true, message: 'Supabase connection OK' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
