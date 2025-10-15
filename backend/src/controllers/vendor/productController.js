const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

async function getProducts(req, res) {
  try {
    const vendorId = req.user?.vendorId || req.query.vendorId;
    if (!vendorId) return res.status(400).json({ error: 'vendorId requis' });

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function createProduct(req, res) {
  try {
    const vendorId = req.user?.vendorId || req.body?.vendorId;
    if (!vendorId) return res.status(400).json({ error: 'vendorId requis' });
    const { name, price, sku } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name requis' });

    const { data, error } = await supabase
      .from('products')
      .insert([{ vendor_id: vendorId, name, price: Number(price) || 0, sku }])
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erreur création produit' });
  }
}

module.exports = { getProducts, createProduct };


