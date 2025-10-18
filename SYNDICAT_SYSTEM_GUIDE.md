# 🏢 SYSTÈME BUREAUX SYNDICAUX - 224SOLUTIONS

## 📋 Vue d'ensemble

Le système de gestion des bureaux syndicaux permet au PDG de créer et gérer des bureaux syndicaux avec leurs travailleurs, d'enregistrer les motos, et de gérer les alertes et notifications.

## 🚀 Fonctionnalités Principales

### 1. **Interface PDG**
- ✅ **Création de bureaux** avec liens permanents
- ✅ **Gestion des travailleurs** avec niveaux d'accès
- ✅ **Statistiques globales** (bureaux, travailleurs, motos, alertes)
- ✅ **Renvoyer les liens** en cas de perte
- ✅ **Suspendre/Activer** les bureaux
- ✅ **Export des données** et rapports

### 2. **Interface Bureau Syndical**
- ✅ **Ajout de travailleurs** avec permissions
- ✅ **Enregistrement des motos** avec numéros de série
- ✅ **Gestion des alertes** et notifications
- ✅ **Contact équipe technique** (SMS, appel, email)
- ✅ **Statistiques du bureau** (travailleurs, motos, alertes)

### 3. **Interface Travailleur**
- ✅ **Enregistrement de ses motos**
- ✅ **Consultation des alertes** personnelles
- ✅ **Contact équipe technique**
- ✅ **Statistiques personnelles**

## 🗄️ Structure de la Base de Données

### Tables Principales

#### `bureaux_syndicaux`
- `id` (UUID) - Identifiant unique
- `nom` (VARCHAR) - Nom du bureau
- `email_president` (VARCHAR) - Email du président
- `ville` (VARCHAR) - Ville du bureau
- `telephone` (VARCHAR) - Téléphone du bureau
- `interface_url` (TEXT) - Lien permanent d'accès
- `token` (VARCHAR) - Token unique pour l'accès
- `is_active` (BOOLEAN) - Statut actif/suspendu

#### `travailleurs`
- `id` (UUID) - Identifiant unique
- `bureau_id` (UUID) - Référence au bureau
- `nom` (VARCHAR) - Nom du travailleur
- `email` (VARCHAR) - Email du travailleur
- `telephone` (VARCHAR) - Téléphone du travailleur
- `interface_url` (TEXT) - Lien permanent d'accès
- `token` (VARCHAR) - Token unique pour l'accès
- `access_level` (VARCHAR) - Niveau d'accès (limité, standard, élevé)
- `is_active` (BOOLEAN) - Statut actif/suspendu

#### `motos`
- `id` (UUID) - Identifiant unique
- `bureau_id` (UUID) - Référence au bureau
- `travailleur_id` (UUID) - Référence au travailleur (optionnel)
- `numero_serie` (VARCHAR) - Numéro de série unique
- `marque` (VARCHAR) - Marque de la moto
- `modele` (VARCHAR) - Modèle de la moto
- `annee` (INTEGER) - Année de la moto
- `couleur` (VARCHAR) - Couleur de la moto
- `statut` (VARCHAR) - Statut (actif, inactif, maintenance, volé)

#### `alertes`
- `id` (UUID) - Identifiant unique
- `bureau_id` (UUID) - Référence au bureau
- `travailleur_id` (UUID) - Référence au travailleur (optionnel)
- `type` (VARCHAR) - Type d'alerte
- `level` (VARCHAR) - Niveau (info, warning, critical)
- `message` (TEXT) - Message de l'alerte
- `is_resolved` (BOOLEAN) - Statut résolu/non résolu

## 🔧 Installation et Configuration

### 1. **Migration de la Base de Données**

```bash
# Exécuter la migration
chmod +x scripts/run-syndicat-migration.sh
./scripts/run-syndicat-migration.sh
```

