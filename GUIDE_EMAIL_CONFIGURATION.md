# 📧 GUIDE DE CONFIGURATION EMAIL - 224SOLUTIONS

## 🎯 Objectif
Ce guide vous explique comment configurer le système d'envoi d'emails pour les bureaux syndicaux dans 224Solutions.

## 🚀 Configuration Rapide

### 1. Configuration Gmail (Recommandé)

#### Étape 1: Activer l'authentification à 2 facteurs
1. Allez sur [myaccount.google.com](https://myaccount.google.com)
2. Sécurité → Authentification à 2 facteurs → Activer

#### Étape 2: Générer un mot de passe d'application
1. Sécurité → Authentification à 2 facteurs → Mots de passe des applications
2. Sélectionnez "Autre" et tapez "224Solutions"
3. Copiez le mot de passe généré (16 caractères)

#### Étape 3: Configurer le fichier .env
```bash
cd backend
cp env.example .env
```

Modifiez le fichier `.env` :
```env
# 📧 Email Configuration (Gmail)
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # Mot de passe d'application (16 caractères)
EMAIL_FROM=224Solutions <noreply@224solutions.com>
```

### 2. Configuration SMTP Alternative

Si vous n'utilisez pas Gmail, configurez votre fournisseur SMTP :

```env
# 📧 Alternative SMTP Configuration
SMTP_HOST=smtp.votre-fournisseur.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre_utilisateur_smtp
SMTP_PASSWORD=votre_mot_de_passe_smtp
EMAIL_FROM=224Solutions <noreply@votre-domaine.com>
```

### Fournisseurs SMTP populaires :

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=votre_api_key_sendgrid
```

## 🧪 Test de Configuration

### 1. Démarrer le backend
```bash
cd backend
npm install
npm run dev
```

### 2. Tester la configuration
```bash
node test-email-system.js
```

### 3. Test depuis l'interface
1. Connectez-vous en tant que PDG
2. Allez dans l'onglet "Bureau Syndicat"
3. Créez un nouveau bureau syndical
4. Vérifiez que l'email est envoyé

## 🔧 Dépannage

### Erreur "Authentication failed"
- ✅ Vérifiez que l'authentification à 2 facteurs est activée
- ✅ Utilisez un mot de passe d'application, pas votre mot de passe principal
- ✅ Vérifiez que l'email et le mot de passe sont corrects

### Erreur "Connection timeout"
- ✅ Vérifiez votre connexion internet
- ✅ Vérifiez que le port SMTP n'est pas bloqué par un firewall
- ✅ Essayez un autre port (465 pour SSL, 587 pour TLS)

### Erreur "Invalid recipient"
- ✅ Vérifiez que l'adresse email du destinataire est valide
- ✅ Vérifiez qu'il n'y a pas d'espaces dans l'adresse email

### Emails non reçus
- ✅ Vérifiez le dossier spam/courrier indésirable
- ✅ Vérifiez que l'adresse EMAIL_FROM est valide
- ✅ Testez avec une autre adresse email

## 📋 Template d'Email

Le système génère automatiquement un email professionnel avec :

- 🏛️ En-tête 224Solutions avec logo
- 📋 Informations complètes du bureau syndical
- 🔐 Lien d'accès permanent sécurisé
- 🔑 Token d'accès unique
- 📞 Informations de contact support

## 🛡️ Sécurité

### Rate Limiting
- Maximum 10 emails par 15 minutes par utilisateur
- Protection contre le spam et l'abus

### Authentification
- Tous les endpoints email nécessitent une authentification JWT
- Logs complets de tous les envois d'emails

### Données Sensibles
- Les tokens d'accès sont générés de manière sécurisée
- Les mots de passe d'email ne sont jamais loggés
- Chiffrement TLS pour tous les envois

## 📊 Monitoring

### Logs
Les envois d'emails sont loggés dans :
- Console du serveur (développement)
- Fichier `logs/app.log` (production)

### Métriques
- Nombre d'emails envoyés
- Taux de succès/échec
- Temps de réponse SMTP

## 🚀 Mise en Production

### Variables d'environnement
```env
NODE_ENV=production
EMAIL_USER=production@224solutions.com
EMAIL_PASSWORD=mot_de_passe_production_securise
EMAIL_FROM=224Solutions <noreply@224solutions.com>
```

### Recommandations
1. Utilisez un service email professionnel (SendGrid, Mailgun, etc.)
2. Configurez SPF, DKIM et DMARC pour votre domaine
3. Surveillez les métriques de délivrabilité
4. Testez régulièrement l'envoi d'emails

## 📞 Support

En cas de problème :
1. Vérifiez les logs du serveur
2. Testez avec `test-email-system.js`
3. Consultez la documentation de votre fournisseur email
4. Contactez le support technique 224Solutions

---

**✅ Configuration terminée !** Votre système d'email est maintenant opérationnel pour les bureaux syndicaux.
