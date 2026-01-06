# Script PowerShell pour exécuter la migration SQL sur Supabase PostgreSQL

$host = "db.uakkxaibujzxdiqzpnpr.supabase.co"
$port = "5432"
$user = "postgres"
$password = "Stb@h661794582"
$dbname = "postgres"
$sqlFile = "d:\224Solutions\supabase\migrations\20260105020000_agent_commission_stripe_integration.sql"

# Définit le mot de passe pour psql
$env:PGPASSWORD = $password

# Exécute la migration
psql -h $host -p $port -U $user -d $dbname -f $sqlFile

# Nettoie la variable d'environnement
Remove-Item Env:PGPASSWORD
