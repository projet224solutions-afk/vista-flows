# 🚀 GUIDE RAPIDE - CORRECTION VENDEURS INVISIBLES

## ❌ Problème
Les 7 vendeurs du marketplace ne sont **PAS visibles** dans l'interface PDG (0/7 = 0%).

## ✅ Solution en 3 étapes

### ÉTAPE 1: Ouvrir Supabase Dashboard
🔗 https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql

### ÉTAPE 2: Copier-Coller les Migrations

#### Migration 1: Créer les profils
```bash
# Ouvrir le fichier
code supabase/migrations/20260110000000_create_missing_vendor_profiles.sql

# Copier TOUT le contenu
# Coller dans SQL Editor
# Cliquer RUN
```

#### Migration 2: Installer les triggers
```bash
# Ouvrir le fichier
code supabase/migrations/20260110000001_auto_create_vendor_profiles_trigger.sql

# Copier TOUT le contenu
# Coller dans SQL Editor
# Cliquer RUN
```

### ÉTAPE 3: Vérifier
```bash
node check-pdg-users-display.js
# Résultat attendu: ✅ 7/7 utilisateurs trouvés (100%)
```

## 🎯 Résultat

Après les migrations:
- ✅ Les 7 vendeurs apparaissent dans /pdg → Utilisateurs
- ✅ Le PDG peut les suspendre/activer
- ✅ Le PDG peut voir leurs services
- ✅ Détails complets affichés (business, téléphone, adresse, rating)

## 🛠️ Interface Améliorée

L'interface PDG affiche maintenant:
- 👤 Profil du vendeur (nom, email, rôle)
- 🏪 Badge avec nombre de services
- 👁️ Bouton "Services" pour voir les détails
- 📊 Pour chaque service:
  - Nom du business
  - Status (active/pending/inactive)
  - Type de service
  - Téléphone et adresse
  - Rating et nombre d'avis
  - Date de création

## 📱 Tester

1. Ouvrir http://localhost:5173/pdg
2. Onglet "Utilisateurs"
3. Rechercher "Fusion Digitale" ou "BARRY"
4. Cliquer "Services" pour voir les détails
5. Tester "Suspendre" puis "Activer"

## 📚 Documentation

Pour plus de détails, voir:
- RAPPORT_CRITIQUE_VENDEURS_PDG_INVISIBLES.md (Analyse complète)
- RAPPORT_ANALYSE_MARKETPLACE_AUTHENTICITE.md (Vérification services)
