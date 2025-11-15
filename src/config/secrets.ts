/**
 * Configuration pour la gestion des secrets
 * Utilise les variables d'environnement pour stocker les secrets
 */

export const SECRET_KEYS = {
  PDG_ACCESS_CODE: 'PDG_ACCESS_CODE',
  ADMIN_ACCESS_CODE: 'ADMIN_ACCESS_CODE',
  DEV_ACCESS_CODE: 'DEV_ACCESS_CODE'
} as const;

export const getSecret = async (key: string): Promise<string> => {
  // En production, ces secrets seraient récupérés depuis un gestionnaire de secrets sécurisé
  const secrets: Record<string, string> = {
    [SECRET_KEYS.PDG_ACCESS_CODE]: import.meta.env.VITE_PDG_ACCESS_CODE || 'default_pdg_code',
    [SECRET_KEYS.ADMIN_ACCESS_CODE]: import.meta.env.VITE_ADMIN_ACCESS_CODE || 'default_admin_code',
    [SECRET_KEYS.DEV_ACCESS_CODE]: import.meta.env.VITE_DEV_ACCESS_CODE || 'default_dev_code'
  };

  return secrets[key] || '';
};
