/**
 * 💬 HOOK - useCommunicationButton
 * Hook professionnel pour gérer l'initiation de conversations
 * 
 * Features:
 * - Validation des entrées
 * - Gestion d'état complète
 * - Gestion d'erreurs robuste
 * - Navigation automatique
 * - Logging détaillé
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface CommunicationButtonState {
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
}

export interface CommunicationResult {
  success: boolean;
  conversationId: string | null;
  isNewConversation: boolean;
  error?: string;
}

export interface UseCommunicationButtonOptions {
  /** Message initial à envoyer (optionnel) */
  initialMessage?: string;
  /** Rediriger automatiquement vers la conversation */
  autoNavigate?: boolean;
  /** Afficher les toasts de succès/erreur */
  showToasts?: boolean;
  /** Callback après création réussie */
  onSuccess?: (result: CommunicationResult) => void;
  /** Callback en cas d'erreur */
  onError?: (error: string) => void;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// HOOK
// ============================================================================

export function useCommunicationButton(options: UseCommunicationButtonOptions = {}) {
  const navigate = useNavigate();
  
  const {
    initialMessage = 'Bonjour',
    autoNavigate = true,
    showToasts = true,
    onSuccess,
    onError
  } = options;
  
  const [state, setState] = useState<CommunicationButtonState>({
    isLoading: false,
    error: null,
    conversationId: null
  });
  
  /**
   * Démarre une conversation avec un utilisateur cible
   */
  const startConversation = useCallback(async (
    userId: string,
    targetId: string,
    customMessage?: string
  ): Promise<CommunicationResult> => {
    // Validation des entrées
    if (!validateUUID(userId)) {
      const error = 'ID utilisateur invalide';
      setState(prev => ({ ...prev, error }));
      if (showToasts) toast.error(error);
      if (onError) onError(error);
      return { success: false, conversationId: null, isNewConversation: false, error };
    }
    
    if (!validateUUID(targetId)) {
      const error = 'ID destinataire invalide';
      setState(prev => ({ ...prev, error }));
      if (showToasts) toast.error(error);
      if (onError) onError(error);
      return { success: false, conversationId: null, isNewConversation: false, error };
    }
    
    if (userId === targetId) {
      const error = 'Impossible de créer une conversation avec soi-même';
      setState(prev => ({ ...prev, error }));
      if (showToasts) toast.error(error);
      if (onError) onError(error);
      return { success: false, conversationId: null, isNewConversation: false, error };
    }
    
    // Début du chargement
    setState({ isLoading: true, error: null, conversationId: null });
    
    console.log('📨 [useCommunicationButton] Démarrage conversation...', {
      userId,
      targetId,
      hasMessage: !!(customMessage || initialMessage)
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('communication-handler', {
        body: {
          userId,
          targetId,
          initialMessage: { text: customMessage || initialMessage }
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Erreur lors de la création de la conversation');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Échec de la création de conversation');
      }
      
      console.log('✅ [useCommunicationButton] Conversation créée:', data);
      
      const result: CommunicationResult = {
        success: true,
        conversationId: data.conversationId,
        isNewConversation: data.isNewConversation || false
      };
      
      // Mettre à jour l'état
      setState({
        isLoading: false,
        error: null,
        conversationId: data.conversationId
      });
      
      // Navigation automatique
      if (autoNavigate && data.conversationId) {
        navigate(`/communication/${data.conversationId}`);
      }
      
      // Toast de succès
      if (showToasts) {
        toast.success(
          data.isNewConversation 
            ? 'Nouvelle conversation créée' 
            : 'Conversation ouverte'
        );
      }
      
      // Callback de succès
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      console.error('❌ [useCommunicationButton] Erreur:', errorMessage);
      
      setState({
        isLoading: false,
        error: errorMessage,
        conversationId: null
      });
      
      if (showToasts) {
        toast.error(errorMessage);
      }
      
      if (onError) {
        onError(errorMessage);
      }
      
      return {
        success: false,
        conversationId: null,
        isNewConversation: false,
        error: errorMessage
      };
    }
  }, [initialMessage, autoNavigate, showToasts, navigate, onSuccess, onError]);
  
  /**
   * Réinitialise l'état du hook
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      conversationId: null
    });
  }, []);
  
  /**
   * Navigue vers une conversation existante
   */
  const goToConversation = useCallback((conversationId: string) => {
    if (validateUUID(conversationId)) {
      navigate(`/communication/${conversationId}`);
    }
  }, [navigate]);
  
  return {
    // État
    isLoading: state.isLoading,
    error: state.error,
    conversationId: state.conversationId,
    
    // Actions
    startConversation,
    reset,
    goToConversation
  };
}

export default useCommunicationButton;
