/**
 * 🔐 AWS COGNITO AUTH SERVICE
 * Gère l'authentification via Amazon Cognito
 * Sign up, Sign in, Forgot password, Token refresh
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
  ISignUpResult,
} from 'amazon-cognito-identity-js';
import { cognitoConfig, getCognitoConfigErrors, isCognitoConfigured } from '@/config/cognito';

// Singleton User Pool (évite de recréer à chaque appel)
let userPoolInstance: CognitoUserPool | null = null;

export const getCognitoSetupError = (): string | null => {
  if (!isCognitoConfigured()) {
    return 'Configuration Cognito manquante: ajoutez VITE_AWS_COGNITO_USER_POOL_ID et VITE_AWS_COGNITO_CLIENT_ID';
  }

  const errors = getCognitoConfigErrors();
  return errors.length ? errors[0] : null;
};

const getUserPool = (): CognitoUserPool | null => {
  const setupError = getCognitoSetupError();
  if (setupError) {
    console.warn('⚠️ [Cognito] Configuration invalide:', setupError);
    return null;
  }

  if (!userPoolInstance) {
    userPoolInstance = new CognitoUserPool({
      UserPoolId: cognitoConfig.userPoolId,
      ClientId: cognitoConfig.clientId,
    });
  }

  return userPoolInstance;
};

export interface CognitoAuthResult {
  success: boolean;
  session?: CognitoUserSession;
  user?: CognitoUser;
  error?: string;
  needsConfirmation?: boolean;
  challengeName?: string;
}

export interface CognitoTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Inscription via Cognito
 */
export const cognitoSignUp = (
  email: string,
  password: string,
  attributes: Record<string, string> = {}
): Promise<CognitoAuthResult> => {
  return new Promise((resolve) => {
    const userPool = getUserPool();
    if (!userPool) {
      resolve({ success: false, error: getCognitoSetupError() || 'Cognito non configuré' });
      return;
    }

    const attributeList: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
    ];

    // Ajouter les attributs personnalisés (role, full_name, phone, etc.)
    Object.entries(attributes).forEach(([key, value]) => {
      if (value) {
        attributeList.push(
          new CognitoUserAttribute({ Name: key, Value: value })
        );
      }
    });

    userPool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) {
        console.error('❌ [Cognito] Erreur inscription:', err.message);
        resolve({ success: false, error: mapCognitoError(err) });
        return;
      }

      console.log('✅ [Cognito] Inscription réussie:', result?.user.getUsername());
      resolve({
        success: true,
        user: result?.user,
        needsConfirmation: !result?.userConfirmed,
      });
    });
  });
};

/**
 * Confirmation du code de vérification (email)
 */
export const cognitoConfirmSignUp = (
  email: string,
  code: string
): Promise<CognitoAuthResult> => {
  return new Promise((resolve) => {
    const userPool = getUserPool();
    if (!userPool) {
      resolve({ success: false, error: getCognitoSetupError() || 'Cognito non configuré' });
      return;
    }

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) {
        console.error('❌ [Cognito] Erreur confirmation:', err.message);
        resolve({ success: false, error: mapCognitoError(err) });
        return;
      }

      console.log('✅ [Cognito] Email confirmé');
      resolve({ success: true });
    });
  });
};

/**
 * Connexion via Cognito
 */
export const cognitoSignIn = (
  email: string,
  password: string
): Promise<CognitoAuthResult> => {
  return new Promise((resolve) => {
    const userPool = getUserPool();
    if (!userPool) {
      resolve({ success: false, error: getCognitoSetupError() || 'Cognito non configuré' });
      return;
    }

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        console.log('✅ [Cognito] Connexion réussie');
        resolve({ success: true, session, user: cognitoUser });
      },
      onFailure: (err) => {
        console.error('❌ [Cognito] Erreur connexion:', err.message);
        resolve({ success: false, error: mapCognitoError(err) });
      },
      newPasswordRequired: () => {
        resolve({
          success: false,
          challengeName: 'NEW_PASSWORD_REQUIRED',
          error: 'Nouveau mot de passe requis',
          user: cognitoUser,
        });
      },
    });
  });
};

/**
 * Déconnexion
 */
export const cognitoSignOut = (): void => {
  const userPool = getUserPool();
  if (!userPool) return;

  const currentUser = userPool.getCurrentUser();
  if (currentUser) {
    currentUser.signOut();
    console.log('✅ [Cognito] Déconnexion réussie');
  }
};

/**
 * Récupérer la session courante
 */
