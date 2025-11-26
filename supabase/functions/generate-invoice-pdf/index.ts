import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Génération PDF facture...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { invoice_id, ref, vendor_id } = await req.json();
    console.log('📝 Données reçues:', { invoice_id, ref, vendor_id });

    // Récupérer la facture complète
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Facture introuvable');
    }

    // Récupérer les infos vendeur
    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_name, logo_url')
      .eq('id', vendor_id)
      .single();

    // Créer le PDF avec jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = '#2563eb';
    const textColor = '#374151';
    const grayColor = '#666666';
    let yPos = 20;

    // En-tête
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor);
    doc.text(vendor?.business_name || 'Vendeur', 20, yPos);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);
    doc.text('Powered by 224Solutions', 150, yPos);
    yPos += 15;

    // Ligne de séparation
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1);
    doc.line(20, yPos, 190, yPos);
    yPos += 15;

    // Titre FACTURE avec fond coloré
    doc.setFillColor(37, 99, 235);
    doc.rect(20, yPos - 5, 170, 15, 'F');
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`FACTURE N° ${ref}`, 25, yPos + 5);
    yPos += 18;

    // Date et échéance
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    doc.text(`Date : ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}`, 20, yPos);
    yPos += 6;
    doc.text(`Date d'échéance : ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}`, 20, yPos);
    yPos += 15;

    // Section client
    doc.setFillColor(249, 250, 251);
    doc.rect(20, yPos, 170, 35, 'F');
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Informations client', 25, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(invoice.client_name, 25, yPos);
    yPos += 5;
    if (invoice.client_email) {
      doc.text(invoice.client_email, 25, yPos);
      yPos += 5;
    }
    if (invoice.client_phone) {
      doc.text(invoice.client_phone, 25, yPos);
      yPos += 5;
    }
    yPos += 15;

    // En-tête du tableau des articles
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setFillColor(37, 99, 235);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    
    doc.text('Produit / Service', 22, yPos + 6.5);
    doc.text('Qté', 125, yPos + 6.5, { align: 'center' });
    doc.text('Prix unitaire', 155, yPos + 6.5, { align: 'right' });
    doc.text('Total', 188, yPos + 6.5, { align: 'right' });
    yPos += 10;

    // Lignes des articles
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(textColor);
    invoice.items.forEach((item: any, index: number) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const itemName = item.name || 'Article';
      const quantity = item.quantity || item.qty || 1;
      const unitPrice = item.unit_price || item.price || 0;
      const itemTotal = item.total || (quantity * unitPrice);
      
      // Formatage des nombres avec espaces
      const formatGNF = (num: number) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' GNF';
      };
      
      // Découper le texte long en plusieurs lignes si nécessaire
      const maxWidth = 100;
      const splitText = doc.splitTextToSize(itemName, maxWidth);
      const lineHeight = 6;
      const itemHeight = Math.max(12, splitText.length * lineHeight + 4);
      
      // Alternance de couleur de fond pour meilleure lisibilité
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(20, yPos, 170, itemHeight, 'F');
      }
      
      // Afficher le texte multi-lignes
      doc.text(splitText, 22, yPos + 6.5);
      
      // Afficher quantité, prix unitaire et total alignés verticalement au centre
      const centerY = yPos + (itemHeight / 2) + 1;
      doc.text(quantity.toString(), 125, centerY, { align: 'center' });
      doc.text(formatGNF(unitPrice), 155, centerY, { align: 'right' });
      doc.text(formatGNF(itemTotal), 188, centerY, { align: 'right' });
      
      yPos += itemHeight;
    });

    yPos += 10;

    // Totaux avec formatage des nombres
    const formatGNF = (num: number) => {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' GNF';
    };

    const totalsX = 135;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Sous-total :', totalsX, yPos);
    doc.text(formatGNF(invoice.subtotal), 188, yPos, { align: 'right' });
    yPos += 6;

    if (invoice.discount > 0) {
      doc.text('Remise :', totalsX, yPos);
      doc.text(`-${formatGNF(invoice.discount)}`, 188, yPos, { align: 'right' });
      yPos += 6;
    }

    if (invoice.tax > 0) {
      doc.text('TVA :', totalsX, yPos);
      doc.text(formatGNF(invoice.tax), 188, yPos, { align: 'right' });
      yPos += 6;
    }

    yPos += 5;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1);
    doc.line(totalsX, yPos, 190, yPos);
    yPos += 8;

    // Total avec fond coloré
    doc.setFillColor(37, 99, 235);
    doc.rect(totalsX - 5, yPos - 5, 63, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL :', totalsX, yPos + 3);
    doc.setFontSize(14);
    doc.text(formatGNF(invoice.total), 186, yPos + 3, { align: 'right' });
    yPos += 18;

    // Statut de paiement
    if (invoice.paid_at) {
      doc.setFillColor(34, 197, 94);
      doc.rect(20, yPos - 3, 80, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('FACTURE PAYÉE', 25, yPos + 3);
      doc.setTextColor(textColor);
      yPos += 15;
    }

    // Pied de page
    yPos = Math.max(yPos, 250);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    doc.text('Conditions de paiement : Paiement accepté via Mobile Money, Carte bancaire.', 20, yPos);
    yPos += 5;
    doc.text(`Date d'échéance : ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}.`, 20, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Cachet et signature : _______________________________', 20, yPos);

    // Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);
    doc.text('Facture générée par 224Solutions • www.224solutions.com', 105, 287, { align: 'center' });

    // Convertir en ArrayBuffer
    const pdfBytes = doc.output('arraybuffer');

    // Upload vers Supabase Storage
    const fileName = `${ref}-${Date.now()}.pdf`;
    const filePath = `invoices/${vendor_id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Erreur upload:', uploadError);
      throw uploadError;
    }

    // Obtenir l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    const pdfUrl = publicUrlData.publicUrl;

    // Mettre à jour la facture avec l'URL du PDF
    await supabase
      .from('invoices')
      .update({ pdf_url: pdfUrl })
      .eq('id', invoice_id);

    console.log('✅ PDF facture généré avec succès:', pdfUrl);

    return new Response(
      JSON.stringify({ success: true, pdf_url: pdfUrl }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
