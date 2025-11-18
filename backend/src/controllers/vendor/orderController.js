const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

async function getOrders(req, res) {
    try {
        const vendorId = req.user?.vendorId || req.query.vendorId;
        if (!vendorId) return res.status(400).json({ error: 'vendorId requis' });
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('vendor_id', vendorId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Erreur récupération commandes' });
    }
}

async function createOrder(req, res) {
    try {
        const vendorId = req.user?.vendorId || req.body?.vendorId;
        if (!vendorId) return res.status(400).json({ error: 'vendorId requis' });
        const { items = [], total = 0 } = req.body || {};

        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .insert([{ vendor_id: vendorId, total: Number(total) || 0 }])
            .select('*')
            .single();
        if (orderErr) throw orderErr;

        if (items && items.length > 0) {
            const orderItems = items.map((i) => ({
                order_id: order.id,
                product_id: i.product_id,
                quantity: Number(i.quantity) || 1,
                unit_price: Number(i.unit_price) || 0
            }));
            const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
            if (itemsErr) throw itemsErr;
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Erreur création commande' });
    }
}

async function updateOrder(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body || {};
        if (!id) return res.status(400).json({ error: 'id requis' });
        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Erreur update commande' });
    }
}

module.exports = { getOrders, createOrder, updateOrder };


