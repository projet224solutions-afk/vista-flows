@echo off
echo ========================================
echo  GIT PUSH - Documentation Agora
echo ========================================
echo.
cd /d "D:\224Solutions"
echo [1/3] Ajout des fichiers...
git add -A
echo.
echo [2/3] Commit...
git commit -m "docs: Verification et documentation complete systeme d'appels Agora - Code 100%% fonctionnel (1,681+ lignes) - Documentation complete - Scripts de diagnostic - Guide d'activation"
echo.
echo [3/3] Push vers origin main...
git push origin main
echo.
echo ========================================
echo  TERMINE !
echo ========================================
pause
