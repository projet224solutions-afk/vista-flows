/**
 * Purge des clés Supabase fuitées de l'HISTORIQUE git.
 *
 * ⚠️ À EXÉCUTER UNIQUEMENT APRÈS avoir ROTÉ la clé service_role côté Supabase
 *    (la rotation est le vrai correctif ; la purge n'est qu'un nettoyage cosmétique).
 * ⚠️ Réécrit TOUT l'historique → force-push obligatoire → chaque clone existant
 *    devient obsolète (tout le monde doit re-cloner).
 *
 * Ce script NE RÉÉCRIT RIEN tout seul : il prépare seulement le fichier de
 * remplacement (en extrayant les tokens de l'historique, pour ne pas les hardcoder).
 * Lance ensuite git-filter-repo manuellement (commande affichée).
 *
 * Usage :  node scripts/security/purge-leaked-keys.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT = path.join('scripts', 'security', '.purge-replacements.txt'); // gitignoré

// 1) Extraire les JWT fuités présents dans l'historique des .env.example
const hist = execSync(
  'git log --all -p -- .env.example backend/.env.example',
  { maxBuffer: 1024 * 1024 * 200, encoding: 'utf8' }
);
const jwts = [...new Set(hist.match(/eyJ[A-Za-z0-9_-]{16,}\.eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{20,}/g) || [])];

if (jwts.length === 0) {
  console.log('Aucun JWT trouvé dans l’historique des .env.example. Rien à purger (ou déjà fait).');
  process.exit(0);
}

// 2) Identifier les rôles (pour info)
const roleOf = (jwt) => {
  try { return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString()).role || '?'; }
  catch { return '?'; }
};
console.log('Tokens fuités détectés dans l’historique :');
for (const j of jwts) console.log(`  - role=${roleOf(j)}  (${j.slice(0, 24)}…)`);

// 3) Écrire le fichier de remplacement filter-repo (TOKEN==>***REMOVED***)
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, jwts.map((j) => `${j}==>***REMOVED-SUPABASE-KEY***`).join('\n') + '\n');
console.log(`\nFichier de remplacement écrit (gitignoré) : ${OUT}`);

console.log(`
========================================================================
ÉTAPES MANUELLES (après avoir ROTÉ la clé dans Supabase) :

  # 1. Installer git-filter-repo (une fois) :
  pip install git-filter-repo

  # 2. SAUVEGARDE de sécurité (clone miroir) :
  git clone --mirror . ../vista-flows-backup.git

  # 3. Réécrire l’historique (remplace les tokens partout) :
  git filter-repo --replace-text ${OUT} --force

  # 4. Re-pointer le remote (filter-repo le retire par sécurité) :
  git remote add origin https://github.com/projet224solutions-afk/vista-flows.git

  # 5. Force-push (réécrit l’historique distant) :
  git push origin --force --all
  git push origin --force --tags

  ⚠️ Préviens TOUTE personne ayant cloné le repo : ils doivent re-cloner.
========================================================================
`);
