/**
 * 🔄 COGNITO SYNC SERVICE
 * Synchronise le profil Cognito avec le backend (Google Cloud SQL)
 * Appelé après chaque connexion/inscription Cognito réussie
 */

import { backendConfig } from '@/config/backend';

interface SyncProfilePayload {
  additionalData?: {
    city?: string;
    country?: string;
    currency?: string;
  };
}

interface SyncResult {
  success: boolean;
  user?: any;
  error?: string;
}

/**
 * Synchronise le profil après login Cognito
 */
export async function syncCognitoProfile(
  idToken: string,
  additionalData?: SyncProfilePayload['additionalData']
): Promise<SyncResult> {
  try {
    const response = await fetch(`${backendConfig.baseUrl}/api/cognito/sync-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ additionalData }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ [CognitoSync] Erreur sync:', data.error);
      return { success: false, error: data.error };
    }

    console.log('✅ [CognitoSync] Profil synchronisé avec Cloud SQL');
    return { success: true, user: data.user };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur réseau';
    console.error('❌ [CognitoSync] Erreur réseau:', message);
    return { success: false, error: message };
  }
}

/**
 * Récupère le profil complet depuis Cloud SQL
 */
export async function fetchCognitoProfile(idToken: string): Promise<SyncResult> {
  try {
    const response = await fetch(`${backendConfig.baseUrl}/api/cognito/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, user: data.user };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur réseau';
    console.error('❌ [CognitoSync] Erreur fetch profil:', message);
    return { success: false, error: message };
  }
}

/**
 * Valide le token Cognito auprès du backend
 */
export async function validateCognitoToken(idToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${backendConfig.baseUrl}/api/cognito/validate-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
