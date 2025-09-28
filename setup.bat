@echo off
REM Script de configuration pour Mon Projet 224Solutions
REM Ce script installe toutes les dépendances localement dans le projet

echo 🚀 Configuration du projet 224Solutions...
echo 📁 Répertoire de travail: %CD%

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js détecté: %NODE_VERSION%

REM Vérifier si npm est installé
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm n'est pas disponible
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm détecté: %NPM_VERSION%

REM Nettoyer les installations précédentes si nécessaire
if exist "node_modules" (
    echo 🧹 Nettoyage des dépendances existantes...
    rmdir /s /q "node_modules"
)

if exist "package-lock.json" (
    echo 🧹 Suppression du package-lock.json existant...
    del "package-lock.json"
)

REM Installation des dépendances
echo 📦 Installation des dépendances...
npm install

if %errorlevel% equ 0 (
    echo ✅ Dépendances installées avec succès!
    
    echo 🔍 Vérification des vulnérabilités...
    npm audit
    
    echo 🎉 Configuration terminée avec succès!
    echo 💡 Vous pouvez maintenant utiliser:
    echo    • npm run dev    - Démarrer le serveur de développement
    echo    • npm run build  - Construire pour la production  
    echo    • npm run lint   - Vérifier le code
    
) else (
    echo ❌ Erreur lors de l'installation des dépendances
    pause
    exit /b 1
)

pause
