# 🔧 GUIDE D'INSTALLATION - MOYENS DE PAIEMENT

## ⚠️ Problème : "Impossible de charger les moyens de paiement"

### Cause
La table `user_payment_methods` n'existe pas encore dans votre base de données Supabase.

---

## ✅ Solution : Exécuter la Migration SQL

### Étape 1️⃣ : Accéder à Supabase SQL Editor

1. Connectez-vous à [https://supabase.com](https://supabase.com)
2. Sélectionnez votre projet **224Solutions**
3. Cliquez sur **SQL Editor** dans le menu de gauche

### Étape 2️⃣ : Exécuter la Migration

1. Cliquez sur **"New Query"**
2. Copiez le contenu du fichier :
   ```
   supabase/migrations/20251130_user_payment_methods.sql
   ```
3. Collez-le dans l'éditeur SQL
4. Cliquez sur **"Run"** (ou appuyez sur `Ctrl+Enter`)

### Étape 3️⃣ : Vérifier l'Installation

Exécutez cette requête pour vérifier :

```sql
-- Vérifier que la table existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'user_payment_methods';

-- Vérifier les moyens de paiement créés par défaut
SELECT user_id, method_type, is_default, is_active 
FROM user_payment_methods 
LIMIT 5;
```

---

## 📊 Résultat Attendu

Après l'exécution de la migration :

### ✅ Table Créée
```
user_payment_methods
├── id (UUID)
├── user_id (UUID) → référence auth.users
├── method_type (VARCHAR) → wallet, orange_money, mtn_money, cash, bank_card
├── phone_number (VARCHAR) → pour mobile money
├── card_last_four (VARCHAR) → derniers 4 chiffres carte
├── label (VARCHAR) → nom personnalisé
├── is_default (BOOLEAN)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── last_used_at (TIMESTAMP)
```

### ✅ Fonctionnalités Activées
- RLS (Row Level Security) configuré
- Policies de sécurité (SELECT, INSERT, UPDATE, DELETE)
- Trigger pour garantir un seul moyen par défaut
- Index de performance
- Wallet 224Solutions créé automatiquement pour tous les utilisateurs existants

### ✅ Vue Statistiques
```sql
-- Vue pour voir les statistiques d'utilisation
SELECT * FROM payment_methods_stats;
```

---

## 🎯 Après Installation

### Dans l'Interface Client

Allez dans **Portefeuille** → Onglet **"Moyens de paiement"**

Vous devriez voir :
- ✅ Portefeuille 224Solutions (par défaut)
- ✅ Bouton "Ajouter un moyen de paiement"
- ✅ Possibilité d'ajouter : Orange Money, MTN, Espèces, Carte bancaire

### Création Automatique

Si la table existe mais qu'un utilisateur n'a aucun moyen de paiement :
- Le système crée automatiquement le **Portefeuille 224Solutions** par défaut
- C'est fait automatiquement lors du premier chargement

---

## 🐛 Dépannage

### Erreur : "relation does not exist"
➡️ La migration n'a pas été exécutée. Retournez à l'Étape 2.

### Erreur : "permission denied"
➡️ Vérifiez que votre utilisateur Supabase a les droits d'exécution SQL.

### Erreur : "duplicate key value"
➡️ Normal si vous réexécutez la migration. Les données existantes sont préservées.

### Aucun moyen de paiement affiché
1. Ouvrez la console navigateur (F12)
2. Regardez les logs dans Console
3. Si vous voyez "Aucun moyen de paiement trouvé, création du wallet par défaut..."
   - C'est normal, le wallet se crée automatiquement

---

## 📝 Structure Migration SQL

Le fichier `20251130_user_payment_methods.sql` contient :

```sql
-- 1. Création table user_payment_methods
CREATE TABLE IF NOT EXISTS public.user_payment_methods (...)

-- 2. Index de performance
CREATE INDEX idx_user_payment_methods_user ON ...

-- 3. Trigger pour updated_at
CREATE TRIGGER trigger_user_payment_methods_updated_at...

-- 4. RLS Policies
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs voient leurs moyens de paiement"...

-- 5. Fonction single default
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()...

-- 6. Insertion wallet par défaut pour users existants
INSERT INTO public.user_payment_methods (user_id, method_type, ...)

-- 7. Vue statistiques
CREATE OR REPLACE VIEW public.payment_methods_stats AS...
```

---

## 🚀 Commandes Utiles

### Vérifier les moyens de paiement d'un utilisateur
```sql
SELECT * FROM user_payment_methods 
WHERE user_id = 'VOTRE_USER_ID';
```

### Voir le moyen par défaut
```sql
SELECT * FROM user_payment_methods 
WHERE is_default = true;
```

### Compter les moyens par type
```sql
SELECT method_type, COUNT(*) 
FROM user_payment_methods 
GROUP BY method_type;
```

### Réinitialiser (⚠️ ATTENTION : supprime tout)
```sql
DELETE FROM user_payment_methods;
```

---

## ✨ Prochaines Étapes

Une fois la migration installée, vous pourrez :
1. ✅ Ajouter vos moyens de paiement préférés
2. ✅ Définir un moyen par défaut
3. ✅ Activer/désactiver des moyens
4. ✅ Utiliser ces moyens dans toutes les transactions
5. ✅ Paiements plus rapides avec moyen pré-enregistré

---

**📞 Support** : Si le problème persiste après l'installation de la migration, vérifiez les logs console du navigateur et de Supabase.
