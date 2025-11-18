const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// GET /api/auth/me -> retourne les infos de l'utilisateur courant (JWT) + public_id standardisé
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // req.user doit être renseigné par authMiddleware
    if (!req.user) return res.status(401).json({ error: 'Non authentifié' });

    // Récupérer le public_id standardisé depuis Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('public_id')
      .eq('id', req.user.id)
      .single();

    // Retour avec public_id standardisé
    const user = {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      public_id: profile?.public_id || null,
    };
    return res.json({ user });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
});

module.exports = router;


