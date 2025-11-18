const { createClient } = require('@supabase/supabase-js');
const { generateUniqueId } = require('../../services/idService');

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

    // 🆕 Générer un public_id unique
    console.log('🔄 Génération public_id pour produit...');
    const public_id = await generateUniqueId('products', req.user?.id);

    const { data, error } = await supabase
      .from('products')
      .insert([{ 
        vendor_id: vendorId, 
        name, 
        price: Number(price) || 0, 
        sku,
        public_id 
      }])
      .select('*')
      .single();
    if (error) throw error;
    
    console.log('✅ Produit créé avec public_id:', public_id);
    res.json(data);
  } catch (err) {
    console.error('Erreur création produit:', err);
    res.status(500).json({ error: 'Erreur création produit' });
  }
}

module.exports = { getProducts, createProduct };

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, price, sku } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id requis' });

    const { data, error } = await supabase
      .from('products')
      .update({ name, price: Number(price) || 0, sku })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erreur update produit' });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id requis' });

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur suppression produit' });
  }
}

module.exports.updateProduct = updateProduct;
module.exports.deleteProduct = deleteProduct;


