#!/bin/bash
# scripts/run-syndicat-migration.sh

echo "Running syndicat system database migration..."

# Ensure Supabase CLI is installed and configured
if ! command -v supabase &> /dev/null
then
    echo "Supabase CLI not found. Please install it: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Apply the SQL migration file
# This assumes you have your Supabase project linked and credentials configured
supabase db diff --schema public --file database/syndicat-system-migration.sql --dry-run
if [ $? -ne 0 ]; then
    echo "Dry run failed. Please check your migration file."
    exit 1
fi

echo "Applying migration..."
supabase db push --file database/syndicat-system-migration.sql

if [ $? -eq 0 ]; then
    echo "Syndicat system migration applied successfully."
    echo "✅ Tables created:"
    echo "  - bureaux_syndicaux"
    echo "  - travailleurs"
    echo "  - motos"
    echo "  - alertes"
    echo "  - fonctionnalites_bureau"
    echo "  - bureau_fonctionnalites"
    echo "  - notifications"
    echo "  - communications_technique"
    echo ""
    echo "✅ Features available:"
    echo "  - Bureau creation with permanent links"
    echo "  - Worker management with access levels"
    echo "  - Motorcycle registration"
    echo "  - Alerts and notifications"
    echo "  - Technical support communication"
    echo "  - Automatic feature assignment"
else
    echo "Error applying syndicat system migration."
    exit 1
fi
