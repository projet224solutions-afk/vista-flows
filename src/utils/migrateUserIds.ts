/**
 * 🔄 SCRIPT MIGRATION: GÉNÉRATION IDs STANDARDISÉS
 * Génère des IDs 3 lettres + 4 chiffres pour tous les utilisateurs sans ID
 * Format: USR0001, VND0001, DRV0001, etc.
 */

import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

// Mapping des rôles vers les préfixes
const ROLE_PREFIX_MAP: Record<string, string> = {
  'client': 'CLI',
  'customer': 'CLI',
  'vendeur': 'VND',
  'vendor': 'VND',
  'livreur': 'DRV',
  'taxi': 'DRV',
  'driver': 'DRV',
  'agent': 'AGE',
  'sub_agent': 'SAG',
  'admin': 'PDG',
  'pdg': 'PDG',
  'syndicat': 'BST',
  'bureau': 'BST',
  'transitaire': 'AGE',
  'user': 'USR'
};

interface MigrationResult {
  success: boolean;
  total: number;
  migrated: number;
  errors: string[];
  ids: Record<string, string>;
}

/**
 * Génère un ID unique au format AAA0001
 */
async function generateUniqueId(prefix: string): Promise<string | null> {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    // Générer 4 chiffres aléatoires (0001-9999)
    const number = Math.floor(Math.random() * 9999) + 1;
    const formattedNumber = number.toString().padStart(4, '0');
    const candidateId = `${prefix}${formattedNumber}`;

    // Vérifier si l'ID existe déjà
    const { data: existing } = await supabase
      .from('profiles')
      .select('public_id')
      .eq('public_id', candidateId)
      .single();

    if (!existing) {
      return candidateId;
    }

    attempts++;
  }

  console.error(`Échec génération ID après ${maxAttempts} tentatives pour préfixe ${prefix}`);
  return null;
}

/**
 * Migrer tous les utilisateurs sans ID
 */
export async function migrateUserIds(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    total: 0,
    migrated: 0,
    errors: [],
    ids: {}
  };

  try {
    console.log('🔄 Début migration IDs...');

    // Récupérer tous les utilisateurs sans public_id
    const { data: usersWithoutId, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, role, first_name, last_name')
      .is('public_id', null);

    if (fetchError) throw fetchError;

    result.total = usersWithoutId?.length || 0;
    console.log(`📊 ${result.total} utilisateurs sans ID trouvés`);

    if (result.total === 0) {
      result.success = true;
      toast.success('Aucune migration nécessaire', {
        description: 'Tous les utilisateurs ont déjà un ID'
      });
      return result;
    }

    // Générer et assigner les IDs
    for (const user of usersWithoutId || []) {
      try {
        // Déterminer le préfixe selon le rôle
        const role = (user.role || 'user').toLowerCase();
        const prefix = ROLE_PREFIX_MAP[role] || 'USR';

        // Générer un ID unique
        const newId = await generateUniqueId(prefix);

        if (!newId) {
          result.errors.push(`User ${user.id}: Échec génération ID`);
          continue;
        }

        // Mettre à jour le profil
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ public_id: newId })
          .eq('id', user.id);

        if (updateError) {
          result.errors.push(`User ${user.id}: ${updateError.message}`);
          continue;
        }

        result.migrated++;
        result.ids[user.id] = newId;
        
        console.log(`✅ ${user.email || user.id}: ${newId}`);
      } catch (err: any) {
        result.errors.push(`User ${user.id}: ${err.message}`);
      }
    }

    result.success = result.migrated > 0;

    // Afficher le résultat
    if (result.success) {
      toast.success(`Migration réussie: ${result.migrated}/${result.total}`, {
        description: `IDs générés avec succès`
      });
    } else {
      toast.error('Migration échouée', {
        description: `${result.errors.length} erreurs`
      });
    }

    console.log('📊 Résultat migration:', {
      total: result.total,
      migrated: result.migrated,
      errors: result.errors.length
    });

    return result;
  } catch (error: any) {
    console.error('Erreur migration:', error);
    result.errors.push(error.message);
    
    toast.error('Erreur migration IDs', {
      description: error.message
    });

    return result;
  }
}

/**
 * Vérifier les IDs en double
 */
export async function checkDuplicateIds(): Promise<{ duplicates: string[]; count: number }> {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('public_id')
      .not('public_id', 'is', null);

    const ids = profiles?.map(p => p.public_id) || [];
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    const uniqueDuplicates = [...new Set(duplicates)];

    if (uniqueDuplicates.length > 0) {
      console.warn('⚠️ IDs en double détectés:', uniqueDuplicates);
      toast.warning(`${uniqueDuplicates.length} IDs en double détectés`);
    } else {
      console.log('✅ Aucun ID en double');
    }

    return {
      duplicates: uniqueDuplicates,
      count: uniqueDuplicates.length
    };
  } catch (error: any) {
    console.error('Erreur vérification doublons:', error);
    return { duplicates: [], count: 0 };
  }
}

/**
 * Statistiques des IDs
 */
export async function getIdStatistics(): Promise<Record<string, number>> {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('public_id, role');

    const stats: Record<string, number> = {
      total: profiles?.length || 0,
      with_id: 0,
      without_id: 0
    };

    profiles?.forEach(p => {
      if (p.public_id) {
        stats.with_id++;
        const prefix = p.public_id.substring(0, 3);
        stats[prefix] = (stats[prefix] || 0) + 1;
      } else {
        stats.without_id++;
      }
    });

    console.log('📊 Statistiques IDs:', stats);
    return stats;
  } catch (error) {
    console.error('Erreur stats IDs:', error);
    return {};
  }
}
