@echo off
echo.
echo 📧 CONFIGURATION SYSTÈME EMAIL - 224SOLUTIONS
echo =============================================
echo.

echo 📦 Installation des dépendances backend...
cd backend
call npm install

echo.
echo ✅ Dépendances installées !
echo.

echo 🔧 Vérification de la configuration...
if not exist .env (
    echo ⚠️  Fichier .env non trouvé, copie du template...
    copy env.example .env
    echo.
    echo 📝 IMPORTANT: Configurez vos variables email dans backend\.env
    echo    • EMAIL_USER=votre.email@gmail.com
    echo    • EMAIL_PASSWORD=votre_mot_de_passe_application
    echo.
) else (
    echo ✅ Fichier .env trouvé
)

echo.
echo 🧪 Lancement du test système...
cd ..
node test-email-system.js

echo.
echo 📖 Consultez GUIDE_EMAIL_CONFIGURATION.md pour plus d'informations
echo.
echo 🚀 Pour démarrer le backend: cd backend && npm run dev
echo.
pause