export const cognitoGetCurrentSession = (): Promise<CognitoUserSession | null> => {
  return new Promise((resolve) => {
    const userPool = getUserPool();
    if (!userPool) {
      resolve(null);
      return;
    }

    const currentUser = userPool.getCurrentUser();
    if (!currentUser) {
      resolve(null);
      return;
    }

    currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        resolve(null);
        return;
      }
      resolve(session);
    });
  });
};

/**
 * Récupérer l'utilisateur courant
 */
export const cognitoGetCurrentUser = (): CognitoUser | null => {
  const userPool = getUserPool();
  if (!userPool) return null;
  return userPool.getCurrentUser();
};

/**
 * Extraire les tokens de la session
 */
export const getTokensFromSession = (session: CognitoUserSession): CognitoTokens => {
  return {
    idToken: session.getIdToken().getJwtToken(),
    accessToken: session.getAccessToken().getJwtToken(),
    refreshToken: session.getRefreshToken().getToken(),
  };
};

/**
 * Réinitialisation du mot de passe - Étape 1 : Envoyer le code
 */
export const cognitoForgotPassword = (email: string): Promise<CognitoAuthResult> => {
  return new Promise((resolve) => {
    const userPool = getUserPool();
    if (!userPool) {
      resolve({ success: false, error: getCognitoSetupError() || 'Cognito non configuré' });
      return;
    }

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.forgotPassword({
      onSuccess: () => {
        console.log('✅ [Cognito] Code de réinitialisation envoyé');
        resolve({ success: true });
      },
      onFailure: (err) => {
        console.error('❌ [Cognito] Erreur forgot password:', err.message);
        resolve({ success: false, error: mapCognitoError(err) });
      },
    });
  });
};

/**
 * Réinitialisation du mot de passe - Étape 2 : Confirmer avec le code
 */
export const cognitoConfirmPassword = (
  email: string,
  code: string,
  newPassword: string
): Promise<CognitoAuthResult> => {
  return new Promise((resolve) => {
    const userPool = getUserPool();
    if (!userPool) {
      resolve({ success: false, error: 'Cognito non configuré' });
      return;
    }

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => {
        console.log('✅ [Cognito] Mot de passe réinitialisé');
        resolve({ success: true });
      },
      onFailure: (err) => {
        console.error('❌ [Cognito] Erreur confirm password:', err.message);
        resolve({ success: false, error: mapCognitoError(err) });
      },
    });
  });
};

/**
 * Rafraîchir la session (token refresh)
 */
export const cognitoRefreshSession = (): Promise<CognitoUserSession | null> => {
  return new Promise((resolve) => {
    const userPool = getUserPool();
    if (!userPool) {
      resolve(null);
      return;
    }

    const currentUser = userPool.getCurrentUser();
    if (!currentUser) {
      resolve(null);
      return;
    }

    currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        resolve(null);
        return;
      }

      // Le SDK rafraîchit automatiquement si le token est expiré
      if (session.isValid()) {
        resolve(session);
      } else {
        const refreshToken = session.getRefreshToken();
        currentUser.refreshSession(refreshToken, (refreshErr, newSession) => {
          if (refreshErr) {
            console.error('❌ [Cognito] Erreur refresh:', refreshErr.message);
            resolve(null);
            return;
          }
          resolve(newSession);
        });
      }
    });
  });
};

/**
 * Mapper les erreurs Cognito en messages lisibles (FR)
 */
function mapCognitoError(err: any): string {
  const code = err?.code || err?.name || '';
  
  switch (code) {
    case 'UserNotFoundException':
      return 'Aucun compte trouvé avec cet email';
    case 'NotAuthorizedException':
      return 'Email ou mot de passe incorrect';
    case 'UsernameExistsException':
      return 'Un compte existe déjà avec cet email';
    case 'InvalidPasswordException':
      return 'Le mot de passe ne respecte pas les critères de sécurité';
    case 'CodeMismatchException':
      return 'Code de vérification incorrect';
    case 'ExpiredCodeException':
      return 'Le code de vérification a expiré';
    case 'LimitExceededException':
      return 'Trop de tentatives. Réessayez plus tard';
    case 'UserNotConfirmedException':
      return 'Veuillez confirmer votre email avant de vous connecter';
    case 'InvalidParameterException':
      return 'Paramètres invalides. Vérifiez vos informations';
    case 'NetworkError':
      return 'Erreur réseau. Vérifiez votre connexion internet';
    default:
      return err?.message || 'Une erreur est survenue';
  }
}
