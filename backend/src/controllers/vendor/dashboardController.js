const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

async function getVendorDashboard(req, res) {
  try {
    const vendorId = req.user?.vendorId || req.query.vendorId;
    if (!vendorId) return res.status(400).json({ error: 'vendorId requis' });

    // Summary: revenue, orders_count (profit approximé 0 si non calculable)
    const { data: ordersAgg, error: ordersAggErr } = await supabase
      .from('orders')
      .select('total')
      .eq('vendor_id', vendorId);
    if (ordersAggErr) throw ordersAggErr;
    const revenue = (ordersAgg || []).reduce((sum, o) => sum + Number(o.total || 0), 0);
    const orders_count = (ordersAgg || []).length;

    // Top products by sold (order_items quantity)
    const { data: topItems, error: topErr } = await supabase
      .from('order_items')
      .select('product_id, quantity');
    if (topErr) throw topErr;
    const soldByProductId = new Map();
    (topItems || []).forEach((it) => {
      const pid = it.product_id;
      soldByProductId.set(pid, (soldByProductId.get(pid) || 0) + Number(it.quantity || 0));
    });

    // Fetch product names for ids
    const topSorted = Array.from(soldByProductId.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topIds = topSorted.map(([pid]) => pid);
    let topProducts = [];
    if (topIds.length > 0) {
      const { data: productsData, error: prodErr } = await supabase
        .from('products')
        .select('id, name')
        .in('id', topIds)
        .eq('vendor_id', vendorId);
      if (prodErr) throw prodErr;
      const idToName = new Map((productsData || []).map((p) => [p.id, p.name]));
      topProducts = topSorted.map(([id, sold]) => ({ id, name: idToName.get(id) || `#${id}`, sold }));
    }

    // Low stock: compare stock quantity vs reorder_level
    const { data: allProducts, error: allProdErr } = await supabase
      .from('products')
      .select('id, name, reorder_level')
      .eq('vendor_id', vendorId);
    if (allProdErr) throw allProdErr;

    const { data: stockRows, error: stockErr } = await supabase
      .from('stock')
      .select('product_id, quantity');
    if (stockErr) throw stockErr;
    const qtyByProduct = new Map();
    (stockRows || []).forEach((s) => {
      qtyByProduct.set(s.product_id, (qtyByProduct.get(s.product_id) || 0) + Number(s.quantity || 0));
    });

    const lowStock = (allProducts || [])
      .map((p) => ({ id: p.id, name: p.name, quantity: qtyByProduct.get(p.id) || 0, reorder_level: p.reorder_level || 0 }))
      .filter((p) => p.quantity <= p.reorder_level)
      .slice(0, 10);

    return res.json({
      summary: { revenue, profit: 0, orders_count },
      lowStock,
      topProducts
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { getVendorDashboard };


