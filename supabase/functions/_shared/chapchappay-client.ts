/**
 * 🔐 CINETPAY/MOBILE MONEY API CLIENT - 224SOLUTIONS
 * Client partagé pour les paiements Mobile Money via CinetPay
 * 
 * Documentation: https://cinetpay.com/developer
 * Supports: Orange Money, MTN MoMo, Wave, Moov Money, etc.
 */

// Utiliser l'API Web Crypto native de Deno
const encoder = new TextEncoder();

async function hmacSha256(key: string, message: string): Promise<string> {
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============= TYPES =============

export interface ChapChapPayConfig {
  apiKey: string;
  secretKey: string;
  merchantId: string;
  useSandbox?: boolean;
}

export interface CCPPaymentRequest {
  amount: number;
  currency?: string; // GNF, XOF, etc.
  paymentMethod: 'orange_money' | 'mtn_momo' | 'paycard' | 'card';
  customerPhone: string;
  customerName?: string;
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
  paymentUrl?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requiresOtp?: boolean;
  error?: string;
  data?: unknown;
}

export interface CCPStatusResponse {
  success: boolean;
  transactionId?: string;
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

/**
 * Génère la signature HMAC-SHA256 pour l'authentification
 */
export async function generateSignature(data: string, secretKey: string): Promise<string> {
  return await hmacSha256(secretKey, data);
}

/**
 * Génère les headers d'authentification ChapChapPay
 */
export async function getAuthHeaders(config: ChapChapPayConfig, body?: unknown): Promise<Record<string, string>> {
  const timestamp = Date.now().toString();
  const bodyString = body ? JSON.stringify(body) : "";
  const signatureData = `${timestamp}${config.merchantId}${bodyString}`;
  const signature = await generateSignature(signatureData, config.secretKey);

  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-API-Key": config.apiKey,
    "X-Merchant-ID": config.merchantId,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
    "User-Agent": "224Solutions/2.0",
  };
}

// ============= CINETPAY CLIENT CLASS =============

export class ChapChapPayClient {
  private config: ChapChapPayConfig;
  private baseUrl: string;

  constructor(config: ChapChapPayConfig) {
    this.config = config;
    // CinetPay API URLs
    this.baseUrl = config.useSandbox 
      ? "https://api-checkout.cinetpay.com/v2" 
      : "https://api-checkout.cinetpay.com/v2";
    
    logStep("CinetPay Client initialized", { 
      siteId: config.merchantId,
      environment: config.useSandbox ? "sandbox" : "production",
      baseUrl: this.baseUrl
    });
  }

  /**
   * E-Commerce: Créer une session de paiement avec redirection (CinetPay)
   */
  async createEcommercePayment(request: CCPPaymentRequest): Promise<CCPPaymentResponse> {
    logStep("Creating E-Commerce payment (CinetPay)", { 
      amount: request.amount, 
      method: request.paymentMethod 
    });

    try {
      const transactionId = request.orderId || `224SOL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const phoneNumber = this.formatPhoneNumber(request.customerPhone);
      
      // Format CinetPay payload - tous les champs requis
      const payload = {
        apikey: this.config.apiKey,
        site_id: this.config.merchantId,
        transaction_id: transactionId,
        amount: Math.round(request.amount),
        currency: request.currency || "GNF",
        description: request.description || "Paiement 224Solutions",
        return_url: request.returnUrl || "https://224solutions.com/payment/success",
        notify_url: request.webhookUrl || "https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/chapchappay-webhook",
        channels: this.mapPaymentMethod(request.paymentMethod),
        // Informations client - tous requis par CinetPay
        customer_name: request.customerName?.split(' ')[0] || "Client",
        customer_surname: request.customerName?.split(' ').slice(1).join(' ') || "224Solutions",
        customer_phone_number: phoneNumber,
        customer_email: `client.${phoneNumber}@224solutions.com`, // Email généré si non fourni
        customer_address: "Conakry",
        customer_city: "Conakry",
        customer_country: "GN",
        customer_state: "CK",
        customer_zip_code: "00224",
        metadata: JSON.stringify(request.metadata || {}),
      };

      logStep("CinetPay payload", { transactionId, amount: payload.amount, phone: phoneNumber });
      
      const response = await fetch(`${this.baseUrl}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      logStep("CinetPay response", { status: response.status, body: responseText.substring(0, 500) });

      const data = JSON.parse(responseText);
      
      // CinetPay retourne code "201" pour succès
      if (data.code === "201" || data.code === 201 || data.code === "00") {
        return {
          success: true,
          transactionId: data.data?.payment_token || transactionId,
          paymentUrl: data.data?.payment_url,
          status: "pending",
          data
        };
      }

      return {
        success: false,
        error: data.message || `Erreur CinetPay: ${data.code}`
      };
    } catch (error) {
      logStep("CinetPay E-Commerce error", { error: String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Mapper le type de paiement vers les canaux CinetPay
   * Valeurs valides: ALL, MOBILE_MONEY, WALLET, CREDIT_CARD, INTERNATIONAL_CARD
   */
  private mapPaymentMethod(method: string): string {
    const mapping: Record<string, string> = {
      'orange_money': 'MOBILE_MONEY',
      'mtn_momo': 'MOBILE_MONEY',
      'mtn_money': 'MOBILE_MONEY',
      'wave': 'WALLET',
      'moov_money': 'MOBILE_MONEY',
      'paycard': 'CREDIT_CARD',
      'card': 'ALL',
    };
    return mapping[method] || 'ALL';
  }

  /**
   * PULL: Débiter le compte Mobile Money du client (utilise E-Commerce)
   */
  async initiatePullPayment(request: CCPPaymentRequest): Promise<CCPPaymentResponse> {
    logStep("Initiating PULL payment via CinetPay", { 
      amount: request.amount, 
      method: request.paymentMethod 
    });

    // Pour CinetPay, PULL = E-Commerce avec webhook
    return this.createEcommercePayment({
      ...request,
      webhookUrl: request.webhookUrl || "https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/chapchappay-webhook",
    });
  }

  /**
   * PUSH: Envoyer de l'argent vers un compte Mobile Money
   * Note: CinetPay Transfer API - nécessite configuration spéciale
   */
  async initiatePushPayment(request: CCPPushRequest): Promise<CCPPaymentResponse> {
    logStep("Initiating PUSH payment (CinetPay Transfer)", { 
      amount: request.amount, 
      method: request.paymentMethod 
    });

    try {
      const transactionId = request.orderId || `224SOL-PUSH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // CinetPay Transfer API payload
      const payload = {
        apikey: this.config.apiKey,
        site_id: this.config.merchantId,
        transaction_id: transactionId,
        amount: Math.round(request.amount),
        currency: request.currency || "GNF",
        description: request.description || "Transfert 224Solutions",
        recipient_phone_number: this.formatPhoneNumber(request.recipientPhone),
        recipient_name: request.recipientName || "Destinataire",
        transfer_type: this.mapPaymentMethod(request.paymentMethod),
      };

      logStep("CinetPay Transfer payload", { transactionId, amount: payload.amount });
      
      // CinetPay Transfer endpoint
      const response = await fetch("https://api-transfer.cinetpay.com/v1/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      logStep("CinetPay Transfer response", { status: response.status });

      if (!response.ok) {
        return {
          success: false,
          error: `Erreur ${response.status}: ${responseText}`
        };
      }

      const data = JSON.parse(responseText);
      
      if (data.code === "00" || data.status === "SUCCESS") {
        return {
          success: true,
          transactionId: data.transaction_id || transactionId,
          status: data.status || "pending",
          data
        };
      }

      return {
        success: false,
        error: data.message || "Erreur lors du transfert"
      };
    } catch (error) {
      logStep("CinetPay Transfer error", { error: String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Vérifier le statut d'une transaction (CinetPay)
   */
  async checkStatus(transactionId?: string, orderId?: string): Promise<CCPStatusResponse> {
    logStep("Checking payment status (CinetPay)", { transactionId, orderId });

    try {
      const payload = {
        apikey: this.config.apiKey,
        site_id: this.config.merchantId,
        transaction_id: transactionId || orderId,
      };
      
      const response = await fetch(`${this.baseUrl}/payment/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      logStep("CinetPay Status response", { status: response.status, body: responseText.substring(0, 500) });

      const data = JSON.parse(responseText);
      
      if (data.code === "00") {
        // Mapper les statuts CinetPay vers nos statuts
        const statusMapping: Record<string, string> = {
          'ACCEPTED': 'completed',
          'REFUSED': 'failed',
          'PENDING': 'pending',
          'CANCELLED': 'cancelled',
        };
        
        return {
          success: true,
          transactionId: data.data?.payment_token || transactionId,
          status: statusMapping[data.data?.status] || data.data?.status?.toLowerCase() || 'pending',
          amount: data.data?.amount,
          paidAmount: data.data?.payment_amount,
          fees: data.data?.payment_method_fee,
          paymentMethod: data.data?.payment_method,
          customerPhone: data.data?.phone_number,
          createdAt: data.data?.payment_date,
          completedAt: data.data?.payment_date,
        };
      }

      return {
        success: false,
        error: data.message || `Code: ${data.code}`
      };
    } catch (error) {
      logStep("CinetPay Status check error", { error: String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Formater le numéro de téléphone au format international
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
 * Créer un client CinetPay/ChapChapPay à partir des variables d'environnement
 */
export function createChapChapPayClient(useSandbox: boolean = false): ChapChapPayClient {
  // Utiliser les credentials CinetPay
  const apiKey = Deno.env.get("CINETPAY_API_KEY") || Deno.env.get("CCP_API_KEY");
  const siteId = Deno.env.get("CINETPAY_SITE_ID") || Deno.env.get("CCP_MERCHANT_ID");
  const secretKey = Deno.env.get("CCP_SECRET_KEY") || Deno.env.get("CCP_ENCRYPTION_KEY") || apiKey;

  if (!apiKey || !siteId) {
    throw new Error(
      "CinetPay: CINETPAY_API_KEY et CINETPAY_SITE_ID requis"
    );
  }

  return new ChapChapPayClient({
    apiKey,
    secretKey: secretKey || apiKey,
    merchantId: siteId,
    useSandbox
  });
}
