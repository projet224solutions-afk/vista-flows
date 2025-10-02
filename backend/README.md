# 🚀 BACKEND OPENAI 224SOLUTIONS

Backend Express/Node.js avec intégration OpenAI GPT-4o-mini pour l'analyse de projets.

## 🎯 FONCTIONNALITÉS

### 🤖 Service OpenAI
- **Endpoint**: `POST /api/openai/analyse-projet`
- **Accès**: PDG/Admin uniquement
- **Rate Limiting**: 50 requêtes/heure par utilisateur
- **Modèle**: GPT-4o-mini optimisé pour 224Solutions

### 🔐 Sécurité
- Authentification JWT obligatoire
- Permissions basées sur les rôles
- Rate limiting global et spécifique OpenAI
- Logging sécurisé avec Winston
- Validation des données entrantes

### 📊 Monitoring
- Routes de santé (`/api/health`)
- Métriques système en temps réel
- Logging structuré avec rotation

## 🚀 DÉMARRAGE RAPIDE

### 1. Configuration
```bash
# Copier le fichier d'environnement
cp env.example .env

# Éditer .env avec vos vraies clés API
# OPENAI_API_KEY=sk-votre-vraie-cle-openai
# SUPABASE_SERVICE_ROLE_KEY=votre-cle-supabase
```

### 2. Installation
```bash
npm install
```

### 3. Démarrage
```bash
# Développement (avec nodemon)
npm run dev

# Production
npm start
```

Le serveur démarre sur `http://localhost:3001`

## 📡 ENDPOINTS DISPONIBLES

### 🏥 Santé du serveur
```http
GET /api/health              # Santé basique
GET /api/health/detailed     # Santé détaillée avec tous les services
GET /api/health/metrics      # Métriques système
GET /api/health/readiness    # Vérification de disponibilité
GET /api/health/liveness     # Vérification de vie
```

### 🔐 Authentification
```http
POST /api/auth/login         # Connexion utilisateur
POST /api/auth/register      # Inscription utilisateur
GET  /api/auth/me            # Profil utilisateur connecté
POST /api/auth/refresh       # Renouveler le token JWT
POST /api/auth/logout        # Déconnexion
```

### 🤖 OpenAI (PDG/Admin uniquement)
```http
POST /api/openai/analyse-projet    # Analyser un projet
GET  /api/openai/stats             # Statistiques d'utilisation
GET  /api/openai/test-connection   # Tester la connexion OpenAI
```

## 🔑 UTILISATION DE L'API OPENAI

### Authentification requise
Toutes les routes OpenAI nécessitent un token JWT valide avec rôle PDG ou Admin.

### Exemple d'utilisation

#### 1. Connexion
```javascript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'pdg@224solutions.com',
    password: 'votre-mot-de-passe'
  })
});

const { data } = await response.json();
const token = data.token;
```

#### 2. Analyse de projet
```javascript
const analysisResponse = await fetch('http://localhost:3001/api/openai/analyse-projet', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    texte: "Je veux créer une application mobile pour la livraison de nourriture en Guinée. L'app permettra aux restaurants de s'inscrire, aux clients de commander et aux livreurs de prendre les commandes. Je vise 10000 utilisateurs en 6 mois.",
    options: {
      focusArea: "Analyse technique et business",
      budget: "50000 USD",
      timeline: "6 mois"
    }
  })
});

const analysis = await analysisResponse.json();
console.log(analysis.data);
```

### Format de réponse OpenAI
```json
{
  "success": true,
  "message": "Analyse terminée avec succès",
  "data": {
    "resume": "Résumé exécutif du projet",
    "analyse_technique": {
      "faisabilite": "8/10 - Projet réalisable avec les bonnes ressources",
      "complexite": "Moyenne - Nécessite expertise mobile et backend",
      "technologies_recommandees": ["React Native", "Node.js", "PostgreSQL"],
      "integration_224solutions": "Intégration possible avec le système de wallet existant"
    },
    "analyse_business": {
      "potentiel_marche": "Fort potentiel en Guinée avec croissance mobile",
      "modele_economique": "Commission sur transactions + abonnements restaurants",
      "concurrence": "Marché émergent avec peu de concurrents établis",
      "risques": ["Adoption utilisateurs", "Logistique livraison"]
    },
    "recommandations": {
      "priorite": "Haute",
      "etapes_implementation": ["MVP mobile", "Partenariats restaurants", "Réseau livreurs"],
      "ressources_necessaires": "Équipe de 5 développeurs, 6 mois, 45000 USD",
      "kpis_succes": ["Nombre de commandes/jour", "Taux de rétention", "Temps de livraison"]
    },
    "conclusion": "GO - Projet aligné avec la stratégie 224Solutions et fort potentiel de croissance"
  },
  "metadata": {
    "model": "gpt-4o-mini",
    "tokensUsed": 856,
    "duration": 2340,
    "timestamp": "2024-10-02T15:30:45.123Z"
  }
}
```

## 🛡️ SÉCURITÉ

### Rate Limiting
- **Global**: 100 requêtes/15 minutes par IP
- **Authentification**: 5 tentatives/15 minutes par IP
- **OpenAI**: 50 requêtes/heure par utilisateur

### Permissions
- **OpenAI**: Rôles `pdg` et `admin` uniquement
- **Authentification**: Tous les utilisateurs
- **Santé**: Accès public

### Logging
Tous les événements sont loggés de manière sécurisée :
- Connexions/déconnexions
- Tentatives d'accès non autorisées
- Utilisation de l'API OpenAI
- Erreurs système

## 🔧 CONFIGURATION

### Variables d'environnement requises
```env
# Serveur
NODE_ENV=development
PORT=3001

# OpenAI
OPENAI_API_KEY=sk-votre-cle-openai-ici
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# JWT
JWT_SECRET=votre-secret-jwt-ultra-securise
JWT_EXPIRES_IN=24h

# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-cle-anon
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_OPENAI_WINDOW_MS=3600000
RATE_LIMIT_OPENAI_MAX_REQUESTS=50
```

## 📊 MONITORING

### Logs
Les logs sont stockés dans le dossier `logs/` :
- `app.log` - Tous les logs
- `error.log` - Erreurs uniquement
- `http.log` - Requêtes HTTP

### Métriques disponibles
- Uptime du serveur
- Utilisation mémoire
- Utilisation CPU
- Nombre de requêtes
- Temps de réponse

## 🚀 DÉPLOIEMENT

### Prérequis
- Node.js 18+
- npm ou yarn
- Clé API OpenAI valide
- Base de données Supabase configurée

### Production
```bash
# Variables d'environnement
NODE_ENV=production
LOG_LEVEL=warn

# Démarrage
npm start
```

## 📞 SUPPORT

Pour toute question ou problème :
- Vérifiez les logs dans `logs/`
- Testez la santé avec `GET /api/health/detailed`
- Vérifiez la configuration OpenAI avec `GET /api/openai/test-connection`

---

**🎉 Votre backend OpenAI 224Solutions est prêt à analyser tous vos projets !**
