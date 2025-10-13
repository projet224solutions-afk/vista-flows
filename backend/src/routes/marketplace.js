const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// GET /api/categories
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, product_count')
      .order('name', { ascending: true });
    if (error) throw error;
    const categories = (data || []).map(c => ({ id: c.id, name: c.name, count: c.product_count || 0 }));
    res.json({ categories });
  } catch (e) {
    res.json({ categories: [] });
  }
});

// GET /api/products
router.get('/products', async (req, res) => {
  try {
    const { search = '', category = '', minPrice = 0, maxPrice = 0, minRating = 0, sort = 'popular', page = 1, limit = 12 } = req.query;

    let query = supabase
      .from('products')
      .select('id, name, price, image_url, vendor_name, rating, review_count', { count: 'exact' })
      .ilike('name', `%${search}%`);

    if (category) query = query.eq('category_id', category);
    if (Number(minPrice) > 0) query = query.gte('price', Number(minPrice));
    if (Number(maxPrice) > 0) query = query.lte('price', Number(maxPrice));
    if (Number(minRating) > 0) query = query.gte('rating', Number(minRating));

    switch (sort) {
      case 'price-low': query = query.order('price', { ascending: true }); break;
      case 'price-high': query = query.order('price', { ascending: false }); break;
      case 'rating': query = query.order('rating', { ascending: false }); break;
      case 'newest': query = query.order('created_at', { ascending: false }); break;
      default: query = query.order('popularity', { ascending: false });
    }

    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const products = (data || []).map(p => ({
      id: p.id,
      image: p.image_url,
      title: p.name,
      price: p.price,
      vendor: p.vendor_name,
      rating: p.rating,
      reviewCount: p.review_count
    }));

    res.json({ products, total: count || 0 });
  } catch (e) {
    res.json({ products: [], total: 0 });
  }
});

// POST /api/payments/create
router.post('/payments/create', async (req, res) => {
  try {
    const { productId, clientId } = req.body || {};
    if (!productId || !clientId) return res.status(400).json({ error: 'productId et clientId requis' });

    // Récupérer le produit
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('id, name, price, currency, vendor_id')
      .eq('id', productId)
      .maybeSingle();
    if (prodErr) throw prodErr;
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });

    const fee = Math.round((Number(product.price) * 0.01) * 100) / 100;
    const total = Number(product.price) + fee;

    // Créer un lien de paiement
    const insertPayload = {
      product_id: product.id,
      product_name: product.name,
      amount: product.price,
      fee,
      currency: product.currency || 'GNF',
      client_id: clientId,
      vendor_id: product.vendor_id,
      status: 'pending'
    };
    const { data: link, error: linkErr } = await supabase.from('payment_links').insert(insertPayload).select('id').single();
    if (linkErr) throw linkErr;

    const paymentLink = `/payment/${link.id}`;
    res.json({ paymentLink });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erreur création paiement' });
  }
});

module.exports = router;


