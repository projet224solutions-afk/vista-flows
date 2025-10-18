/**
 * Configuration des routes PDG - 224SOLUTIONS
 * Centralise la configuration des redirections PDG
 */

export const PDG_ROUTES = {
  MAIN: '/pdg',
  FINANCE: '/pdg#finance',
  USERS: '/pdg#users',
  SECURITY: '/pdg#security',
  CONFIG: '/pdg#config',
  PRODUCTS: '/pdg#products',
  MAINTENANCE: '/pdg#maintenance',
  AGENTS: '/pdg#agents',
  SYNDICAT: '/pdg#syndicat',
  REPORTS: '/pdg#reports',
  AI_ASSISTANT: '/pdg#ai-assistant',
  COPILOT: '/pdg#copilot'
} as const;

export const PDG_REDIRECTS = {
  // Redirections depuis les anciennes pages PDG
  '/admin': PDG_ROUTES.MAIN,
  '/admin-dashboard': PDG_ROUTES.MAIN,
  '/pdg-dashboard': PDG_ROUTES.MAIN,
  '/executive': PDG_ROUTES.MAIN,
  
  // Redirections avec onglets spécifiques
  '/pdg/finance': PDG_ROUTES.FINANCE,
  '/pdg/users': PDG_ROUTES.USERS,
  '/pdg/security': PDG_ROUTES.SECURITY,
  '/pdg/config': PDG_ROUTES.CONFIG,
  '/pdg/products': PDG_ROUTES.PRODUCTS,
  '/pdg/maintenance': PDG_ROUTES.MAINTENANCE,
  '/pdg/agents': PDG_ROUTES.AGENTS,
  '/pdg/syndicat': PDG_ROUTES.SYNDICAT,
  '/pdg/reports': PDG_ROUTES.REPORTS,
  '/pdg/ai': PDG_ROUTES.AI_ASSISTANT,
  '/pdg/copilot': PDG_ROUTES.COPILOT
} as const;

export const getPDGRedirect = (path: string): string => {
  return PDG_REDIRECTS[path as keyof typeof PDG_REDIRECTS] || PDG_ROUTES.MAIN;
};

export const isPDGRoute = (path: string): boolean => {
  return Object.values(PDG_REDIRECTS).includes(path as any) || 
         path.startsWith('/pdg') || 
         path.startsWith('/admin');
};
