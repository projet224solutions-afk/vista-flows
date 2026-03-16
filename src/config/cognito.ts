/**
 * 🔐 AWS COGNITO CONFIGURATION
 * Configuration centralisée pour Amazon Cognito
 * Les valeurs sont injectées via les secrets Lovable (env vars)
 */

const USER_POOL_ID_PATTERN = /^[\w-]+_[A-Za-z0-9]+$/;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9_]{8,128}$/;

export const cognitoConfig = {
  userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID || '',
  clientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID || '',
  region: import.meta.env.VITE_AWS_COGNITO_REGION || 'us-east-1',
};

/**
 * Vérifie si la configuration minimale Cognito est disponible
 */
export const isCognitoConfigured = (): boolean => {
  return !!(cognitoConfig.userPoolId && cognitoConfig.clientId);
};

/**
 * Valide le format de la configuration Cognito et retourne les erreurs lisibles.
 */
export const getCognitoConfigErrors = (): string[] => {
  const errors: string[] = [];

  if (!cognitoConfig.userPoolId) {
    errors.push('Variable manquante: VITE_AWS_COGNITO_USER_POOL_ID');
  } else if (!USER_POOL_ID_PATTERN.test(cognitoConfig.userPoolId)) {
    errors.push('VITE_AWS_COGNITO_USER_POOL_ID est invalide (format attendu: région_xxxxx).');
  }

  if (!cognitoConfig.clientId) {
    errors.push('Variable manquante: VITE_AWS_COGNITO_CLIENT_ID');
  } else if (cognitoConfig.clientId.startsWith('arn:')) {
    errors.push('VITE_AWS_COGNITO_CLIENT_ID est invalide: vous avez mis un ARN. Utilisez l\'App client ID Cognito (ex: 2h7k3...).');
  } else if (!CLIENT_ID_PATTERN.test(cognitoConfig.clientId)) {
    errors.push('VITE_AWS_COGNITO_CLIENT_ID est invalide (utilisez l\'App client ID Cognito, pas l\'ID/ARN du User Pool).');
  }

  if (!cognitoConfig.region) {
    errors.push('Variable manquante: VITE_AWS_COGNITO_REGION');
  }

  return errors;
};
