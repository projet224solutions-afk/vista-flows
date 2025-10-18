# 🔄 CHECKLIST DE ROLLBACK - 224SOLUTIONS

## Vue d'ensemble
Cette checklist permet de revenir rapidement à un état stable en cas de problème après un déploiement.

## 🚨 ROLLBACK RAPIDE (5 minutes)

### 1. Arrêter le déploiement en cours
```bash
# Arrêter le déploiement automatique
kubectl rollout pause deployment/224solutions-frontend -n production
kubectl rollout pause deployment/224solutions-backend -n production

# Vérifier l'état actuel
kubectl get deployments -n production
```

### 2. Rollback Kubernetes
```bash
# Rollback vers la version précédente
kubectl rollout undo deployment/224solutions-frontend -n production
kubectl rollout undo deployment/224solutions-backend -n production

# Vérifier le rollback
kubectl rollout status deployment/224solutions-frontend -n production
kubectl rollout status deployment/224solutions-backend -n production
```

### 3. Vérifier la santé du système
```bash
# Vérifier les pods
kubectl get pods -n production

# Vérifier les logs
kubectl logs -f deployment/224solutions-frontend -n production
kubectl logs -f deployment/224solutions-backend -n production

# Test de connectivité
curl -f https://224solutions.com/health || echo "Service non disponible"
```

## 🔧 ROLLBACK COMPLET (15 minutes)

### 1. Rollback de la base de données
```bash
# Identifier le backup le plus récent
ls -la /backups/pre_change_*.sql

# Restaurer la base de données
pg_dump -h localhost -U postgres -d 224solutions_backup > /tmp/current_backup.sql
psql -h localhost -U postgres -d 224solutions -f /backups/pre_change_$(date +%F_%T).sql

# Vérifier la restauration
psql -h localhost -U postgres -d 224solutions -c "SELECT COUNT(*) FROM users;"
```

### 2. Rollback des migrations
```bash
# Lister les migrations récentes
ls -la database/migrations/ | tail -10

# Rollback des migrations (si nécessaire)
npm run db:migrate:rollback

# Vérifier l'état de la base
npm run db:migrate:status
```

### 3. Rollback des secrets
```bash
# Restaurer les secrets depuis le backup
kubectl create secret generic app-secrets \
  --from-literal=PDG_ACCESS_CODE="backup_value" \
  --from-literal=ADMIN_ACCESS_CODE="backup_value" \
  -n production

# Vérifier les secrets
kubectl get secrets -n production
```

## 🛡️ ROLLBACK SÉCURISÉ (30 minutes)

### 1. Désactiver les feature flags
```bash
# Désactiver toutes les nouvelles fonctionnalités
kubectl patch configmap feature-flags -n production -p '{"data":{"ai_insights":"false","enhanced_auth":"false","financial_alerts":"false"}}'

# Redémarrer les services pour appliquer les changements
kubectl rollout restart deployment/224solutions-frontend -n production
kubectl rollout restart deployment/224solutions-backend -n production
```

### 2. Rollback des configurations
```bash
# Restaurer les configurations précédentes
kubectl apply -f k8s/production/backup/

# Vérifier les configurations
kubectl get configmaps -n production
kubectl get secrets -n production
```

### 3. Nettoyer les ressources temporaires
```bash
# Supprimer les ressources temporaires
kubectl delete job temp-migration-job -n production --ignore-not-found=true
kubectl delete pod temp-backup-pod -n production --ignore-not-found=true

# Nettoyer les volumes temporaires
kubectl delete pvc temp-storage -n production --ignore-not-found=true
```

## 📊 VÉRIFICATIONS POST-ROLLBACK

### 1. Tests de santé
```bash
# Tests de connectivité
curl -f https://224solutions.com/api/health
curl -f https://224solutions.com/api/auth/status

# Tests de base de données
npm run test:db:connection

# Tests des services critiques
npm run test:critical:services
```

### 2. Monitoring
```bash
# Vérifier les métriques
kubectl top pods -n production

# Vérifier les logs d'erreur
kubectl logs -f deployment/224solutions-backend -n production | grep -i error

# Vérifier les alertes
kubectl get events -n production --sort-by='.lastTimestamp'
```

### 3. Notifications
```bash
# Notifier l'équipe
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🔄 ROLLBACK EFFECTUÉ - 224Solutions est revenu à un état stable"}' \
  $SLACK_WEBHOOK_URL

# Notifier les utilisateurs (si nécessaire)
# Envoyer un email de maintenance si le rollback a causé une interruption
```

## 🚨 ROLLBACK D'URGENCE (2 minutes)

### En cas de problème critique
```bash
# Rollback immédiat vers la version stable
kubectl rollout undo deployment/224solutions-frontend -n production --to-revision=0
kubectl rollout undo deployment/224solutions-backend -n production --to-revision=0

# Redémarrer tous les services
kubectl delete pods -l app=224solutions-frontend -n production
kubectl delete pods -l app=224solutions-backend -n production

# Vérifier que les services redémarrent
kubectl get pods -n production -w
```

## 📋 CHECKLIST DE VALIDATION

- [ ] Services redémarrés avec succès
- [ ] Base de données restaurée
- [ ] Tests de santé passent
- [ ] Monitoring fonctionne
- [ ] Alertes désactivées
- [ ] Équipe notifiée
- [ ] Documentation mise à jour
- [ ] Post-mortem planifié

## 🔍 TROUBLESHOOTING

### Problèmes courants
1. **Pods ne redémarrent pas** : Vérifier les quotas de ressources
2. **Base de données corrompue** : Utiliser le backup le plus récent
3. **Secrets manquants** : Restaurer depuis le backup sécurisé
4. **DNS non résolu** : Vérifier les services de découverte

### Contacts d'urgence
- **DevOps Lead** : +224 XXX XX XX XX
- **Database Admin** : +224 XXX XX XX XX
- **Security Team** : security@224solutions.com

## 📝 NOTES IMPORTANTES

1. **Toujours** créer un backup avant le rollback
2. **Documenter** toutes les actions effectuées
3. **Tester** le rollback en environnement de staging
4. **Former** l'équipe sur les procédures de rollback
5. **Maintenir** cette checklist à jour

---

**Dernière mise à jour** : $(date)
**Version** : 1.0
**Responsable** : Équipe DevOps 224Solutions
