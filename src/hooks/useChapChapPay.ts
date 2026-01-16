/**
 * 🪝 HOOK CHAPCHAPPAY - 224SOLUTIONS
 * Hook React pour utiliser les paiements Mobile Money via ChapChapPay
 */

import { useState, useCallback } from "react";
import { 
  chapChapPayService, 
  CCPEcommerceRequest, 
  CCPPullRequest, 
  CCPPushRequest,
  CCPPaymentResult,
  CCPStatusResult 
} from "@/services/payment/ChapChapPayService";
import { toast } from "sonner";

// Type exporté pour les méthodes de paiement ChapChapPay
export type ChapChapPayMethod = 'orange_money' | 'mtn_momo' | 'paycard' | 'card';

export function useChapChapPay() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create E-Commerce payment and optionally redirect
   */
  const createEcommercePayment = useCallback(async (
    request: CCPEcommerceRequest,
    options?: { autoRedirect?: boolean }
  ): Promise<CCPPaymentResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await chapChapPayService.createEcommercePayment(request);
      
      if (!result.success) {
        setError(result.error || "Payment failed");
        toast.error(result.error || "Échec du paiement");
        return result;
      }
      
      if (options?.autoRedirect && result.paymentUrl) {
        window.location.href = result.paymentUrl;
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initiate PULL payment (debit customer)
   * Options:
   * - autoRedirectOnEcommerce: Si ChapChapPay renvoie un lien E-Commerce (fallback),
   *   ouvre automatiquement le lien dans une nouvelle fenêtre
   */
  const initiatePullPayment = useCallback(async (
    request: CCPPullRequest,
    options?: { autoRedirectOnEcommerce?: boolean }
  ): Promise<CCPPaymentResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[ChapChapPay] Initiating PULL payment...', { 
        amount: request.amount, 
        method: request.paymentMethod 
      });
      
      const result = await chapChapPayService.initiatePullPayment(request);
      
      console.log('[ChapChapPay] PULL result received:', {
        success: result.success,
        hasPaymentUrl: !!result.paymentUrl,
        paymentUrl: result.paymentUrl,
        ussdTriggered: result.ussdTriggered,
        status: result.status
      });
      
      if (!result.success) {
        setError(result.error || "Payment failed");
        toast.error(result.error || "Échec du paiement");
        return result;
      }
      
      // Si ChapChapPay renvoie un paymentUrl (fallback E-Commerce au lieu de PULL USSD)
      // ou si ussdTriggered est explicitement false
      if (result.paymentUrl && (result.ussdTriggered === false || !result.ussdTriggered)) {
        console.log('[ChapChapPay] ⚠️ PULL fallback to E-Commerce detected!');
        console.log('[ChapChapPay] Opening payment URL:', result.paymentUrl);
        
        // Auto-redirect si demandé (par défaut: true)
        if (options?.autoRedirectOnEcommerce !== false) {
          toast.info("Redirection vers ChapChapPay...", {
            description: "Ouvrez la page pour finaliser votre paiement Orange Money",
            duration: 5000
          });
          
          // Petit délai pour laisser le toast s'afficher
          setTimeout(() => {
            // Ouvrir dans un nouvel onglet
            const popup = window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
            
            console.log('[ChapChapPay] Popup opened:', !!popup);
            
            // Si popup bloquée, rediriger dans le même onglet
            if (!popup) {
              console.log('[ChapChapPay] Popup blocked, redirecting in same tab');
              window.location.href = result.paymentUrl!;
            }
          }, 500);
        }
        
        return result;
      }
      
      if (result.requiresOtp) {
        toast.info("Un code OTP a été envoyé sur votre téléphone");
      } else {
        toast.success("Paiement initié - Confirmez sur votre téléphone");
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initiate PUSH payment (send money)
   */
  const initiatePushPayment = useCallback(async (
    request: CCPPushRequest
  ): Promise<CCPPaymentResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await chapChapPayService.initiatePushPayment(request);
      
      if (!result.success) {
        setError(result.error || "Transfer failed");
        toast.error(result.error || "Échec du transfert");
        return result;
      }
      
      toast.success("Transfert effectué avec succès");
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check payment status
   */
  const checkStatus = useCallback(async (
    transactionId?: string,
    orderId?: string
  ): Promise<CCPStatusResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await chapChapPayService.checkStatus(transactionId, orderId);
      
      if (!result.success) {
        setError(result.error || "Status check failed");
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Poll status until completion
   */
  const pollStatus = useCallback(async (
    transactionId: string,
    onStatusChange?: (status: CCPStatusResult) => void
  ): Promise<CCPStatusResult> => {
    return chapChapPayService.pollStatus(transactionId, {
      onStatusChange
    });
  }, []);

  return {
    isLoading,
    error,
    createEcommercePayment,
    initiatePullPayment,
    initiatePushPayment,
    checkStatus,
    pollStatus
  };
}
