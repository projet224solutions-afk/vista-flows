# Test des Fonctionnalités Forensiques

## Tables créées ✓
- ✅ security_incidents
- ✅ security_alerts
- ✅ security_audit_logs
- ✅ security_snapshots
- ✅ blocked_ips
- ✅ forensic_reports

## Edge Function déployée ✓
- ✅ security-forensics

## Tests à effectuer

### 1. Création de Snapshot
Dans l'interface PDG → Sécurité → Forensique → Onglet "Snapshots":
- Cliquer sur "Créer un Snapshot"
- Vérifier qu'un message de succès apparaît
- Le snapshot doit apparaître dans la liste

### 2. Analyse Comportementale
Onglet "Comportement":
- Optionnel: Entrer un ID utilisateur
- Cliquer sur "Lancer l'Analyse"
- Vérifier l'affichage de:
  - Score d'anomalie
  - Niveau de risque
  - Patterns détectés
  - Recommandations

### 3. Corrélation d'Événements
Onglet "Corrélation":
- Créer d'abord un incident de test via l'interface de gestion des incidents
- Copier l'ID de l'incident
- Coller dans le champ "ID Incident"
- Cliquer sur "Corréler les Événements"
- Vérifier le message de succès

### 4. Reconstruction de Timeline
Onglet "Timeline":
- Utiliser le même ID d'incident
- Cliquer sur "Reconstruire la Timeline"
- La timeline doit afficher chronologiquement tous les événements liés

### 5. Génération de Rapport
Onglet "Rapports":
- Utiliser un ID d'incident existant
- Cliquer sur "Générer le Rapport"
- Un fichier JSON doit être téléchargé avec le rapport complet

### 6. Export vers SIEM
Onglet "Rapports":
- Sélectionner un type de SIEM (Splunk, ELK, QRadar, etc.)
- Entrer un ID d'incident
- Cliquer sur "Exporter"
- Vérifier le message de succès

### 7. Export des Logs d'Audit
Onglet "Snapshots":
- Cliquer sur "Exporter les Logs"
- Un fichier JSON avec les logs doit être téléchargé

## Données de Test à Créer (optionnel)

Pour tester pleinement, vous pouvez créer via l'interface de gestion:
1. **Incidents de test** avec différents niveaux de sévérité
2. **Alertes** liées aux incidents
3. **Actions de blocage d'IP** via l'interface de sécurité

## Vérification des Fonctionnalités

### ✅ Fonctionnalités Implémentées
1. ✅ Analyse comportementale avancée
2. ✅ Corrélation d'événements multi-sources
3. ✅ Reconstruction de timeline d'incidents
4. ✅ Génération de rapports forensiques
5. ✅ Intégration avec outils SIEM externes (Splunk, ELK, QRadar, Azure Sentinel, Sumo Logic)
6. ✅ Export des logs d'audit
7. ✅ Création de snapshots système

### Détails Techniques
- **Analyse comportementale**: Calcule un score d'anomalie basé sur l'activité utilisateur
- **Corrélation**: Agrège incidents, alertes et logs d'audit avec recherche par IP
- **Timeline**: Reconstruit chronologiquement tous les événements liés à un incident
- **Rapports**: Génère des rapports JSON complets avec résumé exécutif
- **SIEM**: Formate les données selon le format du SIEM cible
- **Snapshots**: Capture l'état du système (incidents, alertes, IPs bloquées)
