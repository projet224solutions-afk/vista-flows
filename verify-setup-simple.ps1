# Script de verification pour Mon Projet 224Solutions
# Ce script verifie que toutes les dependances sont correctement installees

Write-Host "Verification de la configuration du projet 224Solutions..." -ForegroundColor Green

$errors = 0

# Verifier la presence des fichiers essentiels
$essentialFiles = @(
    "package.json",
    "vite.config.ts", 
    "tsconfig.json",
    "tailwind.config.ts",
    "src/main.tsx"
)

Write-Host "Verification des fichiers essentiels..." -ForegroundColor Blue
foreach ($file in $essentialFiles) {
    if (Test-Path $file) {
        Write-Host "   OK $file" -ForegroundColor Green
    }
    else {
        Write-Host "   ERREUR $file manquant" -ForegroundColor Red
        $errors++
    }
}

# Verifier node_modules
Write-Host "Verification des dependances..." -ForegroundColor Blue
if (Test-Path "node_modules") {
    $packageCount = (Get-ChildItem "node_modules" -Directory).Count
    Write-Host "   OK node_modules present ($packageCount packages)" -ForegroundColor Green
    
    # Verifier quelques dependances cles
    $keyDependencies = @(
        "react",
        "vite", 
        "@supabase/supabase-js",
        "tailwindcss"
    )
    
    foreach ($dep in $keyDependencies) {
        if (Test-Path "node_modules/$dep") {
            Write-Host "   OK $dep" -ForegroundColor Green
        }
        else {
            Write-Host "   ERREUR $dep manquant" -ForegroundColor Red
            $errors++
        }
    }
}
else {
    Write-Host "   ERREUR node_modules manquant" -ForegroundColor Red
    $errors++
}

# Resume
Write-Host ""
Write-Host "Resume de la verification:" -ForegroundColor Blue
if ($errors -eq 0) {
    Write-Host "SUCCES: Toutes les verifications sont passees!" -ForegroundColor Green
    Write-Host "Le projet est correctement configure avec toutes les dependances locales" -ForegroundColor Green
    Write-Host "Vous pouvez maintenant utiliser 'npm run dev' pour demarrer le developpement" -ForegroundColor Cyan
}
else {
    Write-Host "ERREUR: $errors erreur(s) detectee(s)" -ForegroundColor Red
    Write-Host "Veuillez corriger les problemes ci-dessus avant de continuer" -ForegroundColor Yellow
    Write-Host "Essayez de relancer 'npm install' ou utilisez le script setup.ps1" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Emplacement du projet: $(Get-Location)" -ForegroundColor Blue
Write-Host "Toutes les dependances sont dans: $(Join-Path (Get-Location) 'node_modules')" -ForegroundColor Blue
# Script de verification pour Mon Projet 224Solutions
# Ce script verifie que toutes les dependances sont correctement installees

Write-Host "Verification de la configuration du projet 224Solutions..." -ForegroundColor Green

$errors = 0

# Verifier la presence des fichiers essentiels
$essentialFiles = @(
    "package.json",
    "vite.config.ts", 
    "tsconfig.json",
    "tailwind.config.ts",
    "src/main.tsx"
)

Write-Host "Verification des fichiers essentiels..." -ForegroundColor Blue
foreach ($file in $essentialFiles) {
    if (Test-Path $file) {
        Write-Host "   OK $file" -ForegroundColor Green
    }
    else {
        Write-Host "   ERREUR $file manquant" -ForegroundColor Red
        $errors++
    }
}

# Verifier node_modules
Write-Host "Verification des dependances..." -ForegroundColor Blue
if (Test-Path "node_modules") {
    $packageCount = (Get-ChildItem "node_modules" -Directory).Count
    Write-Host "   OK node_modules present ($packageCount packages)" -ForegroundColor Green
    
    # Verifier quelques dependances cles
    $keyDependencies = @(
        "react",
        "vite", 
        "@supabase/supabase-js",
        "tailwindcss"
    )
    
    foreach ($dep in $keyDependencies) {
        if (Test-Path "node_modules/$dep") {
            Write-Host "   OK $dep" -ForegroundColor Green
        }
        else {
            Write-Host "   ERREUR $dep manquant" -ForegroundColor Red
            $errors++
        }
    }
}
else {
    Write-Host "   ERREUR node_modules manquant" -ForegroundColor Red
    $errors++
}

# Resume
Write-Host ""
Write-Host "Resume de la verification:" -ForegroundColor Blue
if ($errors -eq 0) {
    Write-Host "SUCCES: Toutes les verifications sont passees!" -ForegroundColor Green
    Write-Host "Le projet est correctement configure avec toutes les dependances locales" -ForegroundColor Green
    Write-Host "Vous pouvez maintenant utiliser 'npm run dev' pour demarrer le developpement" -ForegroundColor Cyan
}
else {
    Write-Host "ERREUR: $errors erreur(s) detectee(s)" -ForegroundColor Red
    Write-Host "Veuillez corriger les problemes ci-dessus avant de continuer" -ForegroundColor Yellow
    Write-Host "Essayez de relancer 'npm install' ou utilisez le script setup.ps1" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Emplacement du projet: $(Get-Location)" -ForegroundColor Blue
Write-Host "Toutes les dependances sont dans: $(Join-Path (Get-Location) 'node_modules')" -ForegroundColor Blue
