#!/usr/bin/env node

/**
 * Script pour revenir en arrière sur les console.log
 * et les laisser tels quels (ils seront supprimés en production par le minifier)
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Revert des console.log...\n');

let filesProcessed = 0;
let logsReverted = 0;

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let fixes = 0;
    
    // Remplacer if (import.meta.env.DEV) console.log( par console.log(
    const regex = /if\s*\(\s*import\.meta\.env\.DEV\s*\)\s*console\.log\(/g;
    const matches = content.match(regex);
    
    if (matches && matches.length > 0) {
      content = content.replace(regex, 'console.log(');
      fixes = matches.length;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${path.basename(filePath)}: ${fixes} console.log revertés`);
      logsReverted += fixes;
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
console.log(`   - console.log revertés: ${logsReverted}`);
console.log(`\n✨ Revert terminé!\n`);

