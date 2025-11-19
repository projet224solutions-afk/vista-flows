import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Génération PDF devis...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const {
      quote_id,
      ref,
      vendor_id,
      client_name,
      client_email,
      client_phone,
      client_address,
      items,
      subtotal,
      discount,
      tax,
      total,
      valid_until,
      notes
    } = body;

    console.log('📝 Données reçues:', { quote_id, ref, vendor_id });

    // Récupérer les infos vendeur
    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_name, logo_url')
      .eq('id', vendor_id)
      .single();

    // Générer HTML du PDF avec encodage UTF-8 correct
    const currentDate = new Date().toLocaleDateString('fr-FR');
    
    // Helper function pour encoder en UTF-8
    const encodeUTF8 = (str: string) => str
      .replace(/°/g, '&deg;')
      .replace(/é/g, '&eacute;')
      .replace(/è/g, '&egrave;')
      .replace(/ê/g, '&ecirc;')
      .replace(/à/g, '&agrave;')
      .replace(/ù/g, '&ugrave;')
      .replace(/ô/g, '&ocirc;')
      .replace(/î/g, '&icirc;')
      .replace(/ç/g, '&ccedil;')
      .replace(/'/g, '&#39;');
    
    // Construction des lignes items avec encodage
    const itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${encodeUTF8(item.name)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qty}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.price.toLocaleString('fr-FR')} GNF</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(item.qty * item.price).toLocaleString('fr-FR')} GNF</td>
      </tr>
    `).join('');

    // Afficher le logo du vendeur s'il existe
    const vendorLogoHtml = vendor?.logo_url 
      ? `<img src="${vendor.logo_url}" alt="Logo vendeur" class="logo" crossorigin="anonymous">`
      : `<div style="width: 150px; height: 100px; display: flex; align-items: center; justify-content: center; border: 2px dashed #ccc; font-size: 12px; color: #999;">Logo vendeur</div>`;

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Devis ${ref}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Arial', 'Helvetica', sans-serif; 
      margin: 32px; 
      color: #333;
      line-height: 1.6;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    .logo { 
      max-width: 150px; 
      max-height: 100px;
      object-fit: contain;
    }
    h1 { 
      color: #2563eb; 
      margin: 20px 0 8px 0;
      font-size: 28px;
    }
    h2 {
      color: #374151;
      font-size: 18px;
      margin: 10px 0;
    }
    .info-section { 
      margin: 24px 0;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .info-label { 
      font-weight: bold; 
      color: #374151;
      font-size: 14px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 24px 0;
      background: white;
    }
    th { 
      background: #2563eb; 
      color: white;
      padding: 12px; 
      border: 1px solid #1e40af; 
      text-align: left;
      font-weight: bold;
    }
    td { 
      padding: 10px; 
      border: 1px solid #e5e7eb;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .totals { 
      margin-top: 24px; 
      text-align: right;
    }
    .totals-row { 
      display: flex; 
      justify-content: flex-end; 
      margin: 8px 0;
      font-size: 16px;
    }
    .totals-label { 
      margin-right: 24px; 
      min-width: 120px;
      font-weight: 500;
    }
    .total-amount { 
      font-size: 24px; 
      font-weight: bold; 
      color: #2563eb;
    }
    .footer { 
      margin-top: 48px; 
      padding-top: 24px; 
      border-top: 2px solid #e5e7eb; 
      font-size: 12px; 
      color: #6b7280;
    }
    .footer p {
      margin: 8px 0;
    }
    @media print {
      body { margin: 0; }
      .header { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${vendorLogoHtml}
      <h2>${encodeUTF8(vendor?.business_name || 'Vendeur')}</h2>
    </div>
    <div>
      <img src="https://via.placeholder.com/120x60?text=224Solutions" alt="224Solutions" class="logo">
    </div>
  </div>

  <h1>DEVIS N&deg; ${ref}</h1>
  <p><strong>Date:</strong> ${currentDate}</p>
  <p><strong>Validit&eacute;:</strong> ${valid_until}</p>

  <div class="info-section">
    <p class="info-label">Client</p>
    <p><strong>${encodeUTF8(client_name)}</strong></p>
    ${client_email ? `<p>&#128231; ${encodeUTF8(client_email)}</p>` : ''}
    ${client_phone ? `<p>&#128241; ${encodeUTF8(client_phone)}</p>` : ''}
    ${client_address ? `<p>&#128205; ${encodeUTF8(client_address)}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Produit / Service</th>
        <th style="text-align: center; width: 80px;">Qt&eacute;</th>
        <th style="text-align: right; width: 120px;">Prix unitaire</th>
        <th style="text-align: right; width: 120px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span class="totals-label">Sous-total:</span>
      <span>${subtotal.toLocaleString('fr-FR')} GNF</span>
    </div>
    ${discount > 0 ? `
      <div class="totals-row">
        <span class="totals-label">Remise:</span>
        <span>-${discount.toLocaleString('fr-FR')} GNF</span>
      </div>
    ` : ''}
    ${tax > 0 ? `
      <div class="totals-row">
        <span class="totals-label">Taxe:</span>
        <span>+${tax.toLocaleString('fr-FR')} GNF</span>
      </div>
    ` : ''}
    <div class="totals-row" style="border-top: 2px solid #2563eb; padding-top: 12px; margin-top: 12px;">
      <span class="totals-label">TOTAL:</span>
      <span class="total-amount">${total.toLocaleString('fr-FR')} GNF</span>
    </div>
  </div>

  ${notes ? `
    <div class="info-section">
      <p class="info-label">Notes / Conditions</p>
      <p>${encodeUTF8(notes)}</p>
    </div>
  ` : ''}

  <div class="footer">
    <p><strong>Conditions de paiement:</strong> Paiement accept&eacute; via Mobile Money, Carte bancaire.</p>
    <p><strong>Validit&eacute; du devis:</strong> Ce devis est valable jusqu&#39;au ${valid_until}.</p>
    <p style="margin-top: 24px;"><strong>Signature client:</strong> _______________________________</p>
  </div>

  <div style="text-align: center; margin-top: 48px; color: #999; font-size: 10px;">
    <p>Devis g&eacute;n&eacute;r&eacute; par 224Solutions &bull; www.224solutions.com</p>
  </div>
</body>
</html>`;

    // Stocker le HTML dans Storage Supabase avec encodage UTF-8 correct
    const fileName = `quotes/${vendor_id}/${ref}-${Date.now()}.html`;
    
    // Encoder le HTML en UTF-8
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(htmlContent);
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, new Blob([htmlBytes], { type: 'text/html; charset=utf-8' }), {
        contentType: 'text/html; charset=utf-8',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Erreur upload:', uploadError);
      throw uploadError;
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Mettre à jour le devis avec l'URL du PDF
    await supabase
      .from('quotes')
      .update({ pdf_url: publicUrl })
      .eq('id', quote_id);

    console.log('✅ PDF généré avec succès:', publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true,
        pdf_url: publicUrl 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});