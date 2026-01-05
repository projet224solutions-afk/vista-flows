# Creation des tables Stripe
Write-Host "`nCreation des tables Stripe..." -ForegroundColor Yellow

# Lire le SQL
$sql = Get-Content "D:\224Solutions\supabase\migrations\20260104_stripe_payments.sql" -Raw

# Configuration
$projectRef = "uakkxaibujzxdiqzpnpr"
$apiKey = $env:SUPABASE_ACCESS_TOKEN
$url = "https://api.supabase.com/v1/projects/$projectRef/database/query"

# Preparer la requete
$body = @{
    query = $sql
} | ConvertTo-Json -Depth 10

# Executer
try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers @{
        "Authorization" = "Bearer $apiKey"
        "Content-Type" = "application/json"
    } -Body $body
    
    Write-Host "`nTables Stripe creees avec succes!" -ForegroundColor Green
    Write-Host "`nResultat:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "`nErreur: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails -ForegroundColor Red
    }
}
