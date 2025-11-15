/**
 * HOOK POUR TRANSACTIONS SÉCURISÉES
 * Combine la détection de fraude, l'audit et la mise en file d'attente
 * Assure la sécurité et la scalabilité des transactions
 */

import { useState } from 'react';
import { useFraudDetection } from './useFraudDetection';
import { auditService } from '@/services/auditService';
import { transactionQueueService } from '@/services/transactionQueueService';
import { rateLimiter } from '@/lib/rateLimiter';
import { toast } from 'sonner';

export interface SecureTransactionOptions {
  userId: string;
  amount: number;
  recipientId?: string;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'payment';
  payload: Record<string, any>;
  priority?: number;
  requiresFraudCheck?: boolean;
}

export const useSecureTransaction = () => {
  const [processing, setProcessing] = useState(false);
  const { checkTransaction } = useFraudDetection();

  /**
   * Exécute une transaction sécurisée avec toutes les vérifications
   */
  const executeSecure = async (options: SecureTransactionOptions): Promise<{ success: boolean; queueId?: string }> => {
    setProcessing(true);

    try {
      // 1. Vérifier le rate limiting
      const rateLimitKey = `transaction:${options.userId}`;
      if (!rateLimiter.check(rateLimitKey, { maxRequests: 10, windowMs: 60000 })) {
        toast.error('Trop de transactions', {
          description: 'Veuillez attendre avant de réessayer'
        });
        return { success: false };
      }

      // 2. Détection de fraude pour les transferts et paiements
      if (options.requiresFraudCheck !== false && options.recipientId) {
        const fraudResult = await checkTransaction(
          options.userId,
          options.amount,
          options.recipientId,
          options.type,
          options.payload
        );

        if (!fraudResult) {
          return { success: false };
        }

        // Bloquer si risque critique
        if (fraudResult.riskLevel === 'critical') {
          toast.error('Transaction bloquée', {
            description: 'Cette transaction présente un risque élevé de fraude'
          });

          // Enregistrer l'incident
          await auditService.log({
            action: 'security_alert',
            severity: 'critical',
            user_id: options.userId,
            metadata: {
              transaction_type: options.type,
              amount: options.amount,
              fraud_score: fraudResult.score,
              flags: fraudResult.flags
            }
          });

          return { success: false };
        }

        // Avertir si risque élevé
        if (fraudResult.riskLevel === 'high') {
          toast.warning('Transaction à risque élevé', {
            description: 'Vérification supplémentaire en cours...'
          });
        }
      }

      // 3. Enregistrer dans l'audit
      // Enregistrer dans l'audit
      const auditType = options.type === 'payment' ? 'transfer' : options.type;
      await auditService.logTransaction(
        options.userId,
        auditType,
        options.amount,
        options.recipientId,
        options.payload
      );

      // 4. Mettre en file d'attente pour traitement asynchrone
      const queueId = await transactionQueueService.enqueue({
        transaction_type: options.type,
        user_id: options.userId,
        payload: {
          ...options.payload,
          amount: options.amount,
          recipient_id: options.recipientId
        },
        priority: options.priority || 5,
        max_attempts: 3
      });

      if (!queueId) {
        return { success: false };
      }

      return { success: true, queueId };
    } catch (error) {
      console.error('Secure transaction error:', error);
      toast.error('Erreur de transaction', {
        description: 'Une erreur est survenue lors du traitement'
      });
      return { success: false };
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Vérifie le statut d'une transaction en file d'attente
   */
  const checkStatus = async (queueId: string) => {
    return await transactionQueueService.getStatus(queueId);
  };

  return {
    processing,
    executeSecure,
    checkStatus
  };
};
