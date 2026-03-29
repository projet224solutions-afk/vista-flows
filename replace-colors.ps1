# Script pour remplacer les couleurs vertes par le système orange-bleu

$srcPath = "d:\224Solutions\vista-flows\src"
$replacements = @(
    # Gradients verts → orange-bleu
    @{ old = 'bg-gradient-to-br from-green-50 to-green-100'; new = 'bg-gradient-to-br from-primary-blue-50 to-primary-orange-50' },
    @{ old = 'bg-gradient-to-r from-green-50 via-blue-50 to-purple-50'; new = 'bg-gradient-to-br from-primary-blue-50 via-white to-primary-orange-50' },
    @{ old = 'bg-gradient-to-br from-green-50 to-green-100'; new = 'bg-gradient-to-br from-primary-blue-50 to-primary-orange-50' },
    @{ old = 'from-green-500 to-blue-500'; new = 'from-primary-blue-500 to-primary-orange-500' },
    @{ old = 'from-emerald-50 to-teal-50'; new = 'from-primary-blue-50 to-primary-orange-50' },
    @{ old = 'from-emerald-600 to-teal-600'; new = 'from-primary-blue-600 to-primary-orange-600' },
    @{ old = 'from-cyan-500 to-teal-500'; new = 'from-primary-blue-500 to-primary-orange-500' },
    @{ old = 'from-emerald-500 to-teal-600'; new = 'from-primary-blue-500 to-primary-orange-600' },
    @{ old = 'from-emerald-500 to-emerald-600'; new = 'from-primary-blue-500 to-primary-orange-600' },
    
    # Backgrounds simples
    @{ old = 'bg-green-50'; new = 'bg-gradient-to-br from-primary-blue-50 to-primary-orange-50' },
    @{ old = 'bg-green-100'; new = 'bg-primary-orange-100' },
    @{ old = 'bg-green-200'; new = 'bg-primary-orange-200' },
    @{ old = 'bg-green-500'; new = 'bg-gradient-to-br from-primary-blue-500 to-primary-orange-500' },
    @{ old = 'bg-green-600'; new = 'bg-primary-orange-600' },
    @{ old = 'bg-green-700'; new = 'bg-primary-orange-700' },
    @{ old = 'bg-emerald-50'; new = 'bg-primary-blue-50' },
    @{ old = 'bg-emerald-100'; new = 'bg-primary-blue-100' },
    @{ old = 'bg-emerald-500'; new = 'bg-primary-orange-500' },
    @{ old = 'bg-emerald-500/10'; new = 'bg-primary-orange-500/10' },
    @{ old = 'bg-emerald-500/20'; new = 'bg-primary-orange-500/20' },
    @{ old = 'bg-green-500/10'; new = 'bg-primary-orange-500/10' },
    @{ old = 'bg-green-500/20'; new = 'bg-primary-orange-500/20' },
    @{ old = 'bg-green-950/20'; new = 'bg-primary-orange-950/20' },
    
    # From classes
    @{ old = 'from-green-'; new = 'from-primary-orange-' },
    @{ old = 'from-emerald-'; new = 'from-primary-blue-' },
    @{ old = 'from-cyan-'; new = 'from-primary-blue-' },
    
    # To classes
    @{ old = 'to-green-'; new = 'to-primary-orange-' },
    @{ old = 'to-emerald-'; new = 'to-primary-orange-' },
    @{ old = 'to-teal-'; new = 'to-primary-orange-' },
    @{ old = 'to-cyan-'; new = 'to-primary-blue-' },
    
    # Via classes
    @{ old = 'via-green-'; new = 'via-primary-orange-' },
    @{ old = 'via-emerald-'; new = 'via-primary-blue-' },
    
    # Text colors
    @{ old = 'text-green-'; new = 'text-primary-orange-' },
    @{ old = 'text-emerald-'; new = 'text-primary-blue-' },
    
    # Border colors
    @{ old = 'border-green-'; new = 'border-primary-orange-' },
    @{ old = 'border-emerald-'; new = 'border-primary-blue-' },
    @{ old = 'border-teal-'; new = 'border-primary-orange-' },
    
    # Hover states
    @{ old = 'hover:bg-green-'; new = 'hover:bg-primary-orange-' },
    @{ old = 'hover:bg-emerald-'; new = 'hover:bg-primary-blue-' },
)

$fileCount = 0
$totalReplacements = 0

Get-ChildItem -Path $srcPath -Include "*.tsx", "*.ts", "*.css" -Recurse | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    foreach ($replacement in $replacements) {
        # Éviter les remplacements dupliqués
        if ($content -match [regex]::Escape($replacement.old)) {
            $content = $content -replace [regex]::Escape($replacement.old), $replacement.new
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content $file.FullName -Value $content -NoNewline
        $fileCount++
        $changes = @()
        foreach ($replacement in $replacements) {
            $before = ($originalContent | Select-String $replacement.old | Measure-Object).Count
            $after = ($content | Select-String $replacement.old | Measure-Object).Count
            if ($before -gt $after) {
                $totalReplacements += ($before - $after)
            }
        }
    }
}

Write-Host "[SUCCESS] Remplacements termines:" -ForegroundColor Green
Write-Host "[INFO] Fichiers modifies: $fileCount"
Write-Host "[INFO] Remplacements effectues: $totalReplacements"
