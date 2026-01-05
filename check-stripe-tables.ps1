# Deploiement Stripe Simple
Write-Host "`n=== DEPLOIEMENT STRIPE ===" -ForegroundColor Cyan

$projectRef = "uakkxaibujzxdiqzpnpr"
$supabaseUrl = "https://uakkxaibujzxdiqzpnpr.supabase.co"

Write-Host "Projet: $projectRef`n" -ForegroundColor Yellow

# Utiliser la clé anon pour tester
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM"

Write-Host "Verification des tables existantes..." -ForegroundColor Yellow

$tables = @('stripe_config', 'stripe_transactions', 'wallets', 'wallet_transactions', 'withdrawals')
$found = @()

foreach ($table in $tables) {
    try {
        $url = "$supabaseUrl/rest/v1/$table"
        $headers = @{
            "apikey" = $anonKey
            "Authorization" = "Bearer $anonKey"
            "Range" = "0-0"
        }
        
        Invoke-RestMethod -Uri $url -Method Head -Headers $headers -ErrorAction Stop | Out-Null
        Write-Host "  checkmark $table" -ForegroundColor Green
        $found += $table
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 416) {
            Write-Host "  checkmark $table (vide)" -ForegroundColor Green
            $found += $table
        } else {
            Write-Host "  X $table" -ForegroundColor Red
        }
    }
}

Write-Host "`nResultat: $($found.Count)/$($tables.Count) tables trouvees" -ForegroundColor $(if ($found.Count -eq $tables.Count) { 'Green' } else { 'Yellow' })

if ($found.Count -lt $tables.Count) {
    Write-Host "`nPour creer les tables:" -ForegroundColor Yellow
    Write-Host "1. Allez sur: https://supabase.com/dashboard/project/$projectRef/editor" -ForegroundColor Cyan
    Write-Host "2. Ouvrez l'editeur SQL" -ForegroundColor Cyan
    Write-Host "3. Copiez le contenu de: supabase/migrations/20260104_stripe_payments.sql" -ForegroundColor Cyan
    Write-Host "4. Executez le SQL`n" -ForegroundColor Cyan
}
else {
    Write-Host "`n✅ Toutes les tables Stripe existent!" -ForegroundColor Green
}
