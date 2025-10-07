/**
 * Service de génération de liens de paiement dynamiques
 * Permet aux livreurs/taxis de créer des liens de paiement à la volée
 */

import { db } from "../db.js";
import { dynamicPaymentLinks, walletTransactions, wallets } from "../../shared/schema.js";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export interface PaymentLink {
  id: string;
  linkId: string;
  createdBy: string;
  createdByType: 'delivery' | 'taxi_moto';
  amount: number;
  currency: string;
  description: string;
  recipientName?: string;
  status: 'active' | 'expired' | 'used' | 'cancelled';
  paymentUrl: string;
  qrData: string;
  expiresAt: string;
  paidAt?: string;
  paidBy?: string;
  paymentMethod?: string;
  transactionId?: string;
  createdAt: string;
}

export interface CreatePaymentLinkData {
  createdBy: string;
  createdByType: 'delivery' | 'taxi_moto';
  amount: number;
  currency?: string;
  description: string;
  recipientName?: string;
  expiryMinutes?: number;
}

export class DynamicPaymentService {
  /**
   * Crée un lien de paiement dynamique
   */
  static async createPaymentLink(data: CreatePaymentLinkData): Promise<PaymentLink> {
    const expiryMinutes = data.expiryMinutes || 60;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    
    const [result] = await db.insert(dynamicPaymentLinks).values({
      createdBy: data.createdBy,
      createdByType: data.createdByType,
      recipientName: data.recipientName,
      amount: data.amount.toString(),
      currency: data.currency || 'GNF',
      description: data.description,
      expiresAt,
      status: 'active'
    }).returning();

    const paymentUrl = `${baseUrl}/pay/${result.linkId}`;
    
    const qrData = JSON.stringify({
      type: 'PAYMENT_LINK',
      linkId: result.linkId,
      amount: data.amount,
      currency: result.currency,
      description: data.description,
      createdBy: data.createdBy,
      paymentUrl,
      expiresAt: expiresAt.toISOString()
    });

    await db.update(dynamicPaymentLinks)
      .set({ metadata: { paymentUrl, qrData } })
      .where(eq(dynamicPaymentLinks.id, result.id));

    return {
      id: result.id,
      linkId: result.linkId,
      createdBy: result.createdBy,
      createdByType: result.createdByType as 'delivery' | 'taxi_moto',
      amount: parseFloat(result.amount),
      currency: result.currency,
      description: result.description,
      recipientName: result.recipientName || undefined,
      status: result.status as 'active' | 'expired' | 'used' | 'cancelled',
      paymentUrl,
      qrData,
      expiresAt: result.expiresAt.toISOString(),
      createdAt: result.createdAt!.toISOString()
    };
  }

  /**
   * Vérifie et récupère un lien de paiement
   */
  static async getPaymentLink(linkId: string): Promise<PaymentLink | null> {
    const [link] = await db.select()
      .from(dynamicPaymentLinks)
      .where(eq(dynamicPaymentLinks.linkId, linkId));

    if (!link) return null;

    const metadata = link.metadata as any || {};
    const paymentUrl = metadata.paymentUrl || `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}/pay/${link.linkId}`;
    const qrData = metadata.qrData || JSON.stringify({
      type: 'PAYMENT_LINK',
      linkId: link.linkId,
      amount: parseFloat(link.amount),
      currency: link.currency,
      description: link.description,
      paymentUrl
    });

    if (this.isExpired(link) && link.status === 'active') {
      await db.update(dynamicPaymentLinks)
        .set({ status: 'expired' })
        .where(eq(dynamicPaymentLinks.id, link.id));
      link.status = 'expired';
    }

    return {
      id: link.id,
      linkId: link.linkId,
      createdBy: link.createdBy,
      createdByType: link.createdByType as 'delivery' | 'taxi_moto',
      amount: parseFloat(link.amount),
      currency: link.currency,
      description: link.description || '',
      recipientName: link.recipientName || undefined,
      status: link.status as 'active' | 'expired' | 'used' | 'cancelled',
      paymentUrl,
      qrData,
      expiresAt: link.expiresAt.toISOString(),
      paidAt: link.paidAt?.toISOString(),
      paidBy: link.paidBy || undefined,
      paymentMethod: link.paymentMethod || undefined,
      transactionId: link.transactionId || undefined,
      createdAt: link.createdAt!.toISOString()
    };
  }

  /**
   * Vérifie si un lien est expiré
   */
  private static isExpired(link: any): boolean {
    return new Date(link.expiresAt) < new Date();
  }

