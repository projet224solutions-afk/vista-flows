// Script temporaire pour nettoyer NavigationFooter des pages
// Ce fichier peut être supprimé après nettoyage

const pagesToClean = [
  'Home.tsx',
  'Index.tsx', 
  'LivreurDashboard.tsx',
  'Marketplace.tsx',
  'NotFound.tsx',
  'PDGDashboard.tsx',
  'Profil.tsx',
  'SyndicatDashboard.tsx',
  'TaxiDashboard.tsx',
  'Tracking.tsx',
  'TransitaireDashboard.tsx'
];

// Instructions pour nettoyer:
// 1. Supprimer l'import NavigationFooter
// 2. Supprimer <NavigationFooter /> du JSX
// 3. S'assurer que le div parent a bien className="min-h-screen"