### 2. **Configuration des Variables d'Environnement**

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Email SMTP
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Frontend URL
FRONTEND_URL=https://your-domain.com
```

### 3. **Routes Backend**

Les routes sont disponibles dans `backend/src/routes/syndicat.js` :

- `POST /api/syndicat/create-bureau` - Créer un bureau
- `POST /api/syndicat/create-travailleur` - Créer un travailleur
- `POST /api/syndicat/resend-link` - Renvoyer un lien
- `GET /api/syndicat/stats` - Statistiques globales
- `GET /api/syndicat/bureaux` - Liste des bureaux
- `GET /api/syndicat/travailleurs` - Liste des travailleurs

## 🎯 Utilisation

### **Pour le PDG**

1. **Accéder à l'interface PDG** : `/pdg`
2. **Onglet "Bureaux Syndicaux"** : Gestion complète
3. **Créer un bureau** : Formulaire avec nom, email, ville
4. **Email automatique** : Lien permanent envoyé au président
5. **Gestion des travailleurs** : Ajout, permissions, liens

### **Pour les Bureaux**

1. **Accès via lien permanent** : `/bureau/{token}`
2. **Interface bureau** : Gestion des travailleurs et motos
3. **Ajout de travailleurs** : Avec niveaux d'accès
4. **Enregistrement motos** : Numéros de série
5. **Contact technique** : SMS, appel, email

### **Pour les Travailleurs**

1. **Accès via lien permanent** : `/travailleur/{token}`
2. **Interface travailleur** : Gestion de ses motos
3. **Alertes personnelles** : Notifications importantes
4. **Contact technique** : Support direct

## 🔒 Sécurité

### **Contrôle d'Accès**
- **PDG** : Accès total à tous les bureaux et travailleurs
- **Bureaux** : Accès limité à leur bureau uniquement
- **Travailleurs** : Accès limité à leurs données

### **Liens Permanents**
- **Tokens uniques** : Chaque bureau/travailleur a un token unique
- **Liens sécurisés** : Accès direct sans authentification complexe
- **Renvoi possible** : En cas de perte du lien

### **Audit et Traçabilité**
- **Logs complets** : Toutes les actions sont enregistrées
- **Historique** : Suivi des modifications
- **Notifications** : Alertes automatiques

## 📊 Statistiques et Rapports

### **Tableau de Bord PDG**
- **Bureaux totaux** : Nombre de bureaux créés
- **Travailleurs** : Nombre total de travailleurs
- **Motos enregistrées** : Nombre total de motos
- **Alertes critiques** : Alertes nécessitant attention
- **Bureaux actifs** : Bureaux en fonctionnement

### **Exports Disponibles**
- **Liste des bureaux** : CSV/Excel
- **Liste des travailleurs** : Par bureau ou global
- **Rapport des motos** : Enregistrements et statuts
- **Historique des alertes** : Par période

## 🚨 Alertes et Notifications

### **Types d'Alertes**
- **Info** : Informations générales
- **Warning** : Avertissements
- **Critical** : Alertes critiques nécessitant action

### **Système de Notifications**
- **Email automatique** : Création de comptes
- **Notifications in-app** : Alertes en temps réel
- **Contact technique** : Support direct

## 🔄 Workflow Complet

### **1. Création d'un Bureau**
1. PDG crée le bureau via l'interface
2. Email automatique avec lien permanent
3. Bureau accède à son interface
4. Attribution automatique des fonctionnalités

### **2. Ajout de Travailleurs**
1. Bureau ajoute des travailleurs
2. Email automatique avec lien permanent
3. Travailleur accède à son interface
4. Permissions selon le niveau d'accès

### **3. Enregistrement des Motos**
1. Bureau ou travailleur enregistre une moto
2. Numéro de série unique
3. Association bureau/travailleur
4. Suivi des statuts

### **4. Gestion des Alertes**
1. Génération automatique d'alertes
2. Notification aux concernés
3. Suivi de résolution
4. Historique complet

## 🛠️ Maintenance et Support

### **Fonctionnalités Automatiques**
- **Attribution de fonctionnalités** : Nouvelles fonctionnalités ajoutées automatiquement
- **Versioning** : Mise à jour des fonctionnalités
- **Backup** : Sauvegarde automatique des données

### **Support Technique**
- **Contact direct** : SMS, appel, email
- **Documentation** : Guides d'utilisation
- **Formation** : Support utilisateur

## 📈 Évolutions Futures

### **Fonctionnalités Prévues**
- **Géolocalisation** : Suivi des motos en temps réel
- **Paiements** : Intégration système de paiement
- **Analytics** : Tableaux de bord avancés
- **Mobile App** : Application mobile native

### **Intégrations**
- **Système de paiement** : Intégration Orange Money, MTN Money
- **SMS Gateway** : Notifications SMS automatiques
- **API externes** : Intégration avec services tiers

---

## 🎉 Résumé

Le système de bureaux syndicaux 224Solutions offre une solution complète pour :

✅ **Gestion centralisée** des bureaux et travailleurs  
✅ **Liens permanents** pour accès facile  
✅ **Enregistrement des motos** avec suivi  
✅ **Alertes et notifications** automatiques  
✅ **Contact technique** intégré  
✅ **Statistiques et rapports** détaillés  
✅ **Sécurité et audit** complets  

**Le système est prêt à être utilisé et peut gérer des milliers de bureaux et travailleurs avec une interface intuitive et des fonctionnalités avancées.**
