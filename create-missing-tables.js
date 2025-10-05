/**
 * 🔧 CRÉATION TABLES MANQUANTES - 224SOLUTIONS
 * Script pour créer les tables de communication manquantes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://uakkxaibujzxdiqzpnpr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM";

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMissingTables() {
  console.log('🔧 CRÉATION TABLES MANQUANTES');
  console.log('=' .repeat(40));

  const tables = [
    {
      name: 'conversations',
      sql: `
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(20) NOT NULL CHECK (type IN ('private', 'group')),
          name VARCHAR(255),
          description TEXT,
          channel_name VARCHAR(255) UNIQUE,
          participant_1 UUID REFERENCES profiles(id),
          participant_2 UUID REFERENCES profiles(id),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
          last_message_at TIMESTAMP WITH TIME ZONE,
          created_by UUID REFERENCES profiles(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'conversation_participants',
      sql: `
        CREATE TABLE IF NOT EXISTS conversation_participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          left_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT true,
          UNIQUE(conversation_id, user_id)
        );
      `
    },
    {
      name: 'user_presence',
      sql: `
        CREATE TABLE IF NOT EXISTS user_presence (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
          status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'away')),
          last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          device_info JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }
  ];

  for (const table of tables) {
    try {
      console.log(`\n📋 Création table ${table.name}...`);
      
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log(`❌ Erreur préliminaire: ${error.message}`);
        continue;
      }

      // Essayer de créer la table via une requête directe
      const { data, error: createError } = await supabase
        .rpc('exec_sql', { sql_query: table.sql });
      
      if (createError) {
        console.log(`⚠️  Table ${table.name} non créée: ${createError.message}`);
      } else {
        console.log(`✅ Table ${table.name} créée avec succès`);
      }

    } catch (error) {
      console.log(`❌ Erreur création table ${table.name}: ${error.message}`);
    }
  }

  // Vérifier les tables créées
  console.log('\n🔍 VÉRIFICATION FINALE...');
  
  const allTables = ['conversations', 'conversation_participants', 'messages', 'calls', 'user_presence', 'notifications'];
  
  for (const table of allTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: accessible`);
      }
    } catch (error) {
      console.log(`❌ Table ${table}: ${error.message}`);
    }
  }

  console.log('\n🏁 Création terminée !');
}

createMissingTables();
