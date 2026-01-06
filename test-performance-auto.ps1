# 🚀 SCRIPT DE TEST DE PERFORMANCE AUTOMATIQUE - 224SOLUTIONS
# Date: 6 Janvier 2026

param(
    [string]$Url = "https://224solution.net",
    [switch]$FullTest = $false,
    [switch]$QuickTest = $false
)

# Couleurs
$Green = "Green"
$Cyan = "Cyan"
$Yellow = "Yellow"
$Red = "Red"

# Créer dossier reports
$ReportsDir = "./reports"
if (-not (Test-Path $ReportsDir)) {
    New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null
}

$Timestamp = Get-Date -Format 'yyyy-MM-dd-HHmm'

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor $Cyan
Write-Host "║     🚀 TEST DE PERFORMANCE - 224SOLUTIONS 🚀               ║" -ForegroundColor $Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor $Cyan

Write-Host "📊 URL testée: $Url" -ForegroundColor $Yellow
Write-Host "⏰ Timestamp: $Timestamp" -ForegroundColor $Yellow
Write-Host ""

# ============================================
# TEST 1: VÉRIFIER LIGHTHOUSE INSTALLÉ
# ============================================

Write-Host "🔍 Vérification de Lighthouse..." -ForegroundColor $Cyan

try {
    $LighthouseVersion = lighthouse --version 2>$null
    Write-Host "✅ Lighthouse installé: $LighthouseVersion" -ForegroundColor $Green
} catch {
    Write-Host "❌ Lighthouse non installé!" -ForegroundColor $Red
    Write-Host "📥 Installation de Lighthouse..." -ForegroundColor $Yellow
    
    try {
        npm install -g lighthouse
        Write-Host "✅ Lighthouse installé avec succès!" -ForegroundColor $Green
    } catch {
        Write-Host "❌ Erreur d'installation. Installez manuellement: npm install -g lighthouse" -ForegroundColor $Red
        exit 1
    }
}

# ============================================
# TEST 2: LIGHTHOUSE PERFORMANCE
# ============================================

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor $Cyan
Write-Host "║          📊 TEST LIGHTHOUSE PERFORMANCE                    ║" -ForegroundColor $Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor $Cyan

$LighthouseReport = "$ReportsDir/lighthouse-$Timestamp.html"
$LighthouseJson = "$ReportsDir/lighthouse-$Timestamp.json"

Write-Host "⏳ Exécution de Lighthouse (peut prendre 30-60 secondes)..." -ForegroundColor $Yellow

try {
    # Test Lighthouse avec output HTML et JSON
    lighthouse $Url `
        --output html `
        --output json `
        --output-path "$ReportsDir/lighthouse-$Timestamp" `
        --chrome-flags="--headless" `
        --quiet 2>&1 | Out-Null
    
    Write-Host "✅ Test Lighthouse terminé!" -ForegroundColor $Green
    Write-Host "📄 Rapport HTML: $LighthouseReport" -ForegroundColor $Yellow
    Write-Host "📄 Rapport JSON: $LighthouseJson" -ForegroundColor $Yellow
    
    # Lire le fichier JSON pour extraire les scores
    if (Test-Path $LighthouseJson) {
        $JsonContent = Get-Content $LighthouseJson -Raw | ConvertFrom-Json
        
        $PerfScore = [math]::Round($JsonContent.categories.performance.score * 100)
        $PwaScore = [math]::Round($JsonContent.categories.pwa.score * 100)
        $A11yScore = [math]::Round($JsonContent.categories.accessibility.score * 100)
        $BestScore = [math]::Round($JsonContent.categories.'best-practices'.score * 100)
        $SeoScore = [math]::Round($JsonContent.categories.seo.score * 100)
        
        Write-Host "`n📊 SCORES LIGHTHOUSE:" -ForegroundColor $Cyan
        Write-Host "   Performance:    $PerfScore/100" -ForegroundColor $(if($PerfScore -ge 90){"Green"}elseif($PerfScore -ge 50){"Yellow"}else{"Red"})
        Write-Host "   PWA:            $PwaScore/100" -ForegroundColor $(if($PwaScore -ge 90){"Green"}elseif($PwaScore -ge 50){"Yellow"}else{"Red"})
        Write-Host "   Accessibility:  $A11yScore/100" -ForegroundColor $(if($A11yScore -ge 90){"Green"}elseif($A11yScore -ge 50){"Yellow"}else{"Red"})
        Write-Host "   Best Practices: $BestScore/100" -ForegroundColor $(if($BestScore -ge 90){"Green"}elseif($BestScore -ge 50){"Yellow"}else{"Red"})
        Write-Host "   SEO:            $SeoScore/100" -ForegroundColor $(if($SeoScore -ge 90){"Green"}elseif($SeoScore -ge 50){"Yellow"}else{"Red"})
        
        # Métriques détaillées
        $Metrics = $JsonContent.audits
        
        if ($Metrics.'first-contentful-paint') {
            $FCP = [math]::Round($Metrics.'first-contentful-paint'.numericValue / 1000, 2)
            Write-Host "`n⚡ MÉTRIQUES DE VITESSE:" -ForegroundColor $Cyan
            Write-Host "   First Contentful Paint: $FCP s" -ForegroundColor $Yellow
        }
        
        if ($Metrics.'largest-contentful-paint') {
            $LCP = [math]::Round($Metrics.'largest-contentful-paint'.numericValue / 1000, 2)
            Write-Host "   Largest Contentful Paint: $LCP s" -ForegroundColor $Yellow
        }
        
        if ($Metrics.'total-blocking-time') {
            $TBT = [math]::Round($Metrics.'total-blocking-time'.numericValue, 0)
            Write-Host "   Total Blocking Time: $TBT ms" -ForegroundColor $Yellow
        }
        
        if ($Metrics.'cumulative-layout-shift') {
            $CLS = [math]::Round($Metrics.'cumulative-layout-shift'.numericValue, 3)
            Write-Host "   Cumulative Layout Shift: $CLS" -ForegroundColor $Yellow
        }
    }
    
    # Ouvrir le rapport dans le navigateur
    Write-Host "`n🌐 Ouverture du rapport dans le navigateur..." -ForegroundColor $Cyan
    Start-Process $LighthouseReport
    
} catch {
    Write-Host "❌ Erreur lors du test Lighthouse: $_" -ForegroundColor $Red
}

