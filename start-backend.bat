@echo off
echo.
echo ========================================
echo 🚀 DÉMARRAGE BACKEND OPENAI 224SOLUTIONS
echo ========================================
echo.

cd backend

echo 📦 Vérification des dépendances...
if not exist node_modules (
    echo Installation des dépendances...
    npm install
)

echo.
echo 🔧 Vérification de la configuration...
if not exist .env (
    echo Création du fichier .env...
    copy env.example .env
    echo.
    echo ⚠️  IMPORTANT: Éditez backend\.env avec vos vraies clés API:
    echo    - OPENAI_API_KEY=sk-votre-vraie-cle-openai
    echo    - SUPABASE_SERVICE_ROLE_KEY=votre-cle-supabase
    echo.
    pause
)

echo.
echo 🚀 Démarrage du serveur backend...
echo    URL: http://localhost:3001
echo    Santé: http://localhost:3001/api/health
echo    OpenAI: http://localhost:3001/api/openai (PDG/Admin uniquement)
echo.
echo Appuyez sur Ctrl+C pour arrêter le serveur
echo.

npm run dev
