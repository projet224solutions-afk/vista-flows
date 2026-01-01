@echo off
echo === Push des changements sur GitHub ===
cd /d D:\224Solutions
git add -A
git commit -m "fix: Optimisation boutons de partage produits/boutiques - MarketplaceProductCard utilise ShareButton reutilisable - Menu dropdown complet (copier, WhatsApp, Facebook, Twitter) - ProductDetailModal bouton taille optimisee (icone compacte) - Marketplace.tsx bouton visibilite amelioree - Documentation complete (analyse + guide test) - Support desktop + mobile - Tracking short URLs disponible"
git push origin main
echo === Push termine ===
pause
