function checkSellerRole(req, res, next) {
  const user = req.user || req.body?.user || null;
  const role = (user && (user.role || user?.profile?.role)) || req.headers['x-user-role'];

  if (!role) return res.status(401).json({ error: 'Utilisateur non authentifié' });
  if (['seller', 'vendeur', 'PDG', 'admin'].includes(String(role).toLowerCase())) return next();

  return res.status(403).json({ error: 'Accès réservé aux vendeurs' });
}

module.exports = checkSellerRole;


