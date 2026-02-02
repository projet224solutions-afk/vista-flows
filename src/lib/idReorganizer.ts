/**
 * Système de réorganisation des IDs
 * Comble automatiquement les "trous" dans la séquence des IDs
 * quand un utilisateur est supprimé
 */

import { supabase } from "@/integrations/supabase/client";
import { RoleType, getIdConfig } from "./autoIdGenerator";

interface ReorganizationResult {
  success: boolean;
  reorganized: { oldId: string; newId: string; userId: string }[];
  errors: string[];
}

interface IdGap {
  missingNumber: number;
  nextId: string;
  nextNumber: number;
  userId: string;
}

/**
 * Analyse les IDs pour un type de rôle et identifie les gaps
 */
export async function analyzeIdGaps(roleType: RoleType): Promise<{
  gaps: IdGap[];
  allIds: { custom_id: string; user_id: string; number: number }[];
  maxNumber: number;
}> {
  const config = getIdConfig(roleType);
  
  // Récupérer tous les IDs pour ce préfixe
  const { data, error } = await supabase
    .from('user_ids')
    .select('custom_id, user_id')
    .like('custom_id', `${config.prefix}%`)
    .order('custom_id', { ascending: true });

  if (error) {
    console.error('Erreur analyse gaps:', error);
    return { gaps: [], allIds: [], maxNumber: 0 };
  }

  if (!data || data.length === 0) {
    return { gaps: [], allIds: [], maxNumber: 0 };
  }

  // Extraire les numéros et trier
  const allIds = data
    .map(row => ({
      custom_id: row.custom_id,
      user_id: row.user_id,
      number: parseInt(row.custom_id.replace(config.prefix, ''), 10)
    }))
    .filter(item => !isNaN(item.number))
    .sort((a, b) => a.number - b.number);

  const gaps: IdGap[] = [];
  let expectedNumber = 1;

  for (const item of allIds) {
    while (expectedNumber < item.number) {
      // On a trouvé un gap - le prochain ID doit être déplacé ici
      gaps.push({
        missingNumber: expectedNumber,
        nextId: item.custom_id,
        nextNumber: item.number,
        userId: item.user_id
      });
      expectedNumber++;
    }
    expectedNumber = item.number + 1;
  }

  const maxNumber = allIds.length > 0 ? allIds[allIds.length - 1].number : 0;

  return { gaps, allIds, maxNumber };
}

/**
 * Réorganise les IDs pour combler les gaps
 * Les IDs sont décalés vers le bas pour remplir les trous
 */
export async function reorganizeIds(roleType: RoleType): Promise<ReorganizationResult> {
  const config = getIdConfig(roleType);
  const result: ReorganizationResult = {
    success: true,
    reorganized: [],
    errors: []
  };

  try {
    // Récupérer tous les IDs triés
    const { data, error } = await supabase
      .from('user_ids')
      .select('id, custom_id, user_id')
      .like('custom_id', `${config.prefix}%`)
      .order('custom_id', { ascending: true });

    if (error) {
      throw new Error(`Erreur récupération IDs: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return result;
    }

    // Extraire et trier par numéro
    const sortedIds = data
      .map(row => ({
        id: row.id,
        custom_id: row.custom_id,
        user_id: row.user_id,
        number: parseInt(row.custom_id.replace(config.prefix, ''), 10)
      }))
      .filter(item => !isNaN(item.number))
      .sort((a, b) => a.number - b.number);

    // Pour chaque ID, vérifier s'il doit être déplacé
    let targetNumber = 1;
    
    for (const item of sortedIds) {
      if (item.number !== targetNumber) {
        // Cet ID doit être réorganisé
        const newId = `${config.prefix}${targetNumber.toString().padStart(config.length, '0')}`;
        
        try {
          // Mettre à jour user_ids
          const { error: updateError } = await supabase
            .from('user_ids')
            .update({ custom_id: newId })
            .eq('id', item.id);

          if (updateError) {
            throw updateError;
          }

          // Mettre à jour la table de rôle
          const { error: roleError } = await supabase
            .from(config.table as any)
            .update({ [config.column]: newId })
            .eq('user_id', item.user_id);

          if (roleError) {
            console.warn(`Avertissement mise à jour table ${config.table}:`, roleError);
          }

          result.reorganized.push({
            oldId: item.custom_id,
            newId: newId,
            userId: item.user_id
          });

          console.log(`✅ Réorganisé: ${item.custom_id} → ${newId}`);
        } catch (err: any) {
          result.errors.push(`Erreur ${item.custom_id}: ${err.message}`);
          console.error(`❌ Erreur réorganisation ${item.custom_id}:`, err);
        }
      }
      targetNumber++;
    }

    result.success = result.errors.length === 0;
    return result;

  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);
    return result;
  }
}

/**
 * Réorganise tous les types d'IDs
 */
export async function reorganizeAllIds(): Promise<Record<RoleType, ReorganizationResult>> {
  const roleTypes: RoleType[] = ['vendor', 'client', 'agent', 'driver', 'taxi', 'livreur', 'bureau', 'pdg', 'transitaire', 'worker'];
  const results: Partial<Record<RoleType, ReorganizationResult>> = {};

  for (const roleType of roleTypes) {
    console.log(`📋 Réorganisation des IDs ${roleType}...`);
    results[roleType] = await reorganizeIds(roleType);
  }

  return results as Record<RoleType, ReorganizationResult>;
}

/**
 * Génère le prochain ID disponible (comble les gaps d'abord)
 */
export async function getNextAvailableId(roleType: RoleType): Promise<string> {
  const config = getIdConfig(roleType);
  
  // Récupérer tous les IDs existants
  const { data, error } = await supabase
    .from('user_ids')
    .select('custom_id')
    .like('custom_id', `${config.prefix}%`)
    .order('custom_id', { ascending: true });

  if (error || !data || data.length === 0) {
    // Premier ID
    return `${config.prefix}${'1'.padStart(config.length, '0')}`;
  }

  // Extraire les numéros utilisés
  const usedNumbers = new Set(
    data
      .map(row => parseInt(row.custom_id.replace(config.prefix, ''), 10))
      .filter(num => !isNaN(num))
  );

  // Trouver le premier numéro disponible
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber++;
  }

  return `${config.prefix}${nextNumber.toString().padStart(config.length, '0')}`;
}

/**
 * Statistiques des IDs pour un type
 */
export async function getIdStats(roleType: RoleType): Promise<{
  total: number;
  maxNumber: number;
  gaps: number[];
  gapCount: number;
}> {
  const config = getIdConfig(roleType);
  
  const { data, error } = await supabase
    .from('user_ids')
    .select('custom_id')
    .like('custom_id', `${config.prefix}%`);

  if (error || !data) {
    return { total: 0, maxNumber: 0, gaps: [], gapCount: 0 };
  }

  const numbers = data
    .map(row => parseInt(row.custom_id.replace(config.prefix, ''), 10))
    .filter(num => !isNaN(num))
    .sort((a, b) => a - b);

  if (numbers.length === 0) {
    return { total: 0, maxNumber: 0, gaps: [], gapCount: 0 };
  }

  const maxNumber = numbers[numbers.length - 1];
  const gaps: number[] = [];

  for (let i = 1; i <= maxNumber; i++) {
    if (!numbers.includes(i)) {
      gaps.push(i);
    }
  }

  return {
    total: numbers.length,
    maxNumber,
    gaps,
    gapCount: gaps.length
  };
}
