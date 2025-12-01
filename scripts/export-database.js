/**
 * 📦 SCRIPT D'EXPORT DE LA BASE DE DONNÉES SUPABASE
 * Exporte toutes les tables vers un fichier SQL compatible PostgreSQL/MySQL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'VOTRE_URL_SUPABASE';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'VOTRE_SERVICE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Liste complète des tables à exporter
const TABLES = [
  'profiles',
  'wallets',
  'enhanced_transactions',
  'vendors',
  'vendor_subscriptions',
  'products',
  'product_variants',
  'categories',
  'orders',
  'order_items',
  'customers',
  'carts',
  'advanced_carts',
  'wishlists',
  'product_reviews',
  'addresses',
  'quotes',
  'invoices',
  'contracts',
  'clients',
  'agents_management',
  'agent_wallets',
  'agent_permissions',
  'agent_invitations',
  'pdg_management',
  'bureaus',
  'bureau_wallets',
  'bureau_transactions',
  'members',
  'registered_motos',
  'badges',
  'taxi_drivers',
  'ride_requests',
  'driver_ratings',
  'delivery_drivers',
  'delivery_orders',
  'transitaire_management',
  'international_shipments',
  'conversations',
  'messages',
  'conversation_participants',
  'calls'
];

async function exportTable(tableName) {
  console.log(`📥 Export de la table: ${tableName}`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(10000); // Ajuster selon vos besoins
    
    if (error) {
      console.error(`❌ Erreur pour ${tableName}:`, error.message);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log(`⚠️  Table ${tableName} vide, skip`);
      return null;
    }
    
    console.log(`✅ ${data.length} lignes exportées de ${tableName}`);
    return { tableName, data };
  } catch (err) {
    console.error(`❌ Exception pour ${tableName}:`, err.message);
    return null;
  }
}

function escapeSQL(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'object') {
    // JSON ou Array
    const jsonString = JSON.stringify(value).replace(/'/g, "''");
    return `'${jsonString}'`;
  }
  
  // String
  const escapedString = String(value).replace(/'/g, "''");
  return `'${escapedString}'`;
}

function generateInsertSQL(tableName, data) {
  if (!data || data.length === 0) return '';
  
  const columns = Object.keys(data[0]);
  let sql = `\n-- Table: ${tableName}\n`;
  sql += `-- Nombre de lignes: ${data.length}\n\n`;
  
  // Désactiver les contraintes temporairement
  sql += `ALTER TABLE ${tableName} DISABLE TRIGGER ALL;\n\n`;
  
  // Générer les INSERT
  data.forEach((row, index) => {
    const values = columns.map(col => escapeSQL(row[col])).join(', ');
    sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});\n`;
    
    // Commit tous les 100 inserts
    if ((index + 1) % 100 === 0) {
      sql += '\n';
    }
  });
  
  // Réactiver les contraintes
  sql += `\nALTER TABLE ${tableName} ENABLE TRIGGER ALL;\n`;
  sql += `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE(MAX(id), 1)) FROM ${tableName};\n\n`;
  
  return sql;
}

async function main() {
  console.log('🚀 Début de l\'export de la base de données 224Solutions\n');
  console.log(`📊 ${TABLES.length} tables à exporter\n`);
  
  let fullSQL = `-- ============================================
-- EXPORT BASE DE DONNÉES 224SOLUTIONS
-- Date: ${new Date().toISOString()}
-- ============================================

-- Configuration
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\n\n`;
  
  // Exporter chaque table
  for (const tableName of TABLES) {
    const result = await exportTable(tableName);
    if (result) {
      fullSQL += generateInsertSQL(result.tableName, result.data);
    }
    
    // Pause pour ne pas surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Footer
  fullSQL += `\n\n-- ============================================
-- FIN DE L'EXPORT
-- ============================================\n`;
  
  // Sauvegarder dans un fichier
  const filename = `224solutions-database-export-${Date.now()}.sql`;
  const filepath = path.join(__dirname, '..', filename);
  
  fs.writeFileSync(filepath, fullSQL, 'utf8');
  
  console.log('\n✅ Export terminé !');
  console.log(`📁 Fichier créé: ${filename}`);
  console.log(`📏 Taille: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB`);
  console.log('\n🎉 Vous pouvez maintenant importer ce fichier sur votre VPS Hostinger');
  console.log('💡 Commande: sudo -u postgres psql solutions224 < ' + filename);
}

main().catch(console.error);
