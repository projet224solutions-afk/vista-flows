/**
 * Système de génération d'ID automatique pour tous les rôles
 * S'intègre au système existant sans modifier le code actuel
 */

import { supabase } from "@/integrations/supabase/client";

export type RoleType = 
  | 'agent' 
  | 'vendor' 
  | 'bureau' 
  | 'driver' 
  | 'client'
  | 'pdg'
  | 'transitaire'
  | 'worker';

interface IdConfig {
  prefix: string;
  table: string;
  column: string;
  length: number;
}

// IDs are limited to 7 characters total (prefix 3 + 4 digits = 7 chars max)
const ID_CONFIGS: Record<RoleType, IdConfig> = {
  agent: {
    prefix: 'AGT',
    table: 'agents_management',
    column: 'agent_code',
    length: 4 // AGT0001 = 7 chars max
  },
  vendor: {
    prefix: 'VND',
    table: 'vendors',
    column: 'vendor_code',
    length: 4 // VND0001 = 7 chars max
  },
  bureau: {
    prefix: 'BST',
    table: 'bureau_syndicat',
    column: 'bureau_code',
    length: 4 // BST0001 = 7 chars max
  },
  driver: {
    prefix: 'DRV',
    table: 'taxi_moto_drivers',
    column: 'driver_code',
    length: 4 // DRV0001 = 7 chars max
  },
  client: {
    prefix: 'CLT',
    table: 'users',
    column: 'client_code',
    length: 4 // CLT0001 = 7 chars max
  },
  pdg: {
    prefix: 'PDG',
    table: 'pdg_accounts',
    column: 'pdg_code',
    length: 4 // PDG0001 = 7 chars max
  },
  transitaire: {
    prefix: 'TRS',
    table: 'transitaires',
    column: 'transitaire_code',
    length: 4 // TRS0001 = 7 chars max
  },
  worker: {
    prefix: 'WRK',
    table: 'workers',
    column: 'worker_code',
    length: 4 // WRK0001 = 7 chars max
  }
};

/**
 * Génère un ID unique pour un rôle donné
 * Format: PREFIX + NUMERO (ex: AGT0001, VND0042)
 * Cherche le MAX dans user_ids pour garantir l'unicité
 */
export async function generateAutoId(roleType: RoleType): Promise<string> {
  const config = ID_CONFIGS[roleType];
  
  try {
    // Récupérer le plus grand ID existant dans user_ids pour ce préfixe
    const { data: userIdsData, error: userIdsError } = await supabase
      .from('user_ids')
      .select('custom_id')
      .like('custom_id', `${config.prefix}%`)
      .order('custom_id', { ascending: false })
      .limit(10);

    let maxNumber = 0;

    if (!userIdsError && userIdsData && userIdsData.length > 0) {
      // Trouver le plus grand numéro
      for (const row of userIdsData) {
        if (row.custom_id) {
          const numericPart = row.custom_id.replace(config.prefix, '');
          const num = parseInt(numericPart, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    // Vérifier aussi dans la table de rôle
    const { data, error } = await supabase
      .from(config.table as any)
      .select(config.column)
      .not(config.column, 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data && data.length > 0) {
      for (const row of data) {
        const code = row[config.column];
        if (code) {
          const numericPart = code.replace(config.prefix, '');
          const num = parseInt(numericPart, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    // Générer le nouvel ID (max + 1)
    const nextNumber = maxNumber + 1;
    const newId = `${config.prefix}${nextNumber.toString().padStart(config.length, '0')}`;
    
    console.log(`✅ ID généré pour ${roleType}: ${newId} (max trouvé: ${maxNumber})`);
    return newId;
    
  } catch (error) {
    console.error(`Erreur génération ID ${roleType}:`, error);
    // Fallback: timestamp pour garantir l'unicité
    const timestamp = Date.now().toString().slice(-4);
    return `${config.prefix}${timestamp}`;
  }
}

/**
 * Vérifie si un ID existe déjà dans user_ids (contrainte d'unicité principale)
 */
export async function checkIdExists(roleType: RoleType, id: string): Promise<boolean> {
  try {
    // Vérifier dans user_ids qui a la contrainte d'unicité sur custom_id
    const { data: userIdData, error: userIdError } = await supabase
      .from('user_ids')
      .select('custom_id')
      .eq('custom_id', id)
      .maybeSingle();

    if (userIdError) {
      console.error(`Erreur vérification ID dans user_ids:`, userIdError);
    }

    if (userIdData) {
      console.log(`⚠️ ID ${id} déjà existant dans user_ids`);
      return true;
    }

    // Vérification supplémentaire dans la table de rôle
    const config = ID_CONFIGS[roleType];
    const { data, error } = await supabase
      .from(config.table as any)
      .select(config.column)
      .eq(config.column, id)
      .maybeSingle();

    if (error) {
      console.error(`Erreur vérification ID ${roleType}:`, error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error(`Erreur checkIdExists ${roleType}:`, error);
    return false;
  }
}

/**
 * Génère un ID unique avec vérification anti-doublon
 */
export async function generateUniqueId(roleType: RoleType): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const newId = await generateAutoId(roleType);
    const exists = await checkIdExists(roleType, newId);

    if (!exists) {
      return newId;
    }

    attempts++;
    console.warn(`ID ${newId} existe déjà, tentative ${attempts}/${maxAttempts}`);
  }

  // Fallback: ajouter timestamp
  const config = ID_CONFIGS[roleType];
  const timestamp = Date.now().toString().slice(-6);
  return `${config.prefix}${timestamp}`;
}

/**
 * Formatte un ID pour l'affichage
 */
export function formatIdForDisplay(id: string | null | undefined, roleType?: RoleType): string {
  if (!id) {
    return roleType ? `${ID_CONFIGS[roleType].prefix}-----` : '-----';
  }
  return id;
}

/**
 * Valide le format d'un ID
 */
export function validateIdFormat(id: string, roleType: RoleType): boolean {
  const config = ID_CONFIGS[roleType];
  const regex = new RegExp(`^${config.prefix}\\d{${config.length}}$`);
  return regex.test(id);
}

/**
 * Obtient la configuration pour un rôle
 */
export function getIdConfig(roleType: RoleType): IdConfig {
  return ID_CONFIGS[roleType];
}
