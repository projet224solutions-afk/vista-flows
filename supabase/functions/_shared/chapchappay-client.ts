/**
 * 🔐 CHAPCHAPPAY API CLIENT - 224SOLUTIONS
 * Client partagé pour les paiements Mobile Money via ChapChapPay
 * 
 * Documentation: https://chapchappay.com/guide/
 * Supports: Orange Money, MTN MoMo, Wave, etc.
 */

// ============= TYPES =============

export interface ChapChapPayConfig {
  apiKey: string;
  secretKey?: string;
  useSandbox?: boolean;
}

export interface CCPPaymentRequest {
  amount: number;
  currency?: string; // GNF, XOF, etc.
  paymentMethod?: 'orange_money' | 'mtn_momo' | 'paycard' | 'wave' | 'card';
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  description?: string;
  orderId?: string;
  returnUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CCPPushRequest {
  amount: number;
  currency?: string;
  paymentMethod: 'orange_money' | 'mtn_momo';
  recipientPhone: string;
  recipientName?: string;
  description?: string;
  orderId?: string;
}

export interface CCPPaymentResponse {
  success: boolean;
  transactionId?: string;
  operationId?: string;
  paymentUrl?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requiresOtp?: boolean;
  error?: string;
  data?: unknown;
}

export interface CCPStatusResponse {
  success: boolean;
  transactionId?: string;
  operationId?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount?: number;
  paidAmount?: number;
  fees?: number;
  paymentMethod?: string;
  customerPhone?: string;
  createdAt?: string;
  completedAt?: string;
  error?: string;
}

// ============= UTILITY FUNCTIONS =============

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [CHAPCHAPPAY] ${step}${detailsStr}`);
};

// ============= CHAPCHAPPAY CLIENT CLASS =============

export class ChapChapPayClient {
  private config: ChapChapPayConfig;
  private baseUrl: string;

  constructor(config: ChapChapPayConfig) {
    this.config = config;
    // ChapChapPay API URL
    this.baseUrl = "https://chapchappay.com";
    
    logStep("ChapChapPay Client initialized", { 
      environment: config.useSandbox ? "sandbox" : "production",
      baseUrl: this.baseUrl
    });
  }

  /**
   * E-Commerce: Créer une session de paiement avec redirection
   */
  async createEcommercePayment(request: CCPPaymentRequest): Promise<CCPPaymentResponse> {
    logStep("Creating E-Commerce payment", { 
      amount: request.amount, 
      method: request.paymentMethod 
    });

    try {
      const orderId = request.orderId || `224SOL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Format ChapChapPay payload
      const payload: Record<string, unknown> = {
        amount: Math.round(request.amount),
        order_id: orderId,
      };

      // Ajouter les champs optionnels
      if (request.description) payload.description = request.description;
      if (request.returnUrl) payload.return_url = request.returnUrl;
      if (request.webhookUrl) payload.notify_url = request.webhookUrl;
      if (request.customerName) payload.customer_name = request.customerName;
      if (request.customerPhone) payload.customer_phone = this.formatPhoneNumber(request.customerPhone);
      if (request.customerEmail) payload.customer_email = request.customerEmail;
      if (request.metadata) payload.metadata = JSON.stringify(request.metadata);

      logStep("ChapChapPay payload", { orderId, amount: payload.amount });
      
      const response = await fetch(`${this.baseUrl}/api/ecommerce/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "CCP-Api-Key": this.config.apiKey,
          "User-Agent": "224Solutions/2.0",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      logStep("ChapChapPay response", { status: response.status, body: responseText.substring(0, 500) });

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(responseText);
      } catch {
        return {
          success: false,
          error: `Réponse invalide: ${responseText.substring(0, 100)}`
        };
      }
      
      // ChapChapPay retourne success ou payment_url
      if (data.payment_url || data.operation_id || response.ok) {
        return {
          success: true,
          transactionId: String(data.operation_id || orderId),
          operationId: String(data.operation_id || ""),
          paymentUrl: String(data.payment_url || ""),
          status: "pending",
          data
        };
      }

      return {
        success: false,
        error: String(data.error || data.message || `Erreur ChapChapPay: ${response.status}`)
      };
    } catch (error) {
      logStep("ChapChapPay E-Commerce error", { error: String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * PULL: Débiter le compte Mobile Money du client
   * Utilise la méthode E-Commerce avec redirection
   */
  async initiatePullPayment(request: CCPPaymentRequest): Promise<CCPPaymentResponse> {
    logStep("Initiating PULL payment", { 
      amount: request.amount, 
      method: request.paymentMethod 
    });

    // Pour ChapChapPay, PULL = E-Commerce avec webhook
    const webhookUrl = request.webhookUrl || 
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/chapchappay-webhook`;

    return this.createEcommercePayment({
      ...request,
      webhookUrl,
    });
  }

