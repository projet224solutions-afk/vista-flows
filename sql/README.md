# Fonctions SQL Supabase - 224SOLUTIONS

## 📋 Instructions d'installation

1. **Ouvrez le dashboard Supabase** : https://supabase.com/dashboard
2. **Sélectionnez votre projet** : uakkxaibujzxdiqzpnpr
3. **Allez dans l'onglet SQL Editor**
4. **Exécutez les requêtes** dans l'ordre suivant :

### Ordre d'exécution recommandé :

1. `generate_custom_id.sql` - Fonction de base
2. `create_user_complete.sql` - Création d'utilisateurs
3. `get_user_complete.sql` - Récupération d'utilisateurs
4. `process_transaction.sql` - Transactions
5. `get_wallet_balance.sql` - Solde des wallets
6. `create_order.sql` - Création de commandes
7. `update_order_status.sql` - Mise à jour des commandes
8. `log_security_incident.sql` - Incidents de sécurité
9. `block_ip_address.sql` - Blocage d'IP
10. `clean_demo_data.sql` - Nettoyage des données
11. `update_locations_to_guinea.sql` - Mise à jour des localisations

### Alternative : Exécution en une fois

Vous pouvez aussi exécuter directement `all-functions.sql` qui contient toutes les fonctions.

## 🔧 Fonctions disponibles

- **generate_custom_id()** : Génère des IDs personnalisés
- **create_user_complete()** : Crée un utilisateur complet
- **get_user_complete()** : Récupère un utilisateur complet
- **process_transaction()** : Traite les transactions
- **get_wallet_balance()** : Récupère le solde d'un wallet
- **create_order()** : Crée une commande
- **update_order_status()** : Met à jour le statut d'une commande
- **log_security_incident()** : Enregistre un incident de sécurité
- **block_ip_address()** : Bloque une adresse IP
- **clean_demo_data()** : Nettoie les données de démonstration
- **update_locations_to_guinea()** : Met à jour les localisations

## 📊 Vérification

Après installation, vous pouvez vérifier que les fonctions sont créées en exécutant :

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
```

## 🚀 Prochaines étapes

1. Exécuter les requêtes SQL dans Supabase
2. Vérifier que les fonctions sont créées
3. Tester le système complet
4. Déployer en production
