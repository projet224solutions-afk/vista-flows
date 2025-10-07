/**
 * HOOK DE GESTION DES VENTES HORS-LIGNE
 * Gestion optimiste des ventes en mode offline
 * 224SOLUTIONS - Interface Vendeur
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useOfflineSync } from './useOfflineSync';

export const useOfflineSales = () => {
    const { storeOfflineEvent, storeOfflineFile, isOnline } = useOfflineSync();
    const [pendingSales, setPendingSales] = useState([]);

    /**
     * Enregistre une vente (en ligne ou hors-ligne)
     */
    const recordSale = useCallback(async (saleData) => {
        try {
            const saleEvent = {
                type: 'sale',
                vendor_id: saleData.vendor_id,
                data: {
                    product_id: saleData.product_id,
                    product_name: saleData.product_name,
                    quantity: saleData.quantity,
                    unit_price: saleData.unit_price,
                    amount: saleData.amount,
                    customer_name: saleData.customer_name,
                    customer_phone: saleData.customer_phone,
                    payment_method: saleData.payment_method,
                    sale_date: new Date().toISOString()
                }
            };

            // Si en ligne, essayer d'enregistrer directement
            if (isOnline) {
                try {
                    const response = await fetch('/api/sales', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(saleData)
                    });

                    if (response.ok) {
                        toast.success('✅ Vente enregistrée', {
                            description: 'Vente synchronisée avec le serveur'
                        });
                        return { success: true, online: true };
                    }
                } catch (error) {
                    console.warn('Erreur enregistrement en ligne, passage en mode offline:', error);
                }
            }

            // Mode offline ou échec en ligne
            const eventId = await storeOfflineEvent(saleEvent);

            // Ajouter à la liste des ventes en attente
            setPendingSales(prev => [...prev, {
                id: eventId,
                ...saleData,
                status: 'pending',
                created_at: new Date().toISOString()
            }]);

            toast.success('⏳ Vente enregistrée hors-ligne', {
                description: 'Sera synchronisée à la reconnexion'
            });

            return { success: true, online: false, eventId };

        } catch (error) {
            console.error('Erreur enregistrement vente:', error);
            toast.error('❌ Erreur enregistrement vente', {
                description: error.message
            });
            return { success: false, error: error.message };
        }
    }, [isOnline, storeOfflineEvent]);

    /**
     * Génère un reçu hors-ligne
     */
    const generateReceipt = useCallback(async (receiptData) => {
        try {
            const receiptEvent = {
                type: 'receipt',
                vendor_id: receiptData.vendor_id,
                data: {
                    sale_id: receiptData.sale_id,
                    receipt_number: receiptData.receipt_number,
                    customer_name: receiptData.customer_name,
                    items: receiptData.items,
                    total_amount: receiptData.total_amount,
                    tax_amount: receiptData.tax_amount,
                    receipt_date: new Date().toISOString()
                }
            };

            const eventId = await storeOfflineEvent(receiptEvent);

            // Si un fichier de reçu est fourni, le stocker aussi
            if (receiptData.receiptFile) {
                await storeOfflineFile(receiptData.receiptFile, eventId);
            }

            toast.success('📄 Reçu généré hors-ligne', {
                description: 'Sera synchronisé à la reconnexion'
            });

            return { success: true, eventId };

        } catch (error) {
            console.error('Erreur génération reçu:', error);
            toast.error('❌ Erreur génération reçu', {
                description: error.message
            });
            return { success: false, error: error.message };
        }
    }, [storeOfflineEvent, storeOfflineFile]);

    /**
     * Crée une facture hors-ligne
     */
    const createInvoice = useCallback(async (invoiceData) => {
        try {
            const invoiceEvent = {
                type: 'invoice',
                vendor_id: invoiceData.vendor_id,
                data: {
                    invoice_number: invoiceData.invoice_number,
                    customer_id: invoiceData.customer_id,
                    customer_name: invoiceData.customer_name,
                    items: invoiceData.items,
                    subtotal: invoiceData.subtotal,
                    tax_amount: invoiceData.tax_amount,
                    total_amount: invoiceData.total_amount,
                    due_date: invoiceData.due_date,
                    invoice_date: new Date().toISOString()
                }
            };

            const eventId = await storeOfflineEvent(invoiceEvent);

            toast.success('📋 Facture créée hors-ligne', {
                description: 'Sera synchronisée à la reconnexion'
            });

            return { success: true, eventId };

        } catch (error) {
            console.error('Erreur création facture:', error);
            toast.error('❌ Erreur création facture', {
                description: error.message
            });
            return { success: false, error: error.message };
        }
    }, [storeOfflineEvent]);

    /**
     * Enregistre un paiement hors-ligne
     */
    const recordPayment = useCallback(async (paymentData) => {
        try {
            const paymentEvent = {
                type: 'payment',
                vendor_id: paymentData.vendor_id,
                data: {
                    sale_id: paymentData.sale_id,
                    amount: paymentData.amount,
                    payment_method: paymentData.payment_method,
                    transaction_id: paymentData.transaction_id,
                    payment_date: new Date().toISOString()
                }
            };

            const eventId = await storeOfflineEvent(paymentEvent);

            toast.success('💳 Paiement enregistré hors-ligne', {
                description: 'Sera synchronisé à la reconnexion'
            });

            return { success: true, eventId };

        } catch (error) {
            console.error('Erreur enregistrement paiement:', error);
            toast.error('❌ Erreur enregistrement paiement', {
                description: error.message
            });
            return { success: false, error: error.message };
        }
    }, [storeOfflineEvent]);

    /**
     * Upload un fichier hors-ligne
     */
    const uploadFile = useCallback(async (fileData) => {
        try {
            const uploadEvent = {
                type: 'upload',
                vendor_id: fileData.vendor_id,
                data: {
                    file_type: fileData.file_type,
                    file_name: fileData.file_name,
                    file_size: fileData.file_size,
                    related_id: fileData.related_id
                }
            };

            const eventId = await storeOfflineEvent(uploadEvent);
            const fileId = await storeOfflineFile(fileData.file, eventId);

            toast.success('📎 Fichier uploadé hors-ligne', {
                description: 'Sera synchronisé à la reconnexion'
            });

            return { success: true, eventId, fileId };

        } catch (error) {
            console.error('Erreur upload fichier:', error);
            toast.error('❌ Erreur upload fichier', {
                description: error.message
            });
            return { success: false, error: error.message };
        }
    }, [storeOfflineEvent, storeOfflineFile]);

    /**
     * Met à jour le statut d'une vente en attente
     */
    const updatePendingSaleStatus = useCallback((eventId, status) => {
        setPendingSales(prev =>
            prev.map(sale =>
                sale.id === eventId
                    ? { ...sale, status, updated_at: new Date().toISOString() }
                    : sale
            )
        );
    }, []);

    /**
     * Supprime une vente en attente (après synchronisation)
     */
    const removePendingSale = useCallback((eventId) => {
        setPendingSales(prev => prev.filter(sale => sale.id !== eventId));
    }, []);

    /**
     * Récupère les ventes en attente
     */
    const getPendingSales = useCallback(() => {
        return pendingSales;
    }, [pendingSales]);

    /**
     * Calcule le total des ventes en attente
     */
    const getPendingSalesTotal = useCallback(() => {
        return pendingSales.reduce((total, sale) => total + (sale.amount || 0), 0);
    }, [pendingSales]);

    return {
        // Actions principales
        recordSale,
        generateReceipt,
        createInvoice,
        recordPayment,
        uploadFile,

        // Gestion des ventes en attente
        updatePendingSaleStatus,
        removePendingSale,
        getPendingSales,
        getPendingSalesTotal,

        // État
        pendingSales,
        isOnline
    };
};

export default useOfflineSales;
