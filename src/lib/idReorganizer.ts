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
  const result: ReorganizationResult = {
    success: true,
    reorganized: [],
    errors: []
  };

  try {
    const { data, error } = await supabase.rpc('reorganize_user_ids_from_db', {
      p_role_type: roleType,
    });

    if (error) {
      throw new Error(`Erreur RPC réorganisation: ${error.message}`);
    }

    const rows = (data || []) as Array<{
      role_type: string;
      user_id: string;
      old_id: string | null;
      new_id: string;
      action: string;
    }>;

    result.reorganized = rows
      .filter((row) => row.action === 'reorganized')
      .map((row) => ({
        oldId: row.old_id || '',
        newId: row.new_id,
        userId: row.user_id,
      }));

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
