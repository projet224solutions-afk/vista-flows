/**
 * 🔧 GÉNÉRATEUR D'ID UNIQUE - 224SOLUTIONS
 * Format: LLLDDDD (3 lettres + 4 chiffres)
 * Exclut les lettres I, L, O pour éviter confusion avec 1, 0
 */

/**
 * Génère un ID aléatoire au format LLLDDDD
 * @returns {string} ID au format ABC1234
 */
export function generateId() {
  // Lettres sans I, L, O pour éviter confusion
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "0123456789";
  
  const randomLetter = () => letters[Math.floor(Math.random() * letters.length)];
  const randomDigit = () => digits[Math.floor(Math.random() * digits.length)];
  
  const id =
    randomLetter() + randomLetter() + randomLetter() +
    randomDigit() + randomDigit() + randomDigit() + randomDigit();
  
  return id.toUpperCase();
}

/**
 * Valide un ID au format LLLDDDD
 * @param {string} id - ID à valider
 * @returns {boolean} true si valide
 */
export function validatePublicId(id) {
  if (!id || typeof id !== 'string') return false;
  // 3 lettres (sans I, L, O) + 4 chiffres
  const regex = /^[A-HJ-KM-NP-Z]{3}[0-9]{4}$/;
  return regex.test(id);
}

/**
 * Formate un ID pour l'affichage
 * @param {string} id - ID à formatter
 * @returns {string} ID formatté en majuscules
 */
export function formatPublicId(id) {
  return id ? id.toUpperCase() : '';
}

module.exports = { generateId, validatePublicId, formatPublicId };