# ============================================
# TEST 3: TEST DE DISPONIBILITÉ
# ============================================

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor $Cyan
Write-Host "║          🌐 TEST DE DISPONIBILITÉ                          ║" -ForegroundColor $Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor $Cyan

Write-Host "⏳ Envoi de 10 requêtes HTTP..." -ForegroundColor $Yellow

$ResponseTimes = @()
$SuccessCount = 0
$FailCount = 0

for ($i = 1; $i -le 10; $i++) {
    try {
        $StartTime = Get-Date
        $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
        $EndTime = Get-Date
        $Duration = ($EndTime - $StartTime).TotalMilliseconds
        
        $ResponseTimes += $Duration
        $SuccessCount++
        
        Write-Host "   Requête $i : $([math]::Round($Duration, 0)) ms ✅" -ForegroundColor $Green
    } catch {
        $FailCount++
        Write-Host "   Requête $i : ÉCHEC ❌" -ForegroundColor $Red
    }
    
    Start-Sleep -Milliseconds 100
}

if ($ResponseTimes.Count -gt 0) {
    $AvgTime = [math]::Round(($ResponseTimes | Measure-Object -Average).Average, 0)
    $MinTime = [math]::Round(($ResponseTimes | Measure-Object -Minimum).Minimum, 0)
    $MaxTime = [math]::Round(($ResponseTimes | Measure-Object -Maximum).Maximum, 0)
    
    Write-Host "`n📊 RÉSULTATS:" -ForegroundColor $Cyan
    Write-Host "   Succès:         $SuccessCount/10 ($([math]::Round($SuccessCount/10*100, 0))%)" -ForegroundColor $(if($SuccessCount -ge 9){"Green"}else{"Yellow"})
    Write-Host "   Échecs:         $FailCount/10" -ForegroundColor $(if($FailCount -eq 0){"Green"}else{"Red"})
    Write-Host "   Temps moyen:    $AvgTime ms" -ForegroundColor $Yellow
    Write-Host "   Temps min:      $MinTime ms" -ForegroundColor $Yellow
    Write-Host "   Temps max:      $MaxTime ms" -ForegroundColor $Yellow
}

# ============================================
# TEST 4: VÉRIFICATION PWA
# ============================================

if ($FullTest) {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor $Cyan
    Write-Host "║          📱 VÉRIFICATION PWA                               ║" -ForegroundColor $Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor $Cyan
    
    Write-Host "⏳ Vérification manifest.json..." -ForegroundColor $Yellow
    
    try {
        $ManifestUrl = "$Url/manifest.json"
        $Manifest = Invoke-RestMethod -Uri $ManifestUrl -UseBasicParsing
        
        Write-Host "✅ Manifest.json trouvé!" -ForegroundColor $Green
        Write-Host "   Nom: $($Manifest.name)" -ForegroundColor $Yellow
        Write-Host "   Nom court: $($Manifest.short_name)" -ForegroundColor $Yellow
        Write-Host "   Icônes: $($Manifest.icons.Count)" -ForegroundColor $Yellow
        
    } catch {
        Write-Host "⚠️  Manifest.json non accessible" -ForegroundColor $Yellow
    }
}

# ============================================
# RÉSUMÉ FINAL
# ============================================

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor $Green
Write-Host "║          ✅ TESTS TERMINÉS AVEC SUCCÈS!                    ║" -ForegroundColor $Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor $Green

Write-Host "📁 Tous les rapports sont disponibles dans: $ReportsDir" -ForegroundColor $Yellow
Write-Host "📊 Ouvrez le rapport HTML pour voir les détails complets`n" -ForegroundColor $Yellow

# Suggestions d'amélioration
Write-Host "💡 PROCHAINES ÉTAPES:" -ForegroundColor $Cyan
Write-Host "   1. Analysez le rapport Lighthouse en détail" -ForegroundColor $Yellow
Write-Host "   2. Testez sur WebPageTest.org pour comparaison" -ForegroundColor $Yellow
Write-Host "   3. Testez sur GTmetrix.com pour analyse approfondie" -ForegroundColor $Yellow
Write-Host "   4. Configurez Loader.io pour test de charge" -ForegroundColor $Yellow
Write-Host ""

# Ouvrir le dossier reports
Write-Host "📂 Ouverture du dossier reports..." -ForegroundColor $Cyan
Start-Process explorer.exe $ReportsDir

Write-Host "`n🎉 Terminé! Consultez vos rapports." -ForegroundColor $Green
