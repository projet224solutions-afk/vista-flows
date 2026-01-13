import { supabase } from "@/integrations/supabase/client";

export type CCPPaymentMethod = "orange_money" | "mtn_momo" | "paycard" | "card";

export interface CCPEcommerceRequest {
  amount: number;
  currency?: string;
  description?: string;
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CCPPullRequest {
  amount: number;
  currency?: string;
  paymentMethod: CCPPaymentMethod;
  customerPhone: string;
  customerName?: string;
  description?: string;
  orderId?: string;
  otp?: string;
}

export interface CCPPushRequest {
  amount: number;
  currency?: string;
  paymentMethod: Exclude<CCPPaymentMethod, "card">;
  recipientPhone: string;
  recipientName?: string;
  description?: string;
  orderId?: string;
}

export interface CCPPaymentResult {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  orderId?: string;
  amount?: number;
  status?: string;
  requiresOtp?: boolean;
  message?: string;
  error?: string;
}

export interface CCPStatusResult {
  success: boolean;
  transactionId?: string;
  orderId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  createdAt?: string;
  completedAt?: string;
  error?: string;
}

class ChapChapPayService {
  /**
   * Create an E-Commerce payment session (redirect to payment page)
   */
  async createEcommercePayment(request: CCPEcommerceRequest): Promise<CCPPaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke("chapchappay-ecommerce", {
        body: request
      });

      if (error) {
        console.error("E-Commerce payment error:", error);
        return { success: false, error: error.message };
      }

      return data as CCPPaymentResult;
    } catch (error) {
      console.error("E-Commerce payment exception:", error);
      return { success: false, error: "Payment initialization failed" };
    }
  }

  /**
   * Initiate a PULL payment (debit customer's mobile money)
   */
  async initiatePullPayment(request: CCPPullRequest): Promise<CCPPaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke("chapchappay-pull", {
        body: request
      });

      if (error) {
        console.error("PULL payment error:", error);
        return { success: false, error: error.message };
      }

      return data as CCPPaymentResult;
    } catch (error) {
      console.error("PULL payment exception:", error);
      return { success: false, error: "Payment initialization failed" };
    }
  }

  /**
   * Initiate a PUSH payment (send money to recipient)
   */
  async initiatePushPayment(request: CCPPushRequest): Promise<CCPPaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke("chapchappay-push", {
        body: request
      });

      if (error) {
        console.error("PUSH payment error:", error);
        return { success: false, error: error.message };
      }

      return data as CCPPaymentResult;
    } catch (error) {
      console.error("PUSH payment exception:", error);
      return { success: false, error: "Transfer failed" };
    }
  }

  /**
   * Check payment status
   */
  async checkStatus(transactionId?: string, orderId?: string): Promise<CCPStatusResult> {
    try {
      const { data, error } = await supabase.functions.invoke("chapchappay-status", {
        body: { transactionId, orderId }
      });

      if (error) {
        console.error("Status check error:", error);
        return { success: false, error: error.message };
      }

      return data as CCPStatusResult;
    } catch (error) {
      console.error("Status check exception:", error);
      return { success: false, error: "Status check failed" };
    }
  }

  /**
   * Open E-Commerce payment page in new tab
   */
  async openPaymentPage(request: CCPEcommerceRequest): Promise<boolean> {
    const result = await this.createEcommercePayment(request);
    
    if (result.success && result.paymentUrl) {
      window.open(result.paymentUrl, "_blank");
      return true;
    }
    
    return false;
  }

  /**
   * Poll payment status until completed or timeout
   */
  async pollStatus(
    transactionId: string,
    options?: {
      maxAttempts?: number;
      intervalMs?: number;
      onStatusChange?: (status: CCPStatusResult) => void;
    }
  ): Promise<CCPStatusResult> {
    const maxAttempts = options?.maxAttempts || 30;
    const intervalMs = options?.intervalMs || 5000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.checkStatus(transactionId);
      
      if (options?.onStatusChange) {
        options.onStatusChange(status);
      }
      
      if (status.status === "success" || status.status === "completed") {
        return status;
      }
      
      if (status.status === "failed" || status.status === "cancelled") {
        return status;
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    return { success: false, error: "Payment status check timeout" };
  }
}

export const chapChapPayService = new ChapChapPayService();
