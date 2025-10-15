#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Correction des syntaxes if incorrectes...\n');

let filesProcessed = 0;
let errorsFixed = 0;

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let fixes = 0;
    
    // Remplacer () => if (condition) statement par () => { if (condition) statement; }
    const regex = /\(\s*\)\s*=>\s*if\s*\(([^)]+)\)\s*([^;]+)/g;
    const newContent = content.replace(regex, (match, condition, statement) => {
      fixes++;
      return `() => { if (${condition}) ${statement}; }`;
    });
    
    if (fixes > 0) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ ${path.basename(filePath)}: ${fixes} correction(s)`);
      errorsFixed += fixes;
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
console.log(`   - Erreurs corrigées: ${errorsFixed}`);
console.log(`\n✨ Correction terminée!\n`);

