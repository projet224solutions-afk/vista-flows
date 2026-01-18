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
 * Format: PREFIX + NUMERO (ex: AGT00001, VND00042)
 */
export async function generateAutoId(roleType: RoleType): Promise<string> {
  const config = ID_CONFIGS[roleType];
  
  try {
    // Récupérer le dernier ID généré
    const { data, error } = await supabase
      .from(config.table as any)
      .select(config.column)
      .not(config.column, 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error(`Erreur récupération dernier ${roleType} ID:`, error);
      // En cas d'erreur, commencer à 1
      return `${config.prefix}${'1'.padStart(config.length, '0')}`;
    }

    let nextNumber = 1;

    if (data && data.length > 0) {
      const lastCode = data[0][config.column];
      if (lastCode) {
        // Extraire le numéro du code (enlever le préfixe)
        const numericPart = lastCode.replace(config.prefix, '');
        const lastNumber = parseInt(numericPart, 10);
        
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }

    // Générer le nouvel ID
    const newId = `${config.prefix}${nextNumber.toString().padStart(config.length, '0')}`;
    
    console.log(`✅ ID généré pour ${roleType}:`, newId);
    return newId;
    
  } catch (error) {
    console.error(`Erreur génération ID ${roleType}:`, error);
    // Fallback: ID aléatoire
    const randomNum = Math.floor(Math.random() * 99999);
    return `${config.prefix}${randomNum.toString().padStart(config.length, '0')}`;
  }
}

/**
 * Vérifie si un ID existe déjà
 */
export async function checkIdExists(roleType: RoleType, id: string): Promise<boolean> {
  const config = ID_CONFIGS[roleType];
  
  try {
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
