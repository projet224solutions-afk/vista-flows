# Script de mise à jour des domaines
Get-ChildItem -Path "D:\224Solutions" -Filter "*.md" -File | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and $content -match '224solutions\.com') {
        $newContent = $content -replace '224solutions\.com', '224solution.net'
        Set-Content -Path $_.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($_.Name)" -ForegroundColor Green
    }
}
Write-Host "`nDone!" -ForegroundColor Cyan
