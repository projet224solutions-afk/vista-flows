# Copier SQL dans le presse-papiers
Write-Host "`n=== COPIE DU SQL STRIPE ===" -ForegroundColor Cyan

$sqlFile = "D:\224Solutions\supabase\migrations\20260104_stripe_payments.sql"
$sql = Get-Content $sqlFile -Raw

Set-Clipboard -Value $sql

Write-Host "`n✅ SQL copié dans le presse-papiers!" -ForegroundColor Green
Write-Host "`nMaintenant:" -ForegroundColor Yellow
Write-Host "1. Ouvrez: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new" -ForegroundColor Cyan
Write-Host "2. Collez le SQL (Ctrl+V)" -ForegroundColor Cyan  
Write-Host "3. Cliquez sur 'Run' en bas à droite" -ForegroundColor Cyan
Write-Host "4. Attendez la confirmation" -ForegroundColor Cyan

Write-Host "`nOu ouvrez le navigateur automatiquement:" -ForegroundColor Yellow
Write-Host "Start-Process 'https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new'" -ForegroundColor Cyan

$answer = Read-Host "`nOuvrir le navigateur maintenant? (O/N)"
if ($answer -eq 'O' -or $answer -eq 'o') {
    Start-Process "https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new"
    Write-Host "`nNavigateur ouvert!" -ForegroundColor Green
}

Write-Host "`nSQL pret a etre colle! (deja dans le presse-papiers)`n" -ForegroundColor Green