  /**
   * PUSH: Envoyer de l'argent vers un compte Mobile Money
   * Note: Nécessite des permissions spéciales sur ChapChapPay
   */
  async initiatePushPayment(request: CCPPushRequest): Promise<CCPPaymentResponse> {
    logStep("Initiating PUSH payment", { 
      amount: request.amount, 
      method: request.paymentMethod 
    });

    try {
      const orderId = request.orderId || `224SOL-PUSH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // ChapChapPay Transfer payload
      const payload = {
        amount: Math.round(request.amount),
        order_id: orderId,
        recipient_phone: this.formatPhoneNumber(request.recipientPhone),
        recipient_name: request.recipientName || "Destinataire",
        payment_method: request.paymentMethod,
        description: request.description || "Transfert 224Solutions",
      };

      logStep("ChapChapPay Transfer payload", { orderId, amount: payload.amount });
      
      const response = await fetch(`${this.baseUrl}/api/transfer/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "CCP-Api-Key": this.config.apiKey,
          "User-Agent": "224Solutions/2.0",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      logStep("ChapChapPay Transfer response", { status: response.status });

      if (!response.ok) {
        return {
          success: false,
          error: `Erreur ${response.status}: ${responseText.substring(0, 200)}`
        };
      }

      const data = JSON.parse(responseText);
      
      if (data.success || data.operation_id) {
        return {
          success: true,
          transactionId: data.operation_id || orderId,
          operationId: data.operation_id,
          status: data.status || "pending",
          data
        };
      }

      return {
        success: false,
        error: data.message || data.error || "Erreur lors du transfert"
      };
    } catch (error) {
      logStep("ChapChapPay Transfer error", { error: String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Vérifier le statut d'une transaction
   */
  async checkStatus(transactionId?: string, orderId?: string): Promise<CCPStatusResponse> {
    logStep("Checking payment status", { transactionId, orderId });

    try {
      const identifier = transactionId || orderId;
      if (!identifier) {
        return { success: false, error: "Transaction ID ou Order ID requis" };
      }

      const response = await fetch(`${this.baseUrl}/api/payment/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "CCP-Api-Key": this.config.apiKey,
          "User-Agent": "224Solutions/2.0",
        },
        body: JSON.stringify({
          operation_id: transactionId,
          order_id: orderId,
        }),
      });

      const responseText = await response.text();
      logStep("ChapChapPay Status response", { status: response.status, body: responseText.substring(0, 500) });

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(responseText);
      } catch {
        return { success: false, error: "Réponse invalide du serveur" };
      }
      
      if (response.ok) {
        // Mapper les statuts ChapChapPay vers nos statuts
        const statusMapping: Record<string, string> = {
          'SUCCESS': 'completed',
          'COMPLETED': 'completed',
          'PAID': 'completed',
          'FAILED': 'failed',
          'CANCELLED': 'cancelled',
          'PENDING': 'pending',
          'PROCESSING': 'processing',
        };
        
        const rawStatus = String(data.status || 'pending').toUpperCase();
        
        return {
          success: true,
          transactionId: String(data.operation_id || transactionId),
          operationId: String(data.operation_id || ""),
          status: (statusMapping[rawStatus] || 'pending') as CCPStatusResponse['status'],
          amount: Number(data.amount) || undefined,
          paidAmount: Number(data.paid_amount || data.amount) || undefined,
          paymentMethod: String(data.payment_method || ""),
          customerPhone: String(data.customer_phone || ""),
          createdAt: String(data.created_at || ""),
          completedAt: String(data.completed_at || ""),
        };
      }

      return {
        success: false,
        error: String(data.message || data.error || `Code: ${response.status}`)
      };
    } catch (error) {
      logStep("ChapChapPay Status check error", { error: String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Formater le numéro de téléphone au format international guinéen
   */
  private formatPhoneNumber(phone: string): string {
    // Nettoyer le numéro
    const cleaned = phone.replace(/\D/g, "");
    
    // Si déjà au format international (224...)
    if (cleaned.startsWith("224") && cleaned.length === 12) {
      return cleaned;
    }
    
    // Si commence par 00224
    if (cleaned.startsWith("00224")) {
      return cleaned.substring(2);
    }
    
    // Si 9 chiffres (numéro local guinéen)
    if (cleaned.length === 9) {
      return `224${cleaned}`;
    }
    
    return cleaned;
  }
}

/**
 * Créer un client ChapChapPay à partir des variables d'environnement
 */
export function createChapChapPayClient(useSandbox: boolean = false): ChapChapPayClient {
  const apiKey = Deno.env.get("CCP_API_KEY");
  const secretKey = Deno.env.get("CCP_SECRET_KEY");

  if (!apiKey) {
    throw new Error("ChapChapPay: CCP_API_KEY requis");
  }

  return new ChapChapPayClient({
    apiKey,
    secretKey,
    useSandbox
  });
}