  /**
   * Traite le paiement d'un lien
   */
  static async processPayment(
    linkId: string,
    paymentData: {
      paidBy: string;
      paymentMethod: 'mobile_money' | 'card' | 'cash' | 'bank_transfer';
    }
  ): Promise<{
    success: boolean;
    message: string;
    transactionId?: string;
  }> {
    const link = await this.getPaymentLink(linkId);
    
    if (!link) {
      return { success: false, message: 'Payment link not found' };
    }

    if (link.status !== 'active') {
      return { success: false, message: `Payment link is ${link.status}` };
    }

    if (this.isExpired({ expiresAt: link.expiresAt })) {
      await db.update(dynamicPaymentLinks)
        .set({ status: 'expired' })
        .where(eq(dynamicPaymentLinks.linkId, linkId));
      return { success: false, message: 'Payment link has expired' };
    }

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const [paidByWallet] = await db.select()
        .from(wallets)
        .where(eq(wallets.userId, paymentData.paidBy));

      if (!paidByWallet) {
        return { success: false, message: 'Payer wallet not found' };
      }

      const amount = parseFloat(link.amount);
      const currentBalance = parseFloat(paidByWallet.balance);

      if (currentBalance < amount) {
        return { success: false, message: 'Insufficient balance' };
      }

      const [creatorWallet] = await db.select()
        .from(wallets)
        .where(eq(wallets.userId, link.createdBy));

      if (!creatorWallet) {
        return { success: false, message: 'Creator wallet not found' };
      }

      await db.update(wallets)
        .set({ balance: (currentBalance - amount).toString() })
        .where(eq(wallets.userId, paymentData.paidBy));

      await db.update(wallets)
        .set({ 
          balance: (parseFloat(creatorWallet.balance) + amount).toString() 
        })
        .where(eq(wallets.userId, link.createdBy));

      await db.insert(walletTransactions).values({
        walletId: paidByWallet.id,
        transactionId: `${transactionId}-DEBIT`,
        type: 'payment_link_debit',
        amount: amount.toString(),
        currency: link.currency,
        status: 'paid',
        description: `Payment for ${link.description}`,
        metadata: { linkId: link.linkId, createdBy: link.createdBy }
      });

      await db.insert(walletTransactions).values({
        walletId: creatorWallet.id,
        transactionId: `${transactionId}-CREDIT`,
        type: 'payment_link_credit',
        amount: amount.toString(),
        currency: link.currency,
        status: 'paid',
        description: `Received payment: ${link.description}`,
        metadata: { linkId: link.linkId, paidBy: paymentData.paidBy }
      });

      await db.update(dynamicPaymentLinks)
        .set({
          status: 'used',
          paidAt: new Date(),
          paidBy: paymentData.paidBy,
          paymentMethod: paymentData.paymentMethod,
          transactionId
        })
        .where(eq(dynamicPaymentLinks.linkId, linkId));

      await this.notifyCreator(link);

      return {
        success: true,
        message: 'Payment processed successfully',
        transactionId
      };
    } catch (error: any) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        message: error.message || 'Payment processing failed'
      };
    }
  }

  /**
   * Annule un lien de paiement
   */
  static async cancelPaymentLink(linkId: string, userId: string): Promise<boolean> {
    const [link] = await db.select()
      .from(dynamicPaymentLinks)
      .where(eq(dynamicPaymentLinks.linkId, linkId));

    if (!link) return false;
    if (link.createdBy !== userId) return false;
    if (link.status !== 'active') return false;

    await db.update(dynamicPaymentLinks)
      .set({ status: 'cancelled' })
      .where(eq(dynamicPaymentLinks.linkId, linkId));

    return true;
  }

  /**
   * Récupère les liens de paiement créés par un utilisateur
   */
  static async getUserPaymentLinks(userId: string, status?: string): Promise<PaymentLink[]> {
    const conditions = [eq(dynamicPaymentLinks.createdBy, userId)];
    
    if (status) {
      conditions.push(eq(dynamicPaymentLinks.status, status as any));
    }

    const links = await db.select()
      .from(dynamicPaymentLinks)
      .where(and(...conditions))
      .orderBy(desc(dynamicPaymentLinks.createdAt));

    return links.map(link => {
      const metadata = link.metadata as any || {};
      return {
        id: link.id,
        linkId: link.linkId,
        createdBy: link.createdBy,
        createdByType: link.createdByType as 'delivery' | 'taxi_moto',
        amount: parseFloat(link.amount),
        currency: link.currency,
        description: link.description || '',
        recipientName: link.recipientName || undefined,
        status: link.status as 'active' | 'expired' | 'used' | 'cancelled',
        paymentUrl: metadata.paymentUrl || '',
        qrData: metadata.qrData || '',
        expiresAt: link.expiresAt.toISOString(),
        paidAt: link.paidAt?.toISOString(),
        paidBy: link.paidBy || undefined,
        paymentMethod: link.paymentMethod || undefined,
        transactionId: link.transactionId || undefined,
        createdAt: link.createdAt!.toISOString()
      };
    });
  }

  /**
   * Obtient les statistiques de paiements pour un utilisateur
   */
  static async getPaymentStats(userId: string): Promise<{
    totalLinks: number;
    totalPaid: number;
    totalAmount: number;
    pendingAmount: number;
    currency: string;
  }> {
    const links = await db.select()
      .from(dynamicPaymentLinks)
      .where(eq(dynamicPaymentLinks.createdBy, userId));

    const totalLinks = links.length;
    const totalPaid = links.filter(l => l.status === 'used').length;
    const totalAmount = links
      .filter(l => l.status === 'used')
      .reduce((sum, l) => sum + parseFloat(l.amount), 0);
    const pendingAmount = links
      .filter(l => l.status === 'active')
      .reduce((sum, l) => sum + parseFloat(l.amount), 0);

    return {
      totalLinks,
      totalPaid,
      totalAmount,
      pendingAmount,
      currency: 'GNF'
    };
  }

  /**
   * Envoie une notification au créateur quand le paiement est effectué
   */
  private static async notifyCreator(link: PaymentLink): Promise<void> {
    console.log(`📲 Notification sent to ${link.createdBy}: Payment received for ${link.amount} ${link.currency}`);
  }

  /**
   * Nettoie les liens expirés (à exécuter périodiquement)
   */
  static async cleanExpiredLinks(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await db.update(dynamicPaymentLinks)
      .set({ status: 'expired' })
      .where(
        and(
          eq(dynamicPaymentLinks.status, 'active'),
          sql`${dynamicPaymentLinks.expiresAt} < ${thirtyDaysAgo}`
        )
      );

    return 0;
  }
}
