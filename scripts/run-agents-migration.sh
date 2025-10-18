#!/bin/bash
# scripts/run-agents-migration.sh
# Script pour exécuter la migration du système agents/sous-agents/utilisateurs

echo "🚀 Exécution de la migration du système Agents/Sous-agents/Utilisateurs..."

# Vérifier si psql est disponible
if ! command -v psql &> /dev/null; then
    echo "❌ psql n'est pas installé. Veuillez installer PostgreSQL client."
    exit 1
fi

# Variables d'environnement (à adapter selon votre configuration)
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"postgres"}
DB_USER=${DB_USER:-"postgres"}

# Chemin vers le fichier de migration
MIGRATION_FILE="database/agents-system-migration.sql"

# Vérifier si le fichier de migration existe
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Fichier de migration non trouvé: $MIGRATION_FILE"
    exit 1
fi

echo "📁 Fichier de migration: $MIGRATION_FILE"
echo "🗄️ Base de données: $DB_NAME sur $DB_HOST:$DB_PORT"
echo "👤 Utilisateur: $DB_USER"

# Demander confirmation
read -p "⚠️  Voulez-vous continuer avec la migration ? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration annulée"
    exit 1
fi

# Exécuter la migration
echo "🔄 Exécution de la migration..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
    echo "✅ Migration exécutée avec succès !"
    echo ""
    echo "📊 Tables créées :"
    echo "  - pgd (Directeur Général)"
    echo "  - agents (Agents principaux)"
    echo "  - sub_agents (Sous-agents)"
    echo "  - agent_users (Utilisateurs des agents)"
    echo "  - commissions (Commissions)"
    echo "  - agent_transactions (Transactions)"
    echo "  - commission_settings (Paramètres)"
    echo "  - agent_audit_logs (Logs d'audit)"
    echo ""
    echo "🔧 Fonctionnalités ajoutées :"
    echo "  - Calcul automatique des commissions"
    echo "  - Triggers pour l'audit"
    echo "  - RLS (Row Level Security)"
    echo "  - Index pour les performances"
    echo ""
    echo "🎯 Prochaines étapes :"
    echo "  1. Tester l'interface PDG > Agents"
    echo "  2. Créer des agents de test"
    echo "  3. Tester la création d'utilisateurs"
    echo "  4. Vérifier le calcul des commissions"
else
    echo "❌ Erreur lors de l'exécution de la migration"
    exit 1
fi
