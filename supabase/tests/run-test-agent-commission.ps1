# Lance le test automatique de commission agent
# Modifier la variable $connectionString si nécessaire

$env:PGPASSWORD = $env:PG_PASSWORD_TEST

$psqlCmd = "psql -h $env:PG_HOST -p $env:PG_PORT -U $env:PG_USER -d $env:PG_DB -f supabase/tests/test_agent_commission.sql"

Write-Host "Running agent commission test..." -ForegroundColor Cyan

Invoke-Expression $psqlCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Test passed." -ForegroundColor Green
} else {
    Write-Host "❌ Test failed. See output above." -ForegroundColor Red
    exit 1
}
