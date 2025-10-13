const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Initiate escrow (client only)
router.post('/initiate', authMiddleware, async (req, res) => {
  try {
    const { orderId, payerId, receiverId, amount, currency } = req.body;
    if (!orderId || !payerId || !receiverId || !amount) {
      return res.status(400).json({ success: false, message: 'Paramètres invalides' });
    }
    const { data, error } = await supabase.rpc('initiate_escrow', {
      p_order_id: orderId, p_payer_id: payerId, p_receiver_id: receiverId, p_amount: amount, p_currency: currency || 'GNF'
    });
    if (error) throw error;
    res.json({ success: true, escrowId: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Release escrow (admin only)
router.post('/release', authMiddleware, async (req, res) => {
  try {
    const { escrowId, commissionPercent } = req.body;
    if (!escrowId) return res.status(400).json({ success: false, message: 'escrowId requis' });
    const { data, error } = await supabase.rpc('release_escrow', { p_escrow_id: escrowId, p_commission_percent: commissionPercent || 0 });
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Refund escrow (admin or dispute resolution)
router.post('/refund', authMiddleware, async (req, res) => {
  try {
    const { escrowId } = req.body;
    if (!escrowId) return res.status(400).json({ success: false, message: 'escrowId requis' });
    const { data, error } = await supabase.rpc('refund_escrow', { p_escrow_id: escrowId });
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Dispute
router.post('/dispute', authMiddleware, async (req, res) => {
  try {
    const { escrowId } = req.body;
    if (!escrowId) return res.status(400).json({ success: false, message: 'escrowId requis' });
    const { data, error } = await supabase.rpc('dispute_escrow', { p_escrow_id: escrowId });
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;


