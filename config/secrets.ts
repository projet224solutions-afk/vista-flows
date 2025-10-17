/**
 * 🔐 GESTION DES SECRETS - 224SOLUTIONS
 * Système de gestion des secrets avec support AWS Secrets Manager et HashiCorp Vault
 */

import { createClient } from '@supabase/supabase-js';

// Configuration des providers de secrets
export interface SecretsConfig {
  provider: 'aws' | 'vault' | 'supabase' | 'env';
  region?: string;
  endpoint?: string;
  roleArn?: string;
}

// Configuration par défaut
const defaultConfig: SecretsConfig = {
  provider: process.env.SECRETS_PROVIDER as 'aws' | 'vault' | 'supabase' | 'env' || 'env',
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.VAULT_ENDPOINT,
  roleArn: process.env.AWS_ROLE_ARN
};

// Client Supabase pour stockage des secrets
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Récupère un secret depuis le provider configuré
 */
export async function getSecret(key: string, config: SecretsConfig = defaultConfig): Promise<string> {
  try {
    switch (config.provider) {
      case 'aws':
        return await getSecretFromAWS(key, config);
      
      case 'vault':
        return await getSecretFromVault(key, config);
      
      case 'supabase':
        return await getSecretFromSupabase(key);
      
      case 'env':
      default:
        return getSecretFromEnv(key);
    }
  } catch (error) {
    console.error(`Erreur récupération secret ${key}:`, error);
    throw new Error(`Impossible de récupérer le secret: ${key}`);
  }
}

/**
 * Récupère un secret depuis AWS Secrets Manager
 */
async function getSecretFromAWS(key: string, config: SecretsConfig): Promise<string> {
  // En production, utiliser AWS SDK
  const AWS = require('aws-sdk');
  const secretsManager = new AWS.SecretsManager({
    region: config.region,
    ...(config.roleArn && { roleArn: config.roleArn })
  });

  const result = await secretsManager.getSecretValue({
    SecretId: key
  }).promise();

  return result.SecretString || '';
}

/**
 * Récupère un secret depuis HashiCorp Vault
 */
async function getSecretFromVault(key: string, config: SecretsConfig): Promise<string> {
  // En production, utiliser Vault client
  const vault = require('node-vault')({
    endpoint: config.endpoint,
    token: process.env.VAULT_TOKEN
  });

  const result = await vault.read(key);
  return result.data.value || '';
}

/**
 * Récupère un secret depuis Supabase (table secrets)
 */
async function getSecretFromSupabase(key: string): Promise<string> {
  const { data, error } = await supabase
    .from('secrets')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    throw new Error(`Secret ${key} non trouvé`);
  }

  return data.value;
}

/**
 * Récupère un secret depuis les variables d'environnement
 */
function getSecretFromEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variable d'environnement ${key} non définie`);
  }
  return value;
}

/**
 * Stocke un secret dans le provider configuré
 */
export async function setSecret(key: string, value: string, config: SecretsConfig = defaultConfig): Promise<void> {
  try {
    switch (config.provider) {
      case 'aws':
        await setSecretInAWS(key, value, config);
        break;
      
      case 'vault':
        await setSecretInVault(key, value, config);
        break;
      
      case 'supabase':
        await setSecretInSupabase(key, value);
        break;
      
      case 'env':
      default:
        throw new Error('Impossible de stocker dans les variables d\'environnement');
    }
  } catch (error) {
    console.error(`Erreur stockage secret ${key}:`, error);
    throw error;
  }
}

/**
 * Stocke un secret dans AWS Secrets Manager
 */
async function setSecretInAWS(key: string, value: string, config: SecretsConfig): Promise<void> {
  const AWS = require('aws-sdk');
  const secretsManager = new AWS.SecretsManager({
    region: config.region,
    ...(config.roleArn && { roleArn: config.roleArn })
  });

  await secretsManager.createSecret({
    Name: key,
    SecretString: value
  }).promise();
}

/**
 * Stocke un secret dans HashiCorp Vault
 */
async function setSecretInVault(key: string, value: string, config: SecretsConfig): Promise<void> {
  const vault = require('node-vault')({
    endpoint: config.endpoint,
    token: process.env.VAULT_TOKEN
  });

  await vault.write(key, { value });
}

/**
 * Stocke un secret dans Supabase
 */
async function setSecretInSupabase(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('secrets')
    .upsert({ key, value });

  if (error) {
    throw new Error(`Erreur stockage secret ${key}: ${error.message}`);
  }
}

/**
 * Clés de secrets utilisées dans l'application
 */
export const SECRET_KEYS = {
  PDG_ACCESS_CODE: 'PDG_ACCESS_CODE',
  ADMIN_ACCESS_CODE: 'ADMIN_ACCESS_CODE',
  DEV_ACCESS_CODE: 'DEV_ACCESS_CODE',
  JWT_SECRET: 'JWT_SECRET',
  ENCRYPTION_KEY: 'ENCRYPTION_KEY',
  DATABASE_URL: 'DATABASE_URL',
  SUPABASE_SERVICE_KEY: 'SUPABASE_SERVICE_KEY',
  FIREBASE_CONFIG: 'FIREBASE_CONFIG',
  GOOGLE_CLOUD_KEY: 'GOOGLE_CLOUD_KEY'
} as const;

/**
 * Placeholders pour les secrets (à utiliser dans la documentation)
 */
export const SECRET_PLACEHOLDERS = {
  PDG_ACCESS_CODE: 'SECRET_MANAGER://pdg/access_code',
  ADMIN_ACCESS_CODE: 'SECRET_MANAGER://admin/access_code',
  DEV_ACCESS_CODE: 'SECRET_MANAGER://dev/access_code',
  JWT_SECRET: 'SECRET_MANAGER://auth/jwt_secret',
  ENCRYPTION_KEY: 'SECRET_MANAGER://crypto/encryption_key',
  DATABASE_URL: 'SECRET_MANAGER://database/url',
  SUPABASE_SERVICE_KEY: 'SECRET_MANAGER://supabase/service_key',
  FIREBASE_CONFIG: 'SECRET_MANAGER://firebase/config',
  GOOGLE_CLOUD_KEY: 'SECRET_MANAGER://gcp/api_key'
} as const;
