#!/usr/bin/env node

/**
 * Script de correction automatique des erreurs TypeScript
 * Corrige les types 'any' les plus courants
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Début de la correction des erreurs TypeScript...\n');

// Compteurs
let filesProcessed = 0;
let errorsFixed = 0;

// Fonction pour corriger les types any dans les catch blocks
function fixCatchBlocks(content) {
  let fixes = 0;
  
  // Remplacer catch (err: any) par catch (err: unknown)
  const regex1 = /catch\s*\(\s*(\w+)\s*:\s*any\s*\)/g;
  const newContent1 = content.replace(regex1, (match, varName) => {
    fixes++;
    return `catch (${varName}: unknown)`;
  });
  
  // Remplacer catch (error: any) par catch (error: unknown)
  const regex2 = /catch\s*\(\s*error\s*:\s*any\s*\)/g;
  const newContent2 = newContent1.replace(regex2, 'catch (error: unknown)');
  
  return { content: newContent2, fixes };
}

// Fonction pour corriger les types any dans les paramètres de fonction
function fixFunctionParams(content) {
  let fixes = 0;
  
  // Remplacer (data: any) par (data: unknown) dans les fonctions
  const regex = /\((\w+)\s*:\s*any\)/g;
  const newContent = content.replace(regex, (match, paramName) => {
    fixes++;
    return `(${paramName}: unknown)`;
  });
  
  return { content: newContent, fixes };
}

// Fonction pour ajouter des types aux interfaces vides
function fixEmptyInterfaces(content) {
  let fixes = 0;
  
  // Remplacer interface X extends Y {} par type X = Y
  const regex = /interface\s+(\w+)\s+extends\s+([\w<>]+)\s*\{\s*\}/g;
  const newContent = content.replace(regex, (match, interfaceName, extendsType) => {
    fixes++;
    return `type ${interfaceName} = ${extendsType}`;
  });
  
  return { content: newContent, fixes };
}

// Fonction pour traiter un fichier
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let totalFixes = 0;
    
    // Appliquer les corrections
    const result1 = fixCatchBlocks(content);
    content = result1.content;
    totalFixes += result1.fixes;
    
    const result2 = fixFunctionParams(content);
    content = result2.content;
    totalFixes += result2.fixes;
    
    const result3 = fixEmptyInterfaces(content);
    content = result3.content;
    totalFixes += result3.fixes;
    
    // Écrire le fichier si des corrections ont été faites
    if (totalFixes > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${path.basename(filePath)}: ${totalFixes} correction(s)`);
      errorsFixed += totalFixes;
    }
    
    filesProcessed++;
  } catch (error) {
    console.error(`❌ Erreur traitement ${filePath}:`, error.message);
  }
}

// Fonction pour parcourir récursivement les fichiers
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Ignorer node_modules et dist
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filePath);
    }
  });
}

// Traiter tous les fichiers TypeScript
const srcDir = path.join(__dirname, 'src');
walkDir(srcDir, processFile);

console.log(`\n📊 Résumé:`);
console.log(`   - Fichiers traités: ${filesProcessed}`);
console.log(`   - Erreurs corrigées: ${errorsFixed}`);
console.log(`\n✨ Correction terminée!\n`);

