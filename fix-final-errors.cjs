#!/usr/bin/env node

/**
 * Script pour corriger les dernières erreurs manuellement
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 Correction des dernières erreurs...\n');

const fixes = [
  // Corriger les any dans les fichiers spécifiques
  {
    file: 'src/components/pdg/PDGConfig.tsx',
    find: /config:\s*any/g,
    replace: 'config: Record<string, unknown>',
  },
  {
    file: 'src/components/pdg/PDGFinance.tsx',
    find: /data:\s*any/g,
    replace: 'data: Record<string, unknown>',
  },
  {
    file: 'src/components/pdg/PDGSecurity.tsx',
    find: /:\s*any\b/g,
    replace: ': unknown',
  },
  {
    file: 'src/components/pdg/PDGUsers.tsx',
    find: /:\s*any\b/g,
    replace: ': unknown',
  },
  // Corriger les blocs vides
  {
    file: 'src/services/session.ts',
    find: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    replace: 'catch (error: unknown) {\n    // Error handled silently\n  }',
  },
  // Corriger les interfaces vides
  {
    file: 'src/types/suppressions.ts',
    find: /interface\s+(\w+)\s*\{\s*\}/g,
    replace: 'type $1 = Record<string, never>',
  },
];

let totalFixes = 0;

fixes.forEach(({ file, find, replace }) => {
  const filePath = path.join(__dirname, file);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Fichier non trouvé: ${file}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(find);
    
    if (matches && matches.length > 0) {
      content = content.replace(find, replace);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${file}: ${matches.length} correction(s)`);
      totalFixes += matches.length;
    }
  } catch (error) {
    console.error(`❌ Erreur traitement ${file}:`, error.message);
  }
});

console.log(`\n📊 Total de corrections: ${totalFixes}\n`);

