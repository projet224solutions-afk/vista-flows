/**
 * ================================================================
 * SCRIPT D'UPLOAD APK/EXE VERS SUPABASE STORAGE
 * ================================================================
 * Ce script upload les fichiers d'installation vers Supabase
 * Usage: node upload-to-supabase.mjs
 * ================================================================
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

console.log('\n🚀 UPLOAD VERS SUPABASE STORAGE');
console.log('================================\n');

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'app-downloads';
const FILES_TO_UPLOAD = [
  {
    localPath: 'public/224Solutions.apk',
    remotePath: '224Solutions.apk',
    contentType: 'application/vnd.android.package-archive'
  },
  {
    localPath: 'public/224Solutions.exe',
    remotePath: '224Solutions.exe',
    contentType: 'application/x-msdownload'
  }
];

// Créer le bucket s'il n'existe pas
async function ensureBucket() {
  console.log('📦 Vérification du bucket...');
  
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log('📥 Création du bucket "app-downloads"...');
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 200 * 1024 * 1024, // 200 MB
      allowedMimeTypes: [
        'application/vnd.android.package-archive',
        'application/x-msdownload',
        'application/octet-stream'
      ]
    });
    
    if (error) {
      console.error('❌ Erreur création bucket:', error.message);
      return false;
    }
    console.log('✅ Bucket créé avec succès');
  } else {
    console.log('✅ Bucket existe déjà');
  }
  
  return true;
}

// Uploader un fichier
async function uploadFile(fileConfig) {
  const { localPath, remotePath, contentType } = fileConfig;
  
  console.log(`\n📤 Upload: ${remotePath}`);
  console.log(`   Depuis: ${localPath}`);
  
  // Vérifier si le fichier existe
  if (!fs.existsSync(localPath)) {
    console.log(`   ⚠️  Fichier non trouvé, ignoré`);
    return { success: false, skipped: true };
  }
  
  // Lire le fichier
  const fileBuffer = fs.readFileSync(localPath);
  const fileSize = (fileBuffer.length / (1024 * 1024)).toFixed(2);
  console.log(`   Taille: ${fileSize} MB`);
  
  try {
    // Supprimer l'ancien fichier s'il existe
    await supabase.storage.from(BUCKET_NAME).remove([remotePath]);
    
    // Uploader le nouveau fichier
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(remotePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error(`   ❌ Erreur: ${error.message}`);
      return { success: false, error };
    }
    
    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(remotePath);
    
    console.log(`   ✅ Upload réussi`);
    console.log(`   🔗 URL: ${urlData.publicUrl}`);
    
    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error(`   ❌ Exception: ${error.message}`);
    return { success: false, error };
  }
}

// Fonction principale
async function main() {
  try {
    // 1. Vérifier/créer le bucket
    const bucketReady = await ensureBucket();
    if (!bucketReady) {
      console.error('\n❌ Impossible de préparer le bucket');
      process.exit(1);
    }
    
    // 2. Uploader les fichiers
    console.log('\n📤 Upload des fichiers...');
    console.log('─────────────────────────────');
    
    const results = [];
    for (const fileConfig of FILES_TO_UPLOAD) {
      const result = await uploadFile(fileConfig);
      results.push({ ...fileConfig, ...result });
    }
    
    // 3. Afficher le résumé
    console.log('\n\n📊 RÉSUMÉ');
    console.log('─────────────────────────────');
    
    const successful = results.filter(r => r.success);
    const skipped = results.filter(r => r.skipped);
    const failed = results.filter(r => !r.success && !r.skipped);
    
    console.log(`✅ Uploads réussis: ${successful.length}`);
    console.log(`⚠️  Fichiers ignorés: ${skipped.length}`);
    console.log(`❌ Échecs: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n🔗 URLs publiques:');
      successful.forEach(r => {
        console.log(`   ${r.remotePath}: ${r.url}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Fichiers échoués:');
      failed.forEach(r => {
        console.log(`   ${r.remotePath}: ${r.error?.message || 'Erreur inconnue'}`);
      });
    }
    
    console.log('\n✅ SCRIPT TERMINÉ\n');
    process.exit(failed.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }
}

main();
