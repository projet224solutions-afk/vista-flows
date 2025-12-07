// Edge Function: Connexion Intelligente Universelle
// Supporte: Agent, Bureau Syndicat, Travailleur
// Identifiant flexible: Email, Téléphone, ID unique

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Détection automatique du type d'identifiant
function detectIdentifierType(identifier: string): 'email' | 'phone' | 'id' {
  // Email: contient @
  if (identifier.includes('@')) {
    return 'email';
  }
  
  // Téléphone: commence par 6, 7, ou 8 (Guinée)
  const cleanPhone = identifier.replace(/\s+/g, '');
  if (/^[678]\d{8}$/.test(cleanPhone)) {
    return 'phone';
  }
  
  // Identifiant unique par défaut
  return 'id';
}

// Hash du mot de passe avec bcrypt (sécurisé avec salt)
async function hashPassword(password: string): Promise<string> {
  try {
    const bcrypt = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
    return await bcrypt.hash(password);
  } catch (bcryptError) {
    console.error('❌ Bcrypt indisponible, fallback SHA-256 (moins sécurisé)');
    // Fallback SHA-256 uniquement si bcrypt échoue (moins sécurisé mais mieux que rien)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Vérification Agent
async function verifyAgent(supabase: any, identifier: string, password: string, identifierType: string) {
  console.log('🔍 Vérification Agent...', { identifier, identifierType });
  
  let query = supabase
    .from('agents_management')
    .select('*')
    .eq('is_active', true)
    .single();
  
  if (identifierType === 'email') {
    query = query.eq('email', identifier);
  } else if (identifierType === 'phone') {
    query = query.eq('phone', identifier);
  } else {
    query = query.eq('agent_code', identifier);
  }
  
  const { data: agent, error } = await query;
  
  if (error || !agent) {
    console.log('❌ Agent non trouvé');
    return null;
  }
  
  // Vérifier le mot de passe
  const hashedPassword = await hashPassword(password);
  if (agent.password_hash !== hashedPassword) {
    console.log('❌ Mot de passe incorrect');
    return null;
  }
  
  console.log('✅ Agent authentifié:', agent.agent_code);
  return {
    role: 'agent',
    user: agent,
    userId: agent.id,
    token: crypto.randomUUID()
  };
}

// Vérification Bureau Syndicat
async function verifyBureau(supabase: any, identifier: string, password: string, identifierType: string) {
  console.log('🔍 Vérification Bureau Syndicat...', { identifier, identifierType });
  
  let query = supabase
    .from('bureaus')
    .select('*')
    .eq('status', 'active')
    .single();
  
  if (identifierType === 'email') {
    query = query.eq('president_email', identifier);
  } else if (identifierType === 'phone') {
    query = query.eq('president_phone', identifier);
  } else {
    query = query.eq('bureau_code', identifier);
  }
  
  const { data: bureau, error } = await query;
  
  if (error || !bureau) {
    console.log('❌ Bureau non trouvé');
    return null;
  }
  
  // Vérifier le mot de passe (stocké dans access_token temporairement)
  const hashedPassword = await hashPassword(password);
  if (bureau.access_token !== hashedPassword) {
    console.log('❌ Mot de passe incorrect');
    return null;
  }
  
  console.log('✅ Bureau authentifié:', bureau.bureau_code);
  return {
    role: 'bureau',
    user: bureau,
    userId: bureau.id,
    token: crypto.randomUUID()
  };
}

// Vérification Travailleur (Member)
async function verifyWorker(supabase: any, identifier: string, password: string, identifierType: string) {
  console.log('🔍 Vérification Travailleur...', { identifier, identifierType });
  
  let query = supabase
    .from('members')
    .select('*')
    .eq('status', 'active')
    .single();
  
  if (identifierType === 'email') {
    query = query.eq('email', identifier);
  } else if (identifierType === 'phone') {
    query = query.eq('phone', identifier);
  } else {
    query = query.eq('license_number', identifier);
  }
  
  const { data: worker, error } = await query;
  
  if (error || !worker) {
    console.log('❌ Travailleur non trouvé');
    return null;
  }
  
  // Vérifier le mot de passe
  const hashedPassword = await hashPassword(password);
  // Note: Ajouter le champ password_hash dans la table members si nécessaire
  if (!worker.password_hash || worker.password_hash !== hashedPassword) {
    console.log('❌ Mot de passe incorrect');
    return null;
  }
  
  console.log('✅ Travailleur authentifié:', worker.license_number);
  return {
    role: 'worker',
    user: worker,
    userId: worker.id,
    token: crypto.randomUUID()
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { identifier, password, role } = await req.json();
    
    console.log('🔐 Tentative de connexion:', { identifier, role });
    
    // Validation
    if (!identifier || !password) {
      return new Response(
        JSON.stringify({ error: 'Identifiant et mot de passe requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Détecter le type d'identifiant
    const identifierType = detectIdentifierType(identifier);
    console.log('📱 Type détecté:', identifierType);
    
    let result = null;
    
    // Authentification selon le rôle
    if (role === 'agent' || !role) {
      result = await verifyAgent(supabase, identifier, password, identifierType);
    }
    
    if (!result && (role === 'bureau' || !role)) {
      result = await verifyBureau(supabase, identifier, password, identifierType);
    }
    
    if (!result && (role === 'worker' || !role)) {
      result = await verifyWorker(supabase, identifier, password, identifierType);
    }
    
    if (!result) {
      return new Response(
        JSON.stringify({ 
          error: 'Identifiant ou mot de passe incorrect',
          identifierType 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Créer une session
    const sessionData = {
      ...result,
      identifierType,
      loginTime: new Date().toISOString()
    };
    
    console.log('✅ Connexion réussie:', result.role);
    
    return new Response(
      JSON.stringify({ success: true, session: sessionData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
