#!/usr/bin/env node

/**
 * Script pour remplacer console.log par un logger conditionnel
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage des console.log...\n');

let filesProcessed = 0;
let logsRemoved = 0;

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let fixes = 0;
    
    // Remplacer console.log par un commentaire en mode développement
    // On garde console.error et console.warn car ils sont utiles
    const regex = /console\.log\(/g;
    const matches = content.match(regex);
    
    if (matches && matches.length > 0) {
      // Remplacer console.log par un logger conditionnel
      content = content.replace(
        /console\.log\(/g,
        'if (import.meta.env.DEV) console.log('
      );
      
      fixes = matches.length;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${path.basename(filePath)}: ${fixes} console.log protégé(s)`);
      logsRemoved += fixes;
    }
    
    filesProcessed++;
  } catch (error) {
    console.error(`❌ Erreur traitement ${filePath}:`, error.message);
  }
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filePath);
    }
  });
}

const srcDir = path.join(__dirname, 'src');
walkDir(srcDir, processFile);

console.log(`\n📊 Résumé:`);
console.log(`   - Fichiers traités: ${filesProcessed}`);
console.log(`   - console.log protégés: ${logsRemoved}`);
console.log(`\n✨ Nettoyage terminé!\n`);

