#!/usr/bin/env node

/**
 * Script ultra-complet pour corriger TOUS les any restants
 * Approche plus agressive et complète
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Correction ULTRA-COMPLÈTE de tous les any restants...\n');

let filesProcessed = 0;
let errorsFixed = 0;

function fixAllAnyOccurrences(content, filePath) {
  let fixes = 0;
  let newContent = content;
  
  // 1. Remplacer tous les paramètres de fonction avec : any
  const functionParamRegex = /\(([^)]*:\s*any[^)]*)\)/g;
  newContent = newContent.replace(functionParamRegex, (match) => {
    const fixed = match.replace(/:\s*any\b/g, ': unknown');
    if (fixed !== match) fixes++;
    return fixed;
  });
  
  // 2. Remplacer toutes les déclarations de variables avec : any
  const varDeclRegex = /(const|let|var)\s+(\w+):\s*any\b/g;
  newContent = newContent.replace(varDeclRegex, (match, keyword, varName) => {
    fixes++;
    return `${keyword} ${varName}: unknown`;
  });
  
  // 3. Remplacer les types de retour de fonction : any
  const returnTypeRegex = /\):\s*any\b/g;
  const returnMatches = newContent.match(returnTypeRegex);
  if (returnMatches) {
    newContent = newContent.replace(returnTypeRegex, '): unknown');
    fixes += returnMatches.length;
  }
  
  // 4. Remplacer les tableaux any[]
  const arrayRegex = /:\s*any\[\]/g;
  const arrayMatches = newContent.match(arrayRegex);
  if (arrayMatches) {
    newContent = newContent.replace(arrayRegex, ': unknown[]');
    fixes += arrayMatches.length;
  }
  
  // 5. Remplacer Array<any>
  const arrayGenericRegex = /Array<any>/g;
  const arrayGenericMatches = newContent.match(arrayGenericRegex);
  if (arrayGenericMatches) {
    newContent = newContent.replace(arrayGenericRegex, 'Array<unknown>');
    fixes += arrayGenericMatches.length;
  }
  
  // 6. Remplacer Record<string, any>
  const recordRegex = /Record<string,\s*any>/g;
  const recordMatches = newContent.match(recordRegex);
  if (recordMatches) {
    newContent = newContent.replace(recordRegex, 'Record<string, unknown>');
    fixes += recordMatches.length;
  }
  
  // 7. Remplacer les propriétés d'interface/type avec : any
  const propRegex = /(\s+)(\w+):\s*any;/g;
  newContent = newContent.replace(propRegex, (match, indent, propName) => {
    fixes++;
    return `${indent}${propName}: unknown;`;
  });
  
  // 8. Remplacer les génériques <any>
  const genericRegex = /<any>/g;
  const genericMatches = newContent.match(genericRegex);
  if (genericMatches) {
    newContent = newContent.replace(genericRegex, '<unknown>');
    fixes += genericMatches.length;
  }
  
  // 9. Remplacer as any
  const asAnyRegex = /\s+as\s+any\b/g;
  const asAnyMatches = newContent.match(asAnyRegex);
  if (asAnyMatches) {
    newContent = newContent.replace(asAnyRegex, ' as unknown');
    fixes += asAnyMatches.length;
  }
  
  // 10. Remplacer les interfaces vides
  const emptyInterfaceRegex = /interface\s+(\w+)\s+extends\s+([\w<>]+)\s*\{\s*\}/g;
  newContent = newContent.replace(emptyInterfaceRegex, (match, name, ext) => {
    fixes++;
    return `type ${name} = ${ext}`;
  });
  
  return { content: newContent, fixes };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = fixAllAnyOccurrences(content, filePath);
    
    if (result.fixes > 0) {
      fs.writeFileSync(filePath, result.content, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`✅ ${relativePath}: ${result.fixes} correction(s)`);
      errorsFixed += result.fixes;
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
console.log(`\n✨ Correction ULTRA-COMPLÈTE terminée!\n`);

