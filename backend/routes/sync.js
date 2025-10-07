/**
 * ROUTES DE SYNCHRONISATION OFFLINE
 * Endpoints pour la synchronisation des données hors-ligne
 * 224SOLUTIONS - Backend API
 */

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Configuration multer pour l'upload de fichiers
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    }
});

/**
 * POST /api/sync/batch
 * Synchronise un batch d'événements hors-ligne
 */
router.post('/batch', async (req, res) => {
    try {
        const { events } = req.body;
        const vendorId = req.user?.id; // Depuis le middleware d'authentification

        if (!events || !Array.isArray(events)) {
            return res.status(400).json({
                success: false,
                error: 'Format de données invalide'
            });
        }

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                error: 'Authentification requise'
            });
        }

        const results = [];
        const processedEventIds = new Set();

        for (const event of events) {
            try {
                // Vérifier si l'événement a déjà été traité (idempotence)
                if (processedEventIds.has(event.client_event_id)) {
                    results.push({
                        client_event_id: event.client_event_id,
                        status: 'duplicate',
                        message: 'Événement déjà traité'
                    });
                    continue;
                }

                // Traiter selon le type d'événement
                let result;
                switch (event.type) {
                    case 'sale':
                        result = await processSaleEvent(event, vendorId);
                        break;
                    case 'receipt':
                        result = await processReceiptEvent(event, vendorId);
                        break;
                    case 'invoice':
                        result = await processInvoiceEvent(event, vendorId);
                        break;
                    case 'payment':
                        result = await processPaymentEvent(event, vendorId);
                        break;
                    case 'upload':
                        result = await processUploadEvent(event, vendorId);
                        break;
                    default:
                        throw new Error(`Type d'événement non supporté: ${event.type}`);
                }

                results.push({
                    client_event_id: event.client_event_id,
                    status: 'success',
                    data: result
                });

                processedEventIds.add(event.client_event_id);

            } catch (error) {
                console.error(`Erreur traitement événement ${event.client_event_id}:`, error);
                results.push({
                    client_event_id: event.client_event_id,
                    status: 'error',
                    error: error.message
                });
            }
        }

        // Calculer les statistiques
        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;

        res.json({
            success: true,
            message: `Synchronisation terminée: ${successCount} succès, ${errorCount} erreurs`,
            results,
            stats: {
                total: events.length,
                success: successCount,
                errors: errorCount
            }
        });

    } catch (error) {
        console.error('Erreur synchronisation batch:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * POST /api/sync/upload
 * Upload un fichier associé à un événement
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { event_id, file_id } = req.body;
        const vendorId = req.user?.id;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Aucun fichier fourni'
            });
        }

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                error: 'Authentification requise'
            });
        }

        // Générer un nom de fichier unique
        const fileExtension = req.file.originalname.split('.').pop();
        const fileName = `${vendorId}_${file_id}_${Date.now()}.${fileExtension}`;

        // Ici, vous pouvez uploader vers Supabase Storage, AWS S3, etc.
        // Pour l'exemple, on simule un upload réussi
        const fileUrl = `/uploads/${fileName}`;

        // Enregistrer les métadonnées du fichier en base
        const fileRecord = {
            id: uuidv4(),
            vendor_id: vendorId,
            event_id: event_id,
            original_name: req.file.originalname,
            file_name: fileName,
            file_url: fileUrl,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            uploaded_at: new Date().toISOString()
        };

        // TODO: Sauvegarder en base de données
        // await supabase.from('vendor_files').insert(fileRecord);

        res.json({
            success: true,
            message: 'Fichier uploadé avec succès',
            file: fileRecord
        });

    } catch (error) {
        console.error('Erreur upload fichier:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur upload fichier'
        });
    }
});

/**
 * Traite un événement de vente
 */
async function processSaleEvent(event, vendorId) {
    const { data } = event;

    // Calculer la commission (1% de la vente)
    const commission = data.amount * 0.01;

    const saleRecord = {
        id: uuidv4(),
        vendor_id: vendorId,
        client_event_id: event.client_event_id,
        product_id: data.product_id,
        product_name: data.product_name,
        quantity: data.quantity,
        unit_price: data.unit_price,
        amount: data.amount,
        commission: commission,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        payment_method: data.payment_method,
        sale_date: data.sale_date || new Date().toISOString(),
        created_at: new Date().toISOString()
    };

    // TODO: Sauvegarder en base de données
    // await supabase.from('sales').insert(saleRecord);

    return {
        sale_id: saleRecord.id,
        commission: commission,
        message: 'Vente enregistrée avec succès'
    };
}

