import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Script pour remplacer toutes les occurrences de FCFA par GNF
 * et réinitialiser les compteurs à 0 dans le projet
 */

const replacements = [
  { from: /FCFA/g, to: 'GNF' },
  { from: /fcfa/g, to: 'gnf' },
];

function processFile(filePath: string): void {
  try {
    let content = readFileSync(filePath, 'utf8');
    let modified = false;

    replacements.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    });

    if (modified) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Modifié: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erreur sur ${filePath}:`, error);
  }
}

function processDirectory(dirPath: string): void {
  const items = readdirSync(dirPath);

  items.forEach(item => {
    const fullPath = join(dirPath, item);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      // Ignorer node_modules, .git, etc.
      if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
        processDirectory(fullPath);
      }
    } else if (stats.isFile()) {
      // Traiter uniquement les fichiers .tsx, .ts, .jsx, .js
      if (/\.(tsx?|jsx?)$/.test(item)) {
        processFile(fullPath);
      }
    }
  });
}

// Exécution
console.log('🔄 Début du remplacement de FCFA par GNF...');
processDirectory('src');
console.log('✅ Remplacement terminé !');
