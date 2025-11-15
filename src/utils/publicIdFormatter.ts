/**
 * 🔧 UTILITAIRES DE FORMATAGE D'ID PUBLIC
 * Fonctions helper pour gérer les IDs LLLDDDD
 */

/**
 * Valide un ID au format LLLDDDD
 * @param id - ID à valider
 * @returns true si le format est valide
 */
export function validatePublicId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  // 3 lettres (sans I, L, O pour éviter confusion) + 4 chiffres
  const regex = /^[A-HJ-KM-NP-Z]{3}[0-9]{4}$/;
  return regex.test(id.toUpperCase());
}

/**
 * Formate un ID pour l'affichage (toujours en majuscules)
 * @param id - ID à formatter
 * @returns ID formatté ou chaîne vide
 */
export function formatPublicId(id: string | null | undefined): string {
  if (!id) return '';
  return id.toUpperCase().trim();
}

/**
 * Extrait et formate un ID depuis un texte
 * @param text - Texte contenant potentiellement un ID
 * @returns ID trouvé et formatté, ou null
 */
export function extractPublicId(text: string | null | undefined): string | null {
  if (!text) return null;
  
  const regex = /[A-HJ-KM-NP-Z]{3}[0-9]{4}/i;
  const match = text.match(regex);
  
  return match ? match[0].toUpperCase() : null;
}

/**
 * Crée un label d'affichage avec l'ID
 * @param id - ID public
 * @param label - Label à afficher
 * @returns Format: "ABC1234 - Label"
 */
export function createIdLabel(
  id: string | null | undefined,
  label: string
): string {
  const formattedId = formatPublicId(id);
  return formattedId ? `${formattedId} - ${label}` : label;
}

/**
 * Génère un ID temporaire pour le frontend (avant génération serveur)
 * @returns ID temporaire au format "TMP-XXXX"
 */
export function generateTempId(): string {
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `TMP-${timestamp}`;
}

/**
 * Vérifie si un ID est temporaire
 * @param id - ID à vérifier
 * @returns true si c'est un ID temporaire
 */
export function isTempId(id: string | null | undefined): boolean {
  return !!id && id.startsWith('TMP-');
}

/**
 * Masque partiellement un ID pour affichage sécurisé
 * @param id - ID à masquer
 * @returns ID masqué (ex: "ABC****")
 */
export function maskPublicId(id: string | null | undefined): string {
  const formattedId = formatPublicId(id);
  if (!formattedId || formattedId.length < 7) return '***';
  
  return formattedId.substring(0, 3) + '****';
}

/**
 * Compare deux IDs (insensible à la casse)
 * @param id1 - Premier ID
 * @param id2 - Deuxième ID
 * @returns true si les IDs sont identiques
 */
export function comparePublicIds(
  id1: string | null | undefined,
  id2: string | null | undefined
): boolean {
  if (!id1 || !id2) return false;
  return formatPublicId(id1) === formatPublicId(id2);
}

/**
 * Génère un ID de recherche pour filtrage
 * @param searchTerm - Terme de recherche
 * @returns Terme formaté pour recherche d'ID
 */
export function formatSearchTerm(searchTerm: string): string {
  return searchTerm.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
}