/**
 * Traite un événement de reçu
 */
async function processReceiptEvent(event, vendorId) {
    const { data } = event;

    const receiptRecord = {
        id: uuidv4(),
        vendor_id: vendorId,
        client_event_id: event.client_event_id,
        sale_id: data.sale_id,
        receipt_number: data.receipt_number,
        customer_name: data.customer_name,
        items: data.items,
        total_amount: data.total_amount,
        tax_amount: data.tax_amount,
        receipt_date: data.receipt_date || new Date().toISOString(),
        created_at: new Date().toISOString()
    };

    // TODO: Sauvegarder en base de données
    // await supabase.from('receipts').insert(receiptRecord);

    return {
        receipt_id: receiptRecord.id,
        message: 'Reçu généré avec succès'
    };
}

/**
 * Traite un événement de facture
 */
async function processInvoiceEvent(event, vendorId) {
    const { data } = event;

    const invoiceRecord = {
        id: uuidv4(),
        vendor_id: vendorId,
        client_event_id: event.client_event_id,
        invoice_number: data.invoice_number,
        customer_id: data.customer_id,
        customer_name: data.customer_name,
        items: data.items,
        subtotal: data.subtotal,
        tax_amount: data.tax_amount,
        total_amount: data.total_amount,
        due_date: data.due_date,
        status: 'pending',
        invoice_date: data.invoice_date || new Date().toISOString(),
        created_at: new Date().toISOString()
    };

    // TODO: Sauvegarder en base de données
    // await supabase.from('invoices').insert(invoiceRecord);

    return {
        invoice_id: invoiceRecord.id,
        message: 'Facture créée avec succès'
    };
}

/**
 * Traite un événement de paiement
 */
async function processPaymentEvent(event, vendorId) {
    const { data } = event;

    const paymentRecord = {
        id: uuidv4(),
        vendor_id: vendorId,
        client_event_id: event.client_event_id,
        sale_id: data.sale_id,
        amount: data.amount,
        payment_method: data.payment_method,
        transaction_id: data.transaction_id,
        status: 'completed',
        payment_date: data.payment_date || new Date().toISOString(),
        created_at: new Date().toISOString()
    };

    // TODO: Sauvegarder en base de données
    // await supabase.from('payments').insert(paymentRecord);

    // Mettre à jour le solde du wallet
    // await updateVendorWallet(vendorId, data.amount);

    return {
        payment_id: paymentRecord.id,
        message: 'Paiement enregistré avec succès'
    };
}

/**
 * Traite un événement d'upload
 */
async function processUploadEvent(event, vendorId) {
    const { data } = event;

    const uploadRecord = {
        id: uuidv4(),
        vendor_id: vendorId,
        client_event_id: event.client_event_id,
        file_type: data.file_type,
        file_name: data.file_name,
        file_size: data.file_size,
        related_id: data.related_id, // ID de la vente, reçu, etc.
        upload_date: new Date().toISOString(),
        created_at: new Date().toISOString()
    };

    // TODO: Sauvegarder en base de données
    // await supabase.from('uploads').insert(uploadRecord);

    return {
        upload_id: uploadRecord.id,
        message: 'Upload enregistré avec succès'
    };
}

/**
 * Met à jour le solde du wallet vendeur
 */
async function updateVendorWallet(vendorId, amount) {
    try {
        // TODO: Implémenter la mise à jour du wallet
        // const { data: wallet } = await supabase
        //   .from('vendor_wallets')
        //   .select('*')
        //   .eq('vendor_id', vendorId)
        //   .single();

        // if (wallet) {
        //   await supabase
        //     .from('vendor_wallets')
        //     .update({ 
        //       balance: wallet.balance + amount,
        //       updated_at: new Date().toISOString()
        //     })
        //     .eq('vendor_id', vendorId);
        // }

        console.log(`Wallet mis à jour pour vendeur ${vendorId}: +${amount}`);
    } catch (error) {
        console.error('Erreur mise à jour wallet:', error);
    }
}

module.exports = router;
