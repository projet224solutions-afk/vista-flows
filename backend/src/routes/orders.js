const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');

// Service role client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// POS checkout: crée order, items, décrémente stock (inventory puis products)
router.post('/pos-checkout', authMiddleware, async (req, res) => {
  try {
    const { vendorId, items, totalAmount } = req.body;
    if (!vendorId || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ success: false, message: 'Paramètres invalides' });
    }

    // create order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({ vendor_id: vendorId, total_amount: totalAmount, payment_status: 'paid', status: 'confirmed' })
      .select('id')
      .single();
    if (orderErr) throw orderErr;

    // insert items
    const payload = items.map((it) => ({
      order_id: order.id,
      product_id: it.id,
      quantity: it.quantity,
      unit_price: it.price,
      total_price: it.price * it.quantity,
    }));
    const { error: itemsErr } = await supabase.from('order_items').insert(payload);
    if (itemsErr) throw itemsErr;

    // decrement stock
    for (const it of items) {
      // inventory first
      const { data: invRow } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('product_id', it.id)
        .limit(1)
        .maybeSingle();
      if (invRow) {
        const nextQty = Math.max(0, Number(invRow.quantity || 0) - it.quantity);
        const { error: invUpdErr } = await supabase.from('inventory').update({ quantity: nextQty }).eq('id', invRow.id);
        if (invUpdErr) throw invUpdErr;
        continue;
      }
      // products fallback
      const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', it.id).single();
      const current = Number((prod || {}).stock_quantity || 0);
      const next = Math.max(0, current - it.quantity);
      const { error: prodErr } = await supabase
        .from('products')
        .update({ stock_quantity: next, updated_at: new Date().toISOString() })
        .eq('id', it.id);
      if (prodErr) throw prodErr;
    }

    return res.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('POS checkout error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;


