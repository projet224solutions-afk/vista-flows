/**
 * 🔧 MIDDLEWARE: GÉNÉRATION AUTOMATIQUE D'ID PUBLIC
 * Intercepte les créations pour ajouter automatiquement un public_id
 */

const { generateUniqueId } = require('../services/idService');

/**
 * Middleware pour générer automatiquement un public_id sur les routes de création
 * @param {string} scope - Type d'entité (users, products, orders, etc.)
 */
function autoGeneratePublicId(scope) {
  return async (req, res, next) => {
    try {
      // Vérifier si l'objet a déjà un public_id
      if (req.body && !req.body.public_id) {
        console.log(`🔄 Génération auto public_id pour ${scope}...`);
        
        const userId = req.user?.id || null;
        const public_id = await generateUniqueId(scope, userId);
        
        // Ajouter le public_id au body de la requête
        req.body.public_id = public_id;
        
        console.log(`✅ Public_id généré automatiquement: ${public_id}`);
      }
      
      next();
    } catch (error) {
      console.error(`❌ Erreur génération public_id pour ${scope}:`, error);
      // Ne pas bloquer la requête, juste logger l'erreur
      next();
    }
  };
}

/**
 * Middleware pour valider un public_id existant
 */
function validatePublicId(req, res, next) {
  const { public_id } = req.body;
  
  if (public_id) {
    // Regex de validation: 3 lettres (sans I, L, O) + 4 chiffres
    const regex = /^[A-HJ-KM-NP-Z]{3}[0-9]{4}$/;
    
    if (!regex.test(public_id)) {
      return res.status(400).json({ 
        error: 'Format public_id invalide. Attendu: LLLDDDD (ex: ABC1234)' 
      });
    }
  }
  
  next();
}

module.exports = {
  autoGeneratePublicId,
  validatePublicId
};
