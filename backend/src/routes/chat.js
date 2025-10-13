const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// GET /api/chat/:vendorId -> retourne un thread/chatId minimal (placeholder)
router.get('/:vendorId', authMiddleware, async (req, res) => {
  try {
    const { vendorId } = req.params;
    if (!vendorId) return res.status(400).json({ error: 'vendorId requis' });

    // Placeholder: generate deterministic thread id (to be stored in DB later)
    const chatId = `chat_${vendorId}_${req.user?.id || 'anonymous'}`;
    return res.json({ chatId, url: `/messages/${chatId}` });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
});

module.exports = router;


