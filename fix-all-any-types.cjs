#!/usr/bin/env node

/**
 * Script avancé pour corriger TOUS les types 'any'
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Correction avancée de TOUS les types any...\n');

let filesProcessed = 0;
let errorsFixed = 0;

const typeReplacements = {
  // Patterns spécifiques avec leur remplacement
  'error: any': 'error: unknown',
  'err: any': 'err: unknown',
  'e: any': 'e: unknown',
  'data: any': 'data: Record<string, unknown>',
  'response: any': 'response: unknown',
  'result: any': 'result: unknown',
  'value: any': 'value: unknown',
  'item: any': 'item: unknown',
  'element: any': 'element: unknown',
  'obj: any': 'obj: Record<string, unknown>',
  'params: any': 'params: Record<string, unknown>',
  'props: any': 'props: Record<string, unknown>',
  'options: any': 'options: Record<string, unknown>',
  'config: any': 'config: Record<string, unknown>',
  'settings: any': 'settings: Record<string, unknown>',
  'payload: any': 'payload: Record<string, unknown>',
  'body: any': 'body: Record<string, unknown>',
  'query: any': 'query: Record<string, unknown>',
  'event: any': 'event: Event',
  'ev: any': 'ev: Event',
  'map: any': 'map: unknown',
  'marker: any': 'marker: unknown',
};

function fixAnyTypes(content) {
  let fixes = 0;
  let newContent = content;
  
  // Appliquer les remplacements spécifiques
  for (const [pattern, replacement] of Object.entries(typeReplacements)) {
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = newContent.match(regex);
    if (matches) {
      newContent = newContent.replace(regex, replacement);
      fixes += matches.length;
    }
  }
  
  // Remplacer les any génériques restants par unknown
  const genericAnyRegex = /(\w+):\s*any(?!\w)/g;
  const genericMatches = newContent.match(genericAnyRegex);
  if (genericMatches) {
    newContent = newContent.replace(genericAnyRegex, '$1: unknown');
    fixes += genericMatches.length;
  }
  
  // Remplacer les tableaux any[]
  const arrayAnyRegex = /:\s*any\[\]/g;
  const arrayMatches = newContent.match(arrayAnyRegex);
  if (arrayMatches) {
    newContent = newContent.replace(arrayAnyRegex, ': unknown[]');
    fixes += arrayMatches.length;
  }
  
  // Remplacer Array<any>
  const arrayGenericRegex = /Array<any>/g;
  const arrayGenericMatches = newContent.match(arrayGenericRegex);
  if (arrayGenericMatches) {
    newContent = newContent.replace(arrayGenericRegex, 'Array<unknown>');
    fixes += arrayGenericMatches.length;
  }
  
  return { content: newContent, fixes };
}

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

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let totalFixes = 0;
    
    // Appliquer les corrections
    const result1 = fixAnyTypes(content);
    content = result1.content;
    totalFixes += result1.fixes;
    
    const result2 = fixEmptyInterfaces(content);
    content = result2.content;
    totalFixes += result2.fixes;
    
    // Écrire le fichier si des corrections ont été faites
    if (totalFixes > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${totalFixes} correction(s)`);
      errorsFixed += totalFixes;
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

// Traiter tous les fichiers TypeScript
const srcDir = path.join(__dirname, 'src');
walkDir(srcDir, processFile);

console.log(`\n📊 Résumé:`);
console.log(`   - Fichiers traités: ${filesProcessed}`);
console.log(`   - Erreurs corrigées: ${errorsFixed}`);
console.log(`\n✨ Correction terminée!\n`);

