/**
 * 🚕 TAXI ROUTES - Backend Node.js
 *
 * Résolution sécurisée d'une cible de suivi (client) pour le taxi-moto.
 * Service role → peut lire profiles + user_ids (RLS bloqué côté frontend).
 *
 * Un compte SUPPRIMÉ n'a plus de ligne profiles/user_ids → la résolution échoue
 * → le chauffeur ne peut plus le retrouver.
 *
 * Endpoint (monté sur /api/v2/taxi) :
 *   - GET /resolve-target?q=<ID | UUID | custom_id | téléphone | email>
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_RE = /^\+?[\d\s().-]{7,}$/;

function phoneVariants(raw: string): string[] {
  const compact = raw.replace(/[\s().-]/g, '');
  const digits = compact.replace(/[^\d]/g, '');
  const withPlus = digits ? `+${digits}` : '';
  const noPrefix = digits.startsWith('00') ? digits.slice(2) : digits;
  return Array.from(new Set([raw.trim(), compact, digits, withPlus, noPrefix].filter(Boolean)));
}

/** Extrait un id depuis un lien …/track/<id> ou renvoie la saisie telle quelle. */
function extractRaw(input: string): string {
  const trimmed = String(input || '').trim();
  const uuid = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuid) return uuid[0];
  const fromPath = trimmed.match(/\/track\/([^/?#\s]+)/i);
  if (fromPath) return decodeURIComponent(fromPath[1]);
  return trimmed;
}

/**
 * Résout un identifiant vers un user_id ACTIF (présent dans profiles).
 * Retourne null si aucun compte actif (inexistant ou supprimé).
 */
async function findActiveUserId(raw: string): Promise<string | null> {
  // 1. UUID → profiles.id
  if (UUID_RE.test(raw)) {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', raw).maybeSingle();
    return data?.id ?? null;
  }

  // 2. custom_id (ex: CLT0005) → user_ids.custom_id → user_id → vérifier profiles
  const { data: uid } = await supabaseAdmin
    .from('user_ids').select('user_id').eq('custom_id', raw.toUpperCase()).maybeSingle();
  if (uid?.user_id) {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', uid.user_id).maybeSingle();
    if (data?.id) return data.id;
  }

  // 3. public_id → profiles.public_id
  const { data: byPublic } = await supabaseAdmin
    .from('profiles').select('id')
    .or(`public_id.eq.${raw},public_id.eq.${raw.toUpperCase()}`)
    .limit(1).maybeSingle();
  if (byPublic?.id) return byPublic.id;

  // 4. téléphone → profiles.phone
  if (PHONE_RE.test(raw)) {
    const filter = phoneVariants(raw).map((v) => `phone.eq.${v}`).join(',');
    const { data: byPhone } = await supabaseAdmin
      .from('profiles').select('id').or(filter).limit(1).maybeSingle();
    if (byPhone?.id) return byPhone.id;
  }

  // 5. email → profiles.email
  if (raw.includes('@')) {
    const { data: byEmail } = await supabaseAdmin
      .from('profiles').select('id').eq('email', raw.toLowerCase()).maybeSingle();
    if (byEmail?.id) return byEmail.id;
  }

  return null;
}

/**
 * GET /api/v2/taxi/resolve-target?q=...
 * Résout la cible de suivi. status 'active' → le chauffeur peut suivre ;
 * status 'not_found' → compte inexistant ou supprimé (le chauffeur ne le retrouve pas).
 */
router.get('/resolve-target', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = extractRaw(String(req.query.q || ''));
    if (!q) {
      res.status(400).json({ success: false, error: 'q requis' });
      return;
    }

    const userId = await findActiveUserId(q);

    if (!userId) {
      res.json({ success: true, status: 'not_found' });
      return;
    }

    // custom_id réel (clé du canal de diffusion du client) + profil
    const [{ data: uid }, { data: prof }, { data: vendor }] = await Promise.all([
      supabaseAdmin.from('user_ids').select('custom_id').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('profiles')
        .select('first_name, last_name, full_name, phone, avatar_url, city, country, custom_id, public_id')
        .eq('id', userId).maybeSingle(),
      supabaseAdmin.from('vendors')
        .select('business_name, address, city, neighborhood, phone, logo_url')
        .eq('user_id', userId).maybeSingle(),
    ]);

    const customId = uid?.custom_id || (prof as any)?.custom_id || (prof as any)?.public_id || null;
    const isShop = !!vendor;

    const profile = {
      name: (prof as any)?.full_name
        || `${(prof as any)?.first_name || ''} ${(prof as any)?.last_name || ''}`.trim()
        || 'Client',
      phone: (vendor as any)?.phone || (prof as any)?.phone || undefined,
      address: isShop
        ? [(vendor as any)?.address, (vendor as any)?.neighborhood, (vendor as any)?.city].filter(Boolean).join(', ') || undefined
        : [(prof as any)?.city, (prof as any)?.country].filter(Boolean).join(', ') || undefined,
      photo: (vendor as any)?.logo_url || (prof as any)?.avatar_url || undefined,
      customId: customId || undefined,
      isShop,
      shopName: (vendor as any)?.business_name || undefined,
    };

    // Clé de canal = user_id (UUID). Le client écoute/diffuse aussi sur son canal user_id,
    // et un UUID permet aux requêtes taxi_drivers/profiles côté chauffeur de fonctionner.
    const trackingKey = userId;

    res.json({
      success: true,
      status: 'active',
      userId,
      customId,
      trackingKey,
      profile,
    });
  } catch (error: any) {
    logger.error(`[Taxi] resolve-target error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la résolution de la cible' });
  }
});

export default router;
