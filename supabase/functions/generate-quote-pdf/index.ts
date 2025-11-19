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
    console.log('🔄 Génération PDF devis...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { quote_id, ref, vendor_id } = await req.json();
    console.log('📝 Données reçues:', { quote_id, ref, vendor_id });

    // Récupérer le devis complet
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quote_id)
      .single();

    if (quoteError || !quote) {
      throw new Error('Devis introuvable');
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

    // Titre DEVIS
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text(`DEVIS N° ${ref}`, 20, yPos);
    yPos += 12;

    // Date et validité
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    doc.text(`Date : ${new Date(quote.created_at).toLocaleDateString('fr-FR')}`, 20, yPos);
    yPos += 6;
    doc.text(`Valide jusqu'au : ${new Date(quote.valid_until).toLocaleDateString('fr-FR')}`, 20, yPos);
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
    doc.text(quote.client_name, 25, yPos);
    yPos += 5;
    if (quote.client_email) {
      doc.text(quote.client_email, 25, yPos);
      yPos += 5;
    }
    if (quote.client_phone) {
      doc.text(quote.client_phone, 25, yPos);
      yPos += 5;
    }
    if (quote.client_address) {
      doc.text(quote.client_address, 25, yPos);
      yPos += 5;
    }
    yPos += 15;

    // Tableau des articles
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(243, 244, 246);
    doc.rect(20, yPos, 170, 8, 'F');
    
    doc.text('Produit / Service', 22, yPos + 5);
    doc.text('Qté', 112, yPos + 5, { align: 'center' });
    doc.text('Prix unitaire', 140, yPos + 5, { align: 'right' });
    doc.text('Total', 188, yPos + 5, { align: 'right' });
    yPos += 8;

    // Lignes des articles
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    quote.items.forEach((item: any) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const itemName = (item.name || '').length > 50 ? (item.name || '').substring(0, 47) + '...' : (item.name || 'Article');
      const quantity = item.quantity || item.qty || 1;
      const unitPrice = item.unit_price || item.price || 0;
      const itemTotal = item.total || (quantity * unitPrice);
      
      // Formatage amélioré des nombres avec séparateurs de milliers
      const formatGNF = (num: number) => {
        return new Intl.NumberFormat('fr-FR', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 0 
        }).format(num) + ' GNF';
      };
      
      doc.text(itemName, 22, yPos + 5);
      doc.text(quantity.toString(), 112, yPos + 5, { align: 'center' });
      doc.text(formatGNF(unitPrice), 140, yPos + 5, { align: 'right' });
      doc.text(formatGNF(itemTotal), 188, yPos + 5, { align: 'right' });
      
      doc.setDrawColor(221, 221, 221);
      doc.setLineWidth(0.1);
      doc.line(20, yPos + 8, 190, yPos + 8);
      yPos += 8;
    });

    yPos += 10;

    // Totaux avec formatage amélioré
    const formatGNF = (num: number) => {
      return new Intl.NumberFormat('fr-FR', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0 
      }).format(num) + ' GNF';
    };

    const totalsX = 135;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Sous-total :', totalsX, yPos);
    doc.text(formatGNF(quote.subtotal), 188, yPos, { align: 'right' });
    yPos += 6;

    if (quote.discount > 0) {
      doc.text('Remise :', totalsX, yPos);
      doc.text(`-${formatGNF(quote.discount)}`, 188, yPos, { align: 'right' });
      yPos += 6;
    }

    if (quote.tax > 0) {
      doc.text('TVA :', totalsX, yPos);
      doc.text(formatGNF(quote.tax), 188, yPos, { align: 'right' });
      yPos += 6;
    }

    yPos += 3;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.8);
    doc.line(totalsX, yPos, 190, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.text('TOTAL :', totalsX, yPos);
    doc.text(formatGNF(quote.total), 188, yPos, { align: 'right' });
    yPos += 15;

    // Notes
    if (quote.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(textColor);
      doc.text('Notes :', 20, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitNotes = doc.splitTextToSize(quote.notes, 170);
      doc.text(splitNotes, 20, yPos);
      yPos += splitNotes.length * 5 + 10;
    }

    // Pied de page
    yPos = Math.max(yPos, 250);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    doc.text('Conditions de paiement : Paiement accepté via Mobile Money, Carte bancaire.', 20, yPos);
    yPos += 5;
    doc.text(`Validité du devis : Ce devis est valable jusqu'au ${new Date(quote.valid_until).toLocaleDateString('fr-FR')}.`, 20, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Signature client : _______________________________', 20, yPos);

    // Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);
    doc.text('Devis généré par 224Solutions • www.224solutions.com', 105, 287, { align: 'center' });

    // Convertir en ArrayBuffer
    const pdfBytes = doc.output('arraybuffer');

    // Upload vers Supabase Storage
    const fileName = `${ref}-${Date.now()}.pdf`;
    const filePath = `quotes/${vendor_id}/${fileName}`;

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

    // Mettre à jour le devis avec l'URL du PDF
    await supabase
      .from('quotes')
      .update({ pdf_url: pdfUrl })
      .eq('id', quote_id);

    console.log('✅ PDF généré avec succès:', pdfUrl);

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
