const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// GET /api/auth/me -> retourne les infos de l'utilisateur courant (JWT)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // req.user doit être renseigné par authMiddleware
    if (!req.user) return res.status(401).json({ error: 'Non authentifié' });

    // Retour minimal; on peut enrichir via Supabase si besoin
    const user = {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    };
    return res.json({ user });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
});

module.exports = router;


