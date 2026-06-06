/**
 * 📄 DOCUMENTS ROUTES — génération de PDF (factures, devis, contrats, bons d'achat).
 *
 * Migre les Edge Functions generate-{invoice,quote,contract,purchase}-pdf vers le backend
 * Node (« tout en backend »). jsPDF fonctionne en Node : la mise en page est portée à
 * l'identique. SÉCURITÉ ajoutée vs edges : agent-aware (resolveVendorContext) + propriété
 * (le document doit appartenir au vendeur résolu).
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { jsPDF } from 'jspdf';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { resolveVendorContext } from '../services/vendorContext.service.js';

const router = Router();

const formatGNF = (num: number) =>
  (Number(num) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' GNF';

/** Upload dans le bucket `documents` et renvoie l'URL publique. */
async function uploadDocument(filePath: string, bytes: Uint8Array | Buffer, contentType: string): Promise<string> {
  const { error } = await supabaseAdmin.storage.from('documents').upload(filePath, bytes, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from('documents').getPublicUrl(filePath);
  return data.publicUrl;
}

interface VendorInfo { business_name?: string; address?: string; phone?: string; email?: string; }

/** En-tête + titre + dates + client + tableau articles + totaux (commun facture/devis). Renvoie yPos. */
function renderSalesPdf(doc: jsPDF, opts: {
  titleLabel: string; dateLabel2: string; dateValue2: string | null;
  data: any; vendor: VendorInfo | null; ref: string;
}): number {
  const { titleLabel, dateLabel2, dateValue2, data, vendor, ref } = opts;
  const textColor = '#374151';
  const grayColor = '#666666';
  let yPos = 20;

  const businessName = vendor?.business_name || 'Mon Entreprise';
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
  doc.text(businessName, 20, yPos);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(grayColor); yPos += 6;
  if (vendor?.address) { doc.text(vendor.address, 20, yPos); yPos += 4; }
  if (vendor?.phone) { doc.text(`Tél: ${vendor.phone}`, 20, yPos); yPos += 4; }
  if (vendor?.email) { doc.text(vendor.email, 20, yPos); yPos += 4; }
  doc.setFontSize(8); doc.text('Powered by 224Solutions', 150, 20); yPos = Math.max(yPos, 35);

  doc.setDrawColor(37, 99, 235); doc.setLineWidth(1); doc.line(20, yPos, 190, yPos); yPos += 15;

  doc.setFillColor(37, 99, 235); doc.rect(20, yPos - 5, 170, 15, 'F');
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text(`${titleLabel} N° ${ref}`, 25, yPos + 5); yPos += 18;

  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(textColor);
  doc.text(`Date : ${new Date(data.created_at).toLocaleDateString('fr-FR')}`, 20, yPos); yPos += 6;
  if (dateValue2) { doc.text(`${dateLabel2} : ${new Date(dateValue2).toLocaleDateString('fr-FR')}`, 20, yPos); yPos += 15; } else { yPos += 9; }

  doc.setFillColor(249, 250, 251); doc.rect(20, yPos, 170, 35, 'F'); yPos += 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Informations client', 25, yPos); yPos += 7;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(data.client_name || '', 25, yPos); yPos += 5;
  if (data.client_email) { doc.text(data.client_email, 25, yPos); yPos += 5; }
  if (data.client_phone) { doc.text(data.client_phone, 25, yPos); yPos += 5; }
  yPos += 15;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setFillColor(37, 99, 235); doc.rect(20, yPos, 170, 10, 'F'); doc.setTextColor(255, 255, 255);
  doc.text('Produit / Service', 22, yPos + 6.5);
  doc.text('Qté', 125, yPos + 6.5, { align: 'center' });
  doc.text('Prix unitaire', 155, yPos + 6.5, { align: 'right' });
  doc.text('Total', 188, yPos + 6.5, { align: 'right' }); yPos += 10;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(textColor);
  (data.items || []).forEach((item: any, index: number) => {
    if (yPos > 270) { doc.addPage(); yPos = 20; }
    const itemName = item.name || 'Article';
    const quantity = item.quantity || item.qty || 1;
    const unitPrice = item.unit_price || item.price || 0;
    const itemTotal = item.total || (quantity * unitPrice);
    const splitText = doc.splitTextToSize(itemName, 100);
    const itemHeight = Math.max(12, splitText.length * 6 + 4);
    if (index % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(20, yPos, 170, itemHeight, 'F'); }
    doc.text(splitText, 22, yPos + 6.5);
    const centerY = yPos + (itemHeight / 2) + 1;
    doc.text(quantity.toString(), 125, centerY, { align: 'center' });
    doc.text(formatGNF(unitPrice), 155, centerY, { align: 'right' });
    doc.text(formatGNF(itemTotal), 188, centerY, { align: 'right' });
    yPos += itemHeight;
  });
  yPos += 10;

  const totalsX = 135;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Sous-total :', totalsX, yPos); doc.text(formatGNF(data.subtotal), 188, yPos, { align: 'right' }); yPos += 6;
  if (data.discount > 0) { doc.text('Remise :', totalsX, yPos); doc.text(`-${formatGNF(data.discount)}`, 188, yPos, { align: 'right' }); yPos += 6; }
  if (data.tax > 0) { doc.text('TVA :', totalsX, yPos); doc.text(formatGNF(data.tax), 188, yPos, { align: 'right' }); yPos += 6; }
  yPos += 5; doc.setDrawColor(37, 99, 235); doc.setLineWidth(1); doc.line(totalsX, yPos, 190, yPos); yPos += 8;
  doc.setFillColor(37, 99, 235); doc.rect(totalsX - 5, yPos - 5, 63, 12, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL :', totalsX, yPos + 3); doc.setFontSize(14); doc.text(formatGNF(data.total), 186, yPos + 3, { align: 'right' });
  return yPos + 18;
}

async function authVendor(req: AuthenticatedRequest, res: Response, table: string, id: string): Promise<{ vendorId: string; row: any } | null> {
  const ctx = await resolveVendorContext(req.user!.id);
  if (!ctx.vendorId) { res.status(403).json({ success: false, error: 'Boutique non trouvée' }); return null; }
  const { data: row, error } = await supabaseAdmin.from(table).select('*').eq('id', id).maybeSingle();
  if (error || !row) { res.status(404).json({ success: false, error: 'Document introuvable' }); return null; }
  if (row.vendor_id !== ctx.vendorId) { res.status(403).json({ success: false, error: 'Document non autorisé' }); return null; }
  return { vendorId: ctx.vendorId, row };
}

// ── POST /api/documents/invoice-pdf  { invoice_id, ref } ─────────────────────
router.post('/invoice-pdf', verifyJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { invoice_id, ref } = z.object({ invoice_id: z.string().uuid(), ref: z.string().min(1).max(100) }).parse(req.body);
    const auth = await authVendor(req, res, 'invoices', invoice_id); if (!auth) return;
    const invoice = auth.row;
    const { data: vendor } = await supabaseAdmin.from('vendors').select('business_name, address, phone, email').eq('id', auth.vendorId).maybeSingle();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let yPos = renderSalesPdf(doc, { titleLabel: 'FACTURE', dateLabel2: "Date d'échéance", dateValue2: invoice.due_date, data: invoice, vendor, ref });

    if (invoice.paid_at) {
      doc.setFillColor(34, 197, 94); doc.rect(20, yPos - 3, 80, 10, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      doc.text('FACTURE PAYÉE', 25, yPos + 3); yPos += 15;
    }
    yPos = Math.max(yPos, 250);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor('#666666');
    doc.text('Conditions de paiement : Paiement accepté via Mobile Money, Carte bancaire.', 20, yPos); yPos += 5;
    if (invoice.due_date) { doc.text(`Date d'échéance : ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}.`, 20, yPos); yPos += 10; }
    doc.setFont('helvetica', 'bold'); doc.text('Cachet et signature : _______________________________', 20, yPos);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor('#666666');
    doc.text('Facture générée par 224Solutions • www.224solution.net', 105, 287, { align: 'center' });

    const pdfBytes = new Uint8Array(doc.output('arraybuffer'));
    const pdfUrl = await uploadDocument(`invoices/${auth.vendorId}/${ref}-${Date.now()}.pdf`, pdfBytes, 'application/pdf');
    // maj du lien best-effort : le PDF est déjà généré+uploadé, ne pas échouer la requête si le lien ne s'enregistre pas
    try { await supabaseAdmin.from('invoices').update({ pdf_url: pdfUrl }).eq('id', invoice_id); }
    catch (e) { logger.warn(`[documents/invoice-pdf] maj pdf_url: ${(e as Error)?.message}`); }
    logger.info(`[documents/invoice-pdf] facture ${ref} (vendor ${auth.vendorId})`);
    res.json({ success: true, data: { pdf_url: pdfUrl }, pdf_url: pdfUrl });
  } catch (err: any) {
    if (err?.issues) { res.status(400).json({ success: false, error: err.issues[0]?.message || 'Données invalides' }); return; }
    logger.error(`[documents/invoice-pdf] ${err?.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la génération du PDF' });
  }
});

// ── POST /api/documents/quote-pdf  { quote_id, ref } ─────────────────────────
router.post('/quote-pdf', verifyJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { quote_id, ref } = z.object({ quote_id: z.string().uuid(), ref: z.string().min(1).max(100) }).parse(req.body);
    const auth = await authVendor(req, res, 'quotes', quote_id); if (!auth) return;
    const quote = auth.row;
    const { data: vendor } = await supabaseAdmin.from('vendors').select('business_name, address, phone, email').eq('id', auth.vendorId).maybeSingle();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let yPos = renderSalesPdf(doc, { titleLabel: 'DEVIS', dateLabel2: "Valide jusqu'au", dateValue2: quote.valid_until, data: quote, vendor, ref });

    if (quote.notes) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor('#374151');
      doc.text('Notes :', 20, yPos); yPos += 6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const splitNotes = doc.splitTextToSize(quote.notes, 170);
      doc.text(splitNotes, 20, yPos); yPos += splitNotes.length * 5 + 10;
    }
    yPos = Math.max(yPos, 250);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor('#666666');
    doc.text('Conditions de paiement : Paiement accepté via Mobile Money, Carte bancaire.', 20, yPos); yPos += 5;
    if (quote.valid_until) { doc.text(`Validité du devis : Ce devis est valable jusqu'au ${new Date(quote.valid_until).toLocaleDateString('fr-FR')}.`, 20, yPos); yPos += 10; }
    doc.setFont('helvetica', 'bold'); doc.text('Signature client : _______________________________', 20, yPos);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor('#666666');
    doc.text('Devis généré par 224Solutions • www.224solution.net', 105, 287, { align: 'center' });

    const pdfBytes = new Uint8Array(doc.output('arraybuffer'));
    const pdfUrl = await uploadDocument(`quotes/${auth.vendorId}/${ref}-${Date.now()}.pdf`, pdfBytes, 'application/pdf');
    try { await supabaseAdmin.from('quotes').update({ pdf_url: pdfUrl }).eq('id', quote_id); }
    catch (e) { logger.warn(`[documents/quote-pdf] maj pdf_url: ${(e as Error)?.message}`); }
    logger.info(`[documents/quote-pdf] devis ${ref} (vendor ${auth.vendorId})`);
    res.json({ success: true, data: { pdf_url: pdfUrl }, pdf_url: pdfUrl });
  } catch (err: any) {
    if (err?.issues) { res.status(400).json({ success: false, error: err.issues[0]?.message || 'Données invalides' }); return; }
    logger.error(`[documents/quote-pdf] ${err?.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la génération du PDF' });
  }
});

export default router;
