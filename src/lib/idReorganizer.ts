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

interface NormalizedIdRow {
  custom_id: string;
  user_id: string;
  number: number;
  prefix: string;
}

interface RoleIdDataset {
  ids: NormalizedIdRow[];
  legacyCount: number;
  invalidCount: number;
}

const ROLE_ALIASES: Record<RoleType, string[]> = {
  agent: ['agent'],
  vendor: ['vendor', 'vendeur'],
  bureau: ['bureau', 'syndicat'],
  driver: ['driver', 'chauffeur'],
  taxi: ['taxi'],
  livreur: ['livreur'],
  client: ['client'],
  pdg: ['pdg'],
  transitaire: ['transitaire'],
  worker: ['worker'],
};

const LEGACY_PREFIXES: Partial<Record<RoleType, string[]>> = {
  client: ['CLI'],
  bureau: ['SYN'],
};

function getSupportedPrefixes(roleType: RoleType): string[] {
  const currentPrefix = getIdConfig(roleType).prefix;
  return Array.from(new Set([currentPrefix, ...(LEGACY_PREFIXES[roleType] ?? [])]));
}

async function fetchRoleIdDataset(roleType: RoleType): Promise<RoleIdDataset> {
  const currentPrefix = getIdConfig(roleType).prefix;
  const supportedPrefixes = getSupportedPrefixes(roleType);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, public_id, custom_id')
    .in('role', ROLE_ALIASES[roleType] as any);

  if (error) {
    console.error(`Erreur récupération IDs ${roleType}:`, error);
    return { ids: [], legacyCount: 0, invalidCount: 0 };
  }

  const idsByUser = new Map<string, NormalizedIdRow>();
  let legacyCount = 0;
  let invalidCount = 0;

  for (const row of data ?? []) {
    const rawId = String(row.public_id || row.custom_id || '').trim().toUpperCase();

    if (!rawId) {
      continue;
    }

    const matchedPrefix = supportedPrefixes.find((prefix) => rawId.startsWith(prefix));

    if (!matchedPrefix) {
      invalidCount++;
      continue;
    }

    const numericPart = rawId.slice(matchedPrefix.length);
    const number = parseInt(numericPart, 10);

    if (!Number.isInteger(number)) {
      invalidCount++;
      continue;
    }

    if (matchedPrefix !== currentPrefix) {
      legacyCount++;
    }

    idsByUser.set(row.id, {
      custom_id: rawId,
      user_id: row.id,
      number,
      prefix: matchedPrefix,
    });
  }

  const ids = Array.from(idsByUser.values()).sort((a, b) => {
    if (a.number !== b.number) {
      return a.number - b.number;
    }

    return a.custom_id.localeCompare(b.custom_id);
  });

  return { ids, legacyCount, invalidCount };
}

/**
 * Analyse les IDs pour un type de rôle et identifie les gaps
 */
export async function analyzeIdGaps(roleType: RoleType): Promise<{
  gaps: IdGap[];
  allIds: { custom_id: string; user_id: string; number: number }[];
  maxNumber: number;
}> {
  const { ids } = await fetchRoleIdDataset(roleType);

  if (ids.length === 0) {
    return { gaps: [], allIds: [], maxNumber: 0 };
  }

  const allIds = Array.from(
    new Map(ids.map((item) => [item.number, item])).values()
  ).sort((a, b) => a.number - b.number);

  const gaps: IdGap[] = [];
  let expectedNumber = 1;

  for (const item of allIds) {
    while (expectedNumber < item.number) {
      gaps.push({
        missingNumber: expectedNumber,
        nextId: item.custom_id,
        nextNumber: item.number,
        userId: item.user_id,
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
  const { ids } = await fetchRoleIdDataset(roleType);

  if (ids.length === 0) {
    return `${config.prefix}${'1'.padStart(config.length, '0')}`;
  }

  const usedNumbers = new Set(ids.map((item) => item.number));

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
  legacyCount: number;
  invalidCount: number;
}> {
  const { ids, legacyCount, invalidCount } = await fetchRoleIdDataset(roleType);
  const numbers = Array.from(new Set(ids.map((item) => item.number))).sort((a, b) => a - b);

  if (numbers.length === 0) {
    return {
      total: ids.length,
      maxNumber: 0,
      gaps: [],
      gapCount: 0,
      legacyCount,
      invalidCount,
    };
  }

  const maxNumber = numbers[numbers.length - 1];
  const usedNumbers = new Set(numbers);
  const gaps: number[] = [];

  for (let i = 1; i <= maxNumber; i++) {
    if (!usedNumbers.has(i)) {
      gaps.push(i);
    }
  }

  return {
    total: ids.length,
    maxNumber,
    gaps,
    gapCount: gaps.length,
    legacyCount,
    invalidCount,
  };
}
