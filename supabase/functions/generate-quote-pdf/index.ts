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

    // Générer HTML du PDF
    const currentDate = new Date().toLocaleDateString('fr-FR');
    
    // Construction des lignes items
    const itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qty}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.price.toLocaleString()} GNF</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(item.qty * item.price).toLocaleString()} GNF</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
          .logo { max-width: 150px; max-height: 100px; }
          h1 { color: #2563eb; margin-bottom: 8px; }
          .info-section { margin: 24px 0; }
          .info-label { font-weight: bold; color: #374151; }
          table { width: 100%; border-collapse: collapse; margin: 24px 0; }
          th { background: #f3f4f6; padding: 12px; border: 1px solid #ddd; text-align: left; }
          td { padding: 8px; border: 1px solid #ddd; }
          .totals { margin-top: 24px; text-align: right; }
          .totals-row { display: flex; justify-content: flex-end; margin: 8px 0; }
          .totals-label { margin-right: 24px; min-width: 120px; }
          .total-amount { font-size: 24px; font-weight: bold; color: #2563eb; }
          .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${vendor?.logo_url ? `<img src="${vendor.logo_url}" alt="Logo" class="logo">` : ''}
            <h2>${vendor?.business_name || 'Vendeur'}</h2>
          </div>
          <div>
            <img src="https://via.placeholder.com/120x60?text=224Solutions" alt="224Solutions" class="logo">
          </div>
        </div>

        <h1>DEVIS N° ${ref}</h1>
        <p><strong>Date:</strong> ${currentDate}</p>
        <p><strong>Validité:</strong> ${valid_until}</p>

        <div class="info-section">
          <p class="info-label">Client</p>
          <p>${client_name}</p>
          ${client_email ? `<p>📧 ${client_email}</p>` : ''}
          ${client_phone ? `<p>📱 ${client_phone}</p>` : ''}
          ${client_address ? `<p>📍 ${client_address}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Produit / Service</th>
              <th style="text-align: center; width: 80px;">Qté</th>
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
            <span>${subtotal.toLocaleString()} GNF</span>
          </div>
          ${discount > 0 ? `
            <div class="totals-row">
              <span class="totals-label">Remise:</span>
              <span>-${discount.toLocaleString()} GNF</span>
            </div>
          ` : ''}
          ${tax > 0 ? `
            <div class="totals-row">
              <span class="totals-label">Taxe:</span>
              <span>+${tax.toLocaleString()} GNF</span>
            </div>
          ` : ''}
          <div class="totals-row" style="border-top: 2px solid #2563eb; padding-top: 12px; margin-top: 12px;">
            <span class="totals-label">TOTAL:</span>
            <span class="total-amount">${total.toLocaleString()} GNF</span>
          </div>
        </div>

        ${notes ? `
          <div class="info-section">
            <p class="info-label">Notes / Conditions</p>
            <p>${notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p><strong>Conditions de paiement:</strong> Paiement accepté via Mobile Money, Carte bancaire.</p>
          <p><strong>Validité du devis:</strong> Ce devis est valable jusqu'au ${valid_until}.</p>
          <p style="margin-top: 24px;"><strong>Signature client:</strong> _______________________________</p>
        </div>

        <div style="text-align: center; margin-top: 48px; color: #666; font-size: 10px;">
          <p>Devis généré par 224Solutions • www.224solutions.com</p>
        </div>
      </body>
      </html>
    `;

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