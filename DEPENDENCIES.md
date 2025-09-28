# Gestion des Dépendances - Mon Projet 224Solutions

## 📁 Structure des Dépendances

Toutes les dépendances de ce projet sont installées **localement** dans le dossier `Mon Projet 224Solutions/node_modules/`. Cela garantit que :

- ✅ Le projet est complètement autonome
- ✅ Aucune dépendance globale n'est requise
- ✅ Les versions sont verrouillées et cohérentes
- ✅ Le projet peut être déplacé sans problème

## 🚀 Installation Rapide

### Option 1: Script PowerShell (Recommandé pour Windows)
```powershell
.\setup.ps1
```

### Option 2: Script Batch
```cmd
setup.bat
```

### Option 3: Installation manuelle
```bash
npm install
```

## 📦 Dépendances Principales

### Frontend Framework
- **React 18.3.1** - Framework UI principal
- **TypeScript 5.8.3** - Typage statique
- **Vite 5.4.19** - Build tool et serveur de développement

### UI Components
- **@radix-ui/** - Composants UI accessibles
- **Tailwind CSS 3.4.17** - Framework CSS utilitaire
- **Lucide React** - Icônes

### State Management & Data
- **@tanstack/react-query** - Gestion des données serveur
- **@supabase/supabase-js** - Base de données et authentification
- **React Hook Form** - Gestion des formulaires

### Routing & Navigation
- **React Router DOM** - Routage côté client

## 🔧 Configuration des Chemins

Les alias de chemins sont configurés dans :

### TypeScript (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Vite (`vite.config.ts`)
```typescript
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

## 📊 Taille des Dépendances

Après installation complète :
- **~393 packages** installés
- **~200-300 MB** d'espace disque utilisé
- Toutes les dépendances dans `./node_modules/`

## 🔍 Vérification des Vulnérabilités

Pour vérifier les vulnérabilités de sécurité :
```bash
npm audit
```

Pour corriger automatiquement :
```bash
npm audit fix
```

## 🧹 Nettoyage

Pour nettoyer et réinstaller :
```bash
# Supprimer node_modules et package-lock.json
rm -rf node_modules package-lock.json

# Réinstaller
npm install
```

## 📝 Scripts Disponibles

- `npm run dev` - Serveur de développement (port 8080)
- `npm run build` - Build de production
- `npm run build:dev` - Build de développement
- `npm run lint` - Vérification ESLint
- `npm run preview` - Prévisualisation du build

## 🔒 Sécurité

- Les dépendances sont verrouillées via `package-lock.json`
- Audit de sécurité automatique lors de l'installation
- Mise à jour régulière recommandée

## 🆘 Dépannage

### Problème : "Module not found"
1. Vérifiez que `node_modules` existe
2. Relancez `npm install`
3. Vérifiez les alias dans `tsconfig.json`

### Problème : "Permission denied"
1. Exécutez en tant qu'administrateur
2. Ou utilisez `npm install --no-optional`

### Problème : Espace disque insuffisant
1. Nettoyez le cache npm : `npm cache clean --force`
2. Supprimez les anciens `node_modules`
