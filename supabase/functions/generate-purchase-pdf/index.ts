/**
 * Edge Function: generate-purchase-pdf
 * Génération de PDF pour bon d'achat de stock
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePurchasePdfRequest {
  purchase_id: string;
  vendor_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { purchase_id, vendor_id }: GeneratePurchasePdfRequest = await req.json();

    // Récupérer les détails de l'achat
    const { data: purchase, error: purchaseError } = await supabase
      .from('stock_purchases')
      .select('*')
      .eq('id', purchase_id)
      .single();

    if (purchaseError || !purchase) {
      throw new Error('Achat non trouvé');
    }

    // Récupérer les items
    const { data: items, error: itemsError } = await supabase
      .from('stock_purchase_items')
      .select(`
        *,
        vendor_suppliers (name)
      `)
      .eq('purchase_id', purchase_id);

    if (itemsError) {
      throw new Error('Erreur récupération items');
    }

    // Récupérer le vendeur
    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_name, logo_url, address, phone')
      .eq('id', vendor_id)
      .single();

    // Formater le montant
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('fr-GN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + ' GNF';
    };

    // Générer le contenu HTML du PDF
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bon d'achat - ${purchase.purchase_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Helvetica Neue', Arial, sans-serif; 
      font-size: 12px;
      color: #333;
      padding: 20px;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start;
      margin-bottom: 30px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
    }
    .logo-section { max-width: 200px; }
    .logo { max-width: 120px; max-height: 60px; }
    .company-name { font-size: 18px; font-weight: bold; color: #1e40af; }
    .document-info { text-align: right; }
    .doc-title { 
      font-size: 24px; 
      font-weight: bold; 
      color: #1e40af;
      margin-bottom: 10px;
    }
    .doc-number { font-size: 14px; color: #666; }
    .doc-date { font-size: 12px; color: #666; margin-top: 5px; }
    
    .summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 25px;
    }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .summary-item { text-align: center; }
    .summary-label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
    .summary-value { font-size: 16px; font-weight: bold; }
    .summary-value.expense { color: #dc2626; }
    .summary-value.revenue { color: #333; }
    .summary-value.profit { color: #16a34a; }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 25px;
    }
    th { 
      background: #1e40af; 
      color: white; 
      padding: 10px 8px;
      text-align: left;
      font-size: 11px;
    }
    th:first-child { border-radius: 6px 0 0 0; }
    th:last-child { border-radius: 0 6px 0 0; }
    td { 
      padding: 10px 8px; 
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) { background: #f8fafc; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .product-name { font-weight: 500; }
    .supplier-name { font-size: 10px; color: #64748b; }
    
    .totals {
      margin-left: auto;
      width: 300px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
    }
    .total-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .total-row:last-child { border-bottom: none; }
    .total-row.main { 
      font-size: 14px; 
      font-weight: bold;
      border-top: 2px solid #1e40af;
      padding-top: 12px;
      margin-top: 5px;
    }
    .total-row.profit { color: #16a34a; }
    
    .footer { 
      margin-top: 40px; 
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 10px;
    }
    .notes { 
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 20px;
    }
    .notes-title { font-weight: bold; margin-bottom: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      ${vendor?.logo_url ? `<img src="${vendor.logo_url}" class="logo" alt="Logo">` : ''}
      <div class="company-name">${vendor?.business_name || 'Mon Entreprise'}</div>
      ${vendor?.address ? `<div style="font-size: 11px; color: #666;">${vendor.address}</div>` : ''}
      ${vendor?.phone ? `<div style="font-size: 11px; color: #666;">Tél: ${vendor.phone}</div>` : ''}
    </div>
    <div class="document-info">
      <div class="doc-title">BON D'ACHAT DE STOCK</div>
      <div class="doc-number">${purchase.purchase_number}</div>
      <div class="doc-date">Date: ${new Date(purchase.created_at).toLocaleDateString('fr-FR')}</div>
    </div>
  </div>
  
  <div class="summary-box">
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">TOTAL ACHAT</div>
        <div class="summary-value expense">${formatCurrency(purchase.total_purchase_amount || 0)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">TOTAL VENTE ESTIMÉ</div>
        <div class="summary-value revenue">${formatCurrency(purchase.total_selling_amount || 0)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">PROFIT ESTIMÉ</div>
        <div class="summary-value profit">+${formatCurrency(purchase.estimated_total_profit || 0)}</div>
      </div>
    </div>
  </div>
  
  ${purchase.notes ? `
  <div class="notes">
    <div class="notes-title">Notes:</div>
    <div>${purchase.notes}</div>
  </div>
  ` : ''}
  
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Produit</th>
        <th class="text-center" style="width: 10%;">Qté</th>
        <th class="text-right" style="width: 15%;">Prix Achat</th>
        <th class="text-right" style="width: 15%;">Prix Vente</th>
        <th class="text-right" style="width: 15%;">Total Achat</th>
        <th class="text-right" style="width: 15%;">Profit</th>
      </tr>
    </thead>
    <tbody>
      ${(items || []).map((item: any) => `
        <tr>
          <td>
            <div class="product-name">${item.product_name}</div>
            ${item.vendor_suppliers?.name ? `<div class="supplier-name">Fournisseur: ${item.vendor_suppliers.name}</div>` : ''}
          </td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">${formatCurrency(item.purchase_price)}</td>
          <td class="text-right">${formatCurrency(item.selling_price)}</td>
          <td class="text-right">${formatCurrency(item.total_purchase)}</td>
          <td class="text-right" style="color: #16a34a;">+${formatCurrency(item.total_profit)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="totals">
    <div class="total-row">
      <span>Sous-total achat:</span>
      <span>${formatCurrency(purchase.total_purchase_amount || 0)}</span>
    </div>
    <div class="total-row">
      <span>Sous-total vente:</span>
      <span>${formatCurrency(purchase.total_selling_amount || 0)}</span>
    </div>
    <div class="total-row main profit">
      <span>PROFIT ESTIMÉ:</span>
      <span>+${formatCurrency(purchase.estimated_total_profit || 0)}</span>
    </div>
  </div>
  
  <div class="footer">
    <p>Document généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
    <p>${vendor?.business_name || 'Mon Entreprise'} - Système de Gestion des Achats</p>
  </div>
</body>
</html>
    `;

    // Retourner le HTML (le client fera la conversion en PDF via jsPDF)
    return new Response(
      JSON.stringify({ 
        success: true, 
        html: htmlContent,
        purchase: purchase,
        items: items,
        vendor: vendor
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[generate-purchase-pdf] Erreur:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
