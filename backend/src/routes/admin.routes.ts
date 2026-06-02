/**
 * 🛡️ ADMIN ROUTES - Backend Node.js
 *
 * Suppression d'utilisateur — MIGRÉE depuis l'Edge Function `delete-user`.
 * Avantages Node.js : déploiement via Vercel (plus de déploiement Edge séparé),
 * meilleur outillage, logs Winston.
 *
 * Durcissement intégré :
 *  - comptes privilégiés (pdg/ceo/admin/actionnaire) non supprimables sauf force:true
 *  - archivage 365j dans deleted_users_archive (récupérable via restore-user)
 *  - alerte audit (audit_logs) à chaque suppression
 *
 * Endpoint (monté sur /api/admin) :
 *   - POST /delete-user  { userId, force? }
 */

import { Router, Response } from 'express';
import { verifyJWT, requireRole } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = Router();
const PDG_ROLES = ['admin', 'pdg', 'ceo'];
const PROTECTED_ROLES = ['pdg', 'ceo', 'admin', 'actionnaire'];

// ============================================
// AWS Cognito Deletion Helper (Signature V4) — Web Crypto (Node 18+)
// ============================================
const subtle = globalThis.crypto.subtle;

async function sha256(message: string): Promise<ArrayBuffer> {
  return await subtle.digest('SHA-256', new TextEncoder().encode(message));
}
async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return await subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function getSignatureKey(key: string, dateStamp: string, region: string, service: string) {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + key).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, 'aws4_request');
}
async function cognitoAdminRequest(target: string, payload: Record<string, unknown>, region: string, accessKey: string, secretKey: string) {
  const cleanRegion = region.replace(/https?:\/\//g, '').replace(/cognito-idp\./g, '').replace(/\.amazonaws\.com.*/g, '').replace(/\/.*/g, '').trim() || 'eu-central-1';
  const host = `cognito-idp.${cleanRegion}.amazonaws.com`;
  const body = JSON.stringify(payload);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const service = 'cognito-idp';
  const credentialScope = `${dateStamp}/${cleanRegion}/${service}/aws4_request`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-amz-json-1.1',
    Host: host,
    'X-Amz-Date': amzDate,
    'X-Amz-Target': target,
  };
  const sortedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaders.map((k) => `${k.toLowerCase()}:${headers[k]}\n`).join('');
  const signedHeaders = sortedHeaders.map((k) => k.toLowerCase()).join(';');
  const payloadHash = toHex(await sha256(body));
  const canonicalRequest = ['POST', '/', '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, toHex(await sha256(canonicalRequest))].join('\n');
  const signingKey = await getSignatureKey(secretKey, dateStamp, cleanRegion, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));
  headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(`https://${host}/`, { method: 'POST', headers, body });
  return { ok: response.ok, data: await response.json() };
}
async function deleteCognitoUser(email: string): Promise<void> {
  const region = process.env.AWS_COGNITO_REGION || process.env.VITE_AWS_COGNITO_REGION || 'eu-central-1';
  const userPoolId = process.env.AWS_COGNITO_USER_POOL_ID || process.env.VITE_AWS_COGNITO_USER_POOL_ID;
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!userPoolId || !accessKey || !secretKey) {
    logger.warn('[admin/delete-user] Cognito: config manquante, suppression Cognito ignorée');
    return;
  }
  try {
    const listResult = await cognitoAdminRequest(
      'AWSCognitoIdentityProviderService.ListUsers',
      { UserPoolId: userPoolId, Filter: `email = "${email}"`, Limit: 1 },
      region, accessKey, secretKey,
    );
    if (!listResult.ok || !listResult.data.Users || listResult.data.Users.length === 0) return;
    const cognitoUsername = listResult.data.Users[0].Username;
    await cognitoAdminRequest(
      'AWSCognitoIdentityProviderService.AdminDeleteUser',
      { UserPoolId: userPoolId, Username: cognitoUsername },
      region, accessKey, secretKey,
    );
  } catch (e) {
    logger.warn(`[admin/delete-user] Cognito exception: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─────────────────────────────────────────────────────────
// Helpers de suppression sûrs (ignorent table/colonne absente)
// ─────────────────────────────────────────────────────────
async function safeDelete(table: string, column: string, value: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
    if (error) {
      const code = (error as any)?.code as string | undefined;
      if (code === '42P01' || code === '42703') return;
      logger.warn(`[admin/delete-user] ${table}: ${error.message}`);
    }
  } catch (e: any) {
    logger.warn(`[admin/delete-user] ${table}: ${e?.message || e}`);
  }
}
async function safeDeleteByIds(table: string, column: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  try {
    const { error } = await supabaseAdmin.from(table).delete().in(column, ids);
    if (error) {
      const code = (error as any)?.code as string | undefined;
      if (code === '42P01' || code === '42703') return;
      logger.warn(`[admin/delete-user] ${table}: ${error.message}`);
    }
  } catch (e: any) {
    logger.warn(`[admin/delete-user] ${table}: ${e?.message || e}`);
  }
}

/**
 * POST /api/admin/delete-user
 * Body : { userId: string, force?: boolean }
 */
router.post('/delete-user', verifyJWT, requireRole(PDG_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actorId = req.user!.id;
    const { userId, force } = req.body || {};

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ success: false, error: 'userId requis' });
      return;
    }
    if (actorId === userId) {
      res.status(400).json({ success: false, error: 'Impossible de supprimer votre propre compte' });
      return;
    }

    const { data: userToDelete } = await supabaseAdmin
      .from('profiles').select('*').eq('id', userId).maybeSingle();

    // 🛡️ Protéger les comptes privilégiés (sauf force:true explicite)
    if (PROTECTED_ROLES.includes(((userToDelete as any)?.role || '').toLowerCase()) && force !== true) {
      logger.warn(`[admin/delete-user] Refusé (compte protégé): ${(userToDelete as any)?.email} [${(userToDelete as any)?.role}]`);
      res.status(403).json({
        success: false,
        protected: true,
        error: `Compte protégé (rôle « ${(userToDelete as any)?.role} »). Suppression refusée. Renvoyez "force": true pour confirmer.`,
      });
      return;
    }

    logger.info(`[admin/delete-user] Début suppression ${userId} (${(userToDelete as any)?.email || 'email inconnu'}) par ${actorId}`);

    // ===== ARCHIVAGE =====
    const { data: walletData } = await supabaseAdmin.from('wallets').select('*').eq('user_id', userId).maybeSingle();
    const { data: userIdsData } = await supabaseAdmin.from('user_ids').select('*').eq('user_id', userId).maybeSingle();

    let roleSpecificData: any = null;
    const role = (userToDelete as any)?.role;
    if (role === 'vendeur' || role === 'vendor') {
      const { data } = await supabaseAdmin.from('vendors').select('*').eq('user_id', userId).maybeSingle();
      roleSpecificData = data;
    } else if (role === 'driver' || role === 'livreur') {
      const { data } = await supabaseAdmin.from('delivery_drivers').select('*').eq('user_id', userId).maybeSingle();
      roleSpecificData = data;
    } else if (role === 'taxi') {
      const { data } = await supabaseAdmin.from('taxi_drivers').select('*').eq('user_id', userId).maybeSingle();
      roleSpecificData = data;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);

    const u = userToDelete as any;
    const { error: archiveError } = await supabaseAdmin.from('deleted_users_archive').insert({
      original_user_id: userId,
      email: u?.email || null,
      phone: u?.phone || null,
      full_name: u?.first_name && u?.last_name ? `${u.first_name} ${u.last_name}`.trim() : (u?.first_name || u?.last_name || null),
      role: u?.role || null,
      public_id: u?.public_id || null,
      profile_data: u || null,
      wallet_data: walletData || null,
      user_ids_data: userIdsData || null,
      role_specific_data: roleSpecificData || null,
      deletion_reason: 'Suppression via backend Node.js (admin)',
      deletion_method: 'node_backend',
      deleted_by: actorId,
      expires_at: expiresAt.toISOString(),
      original_created_at: u?.created_at || null,
      is_restored: false,
    });
    if (archiveError) logger.warn(`[admin/delete-user] Archivage échec (non bloquant): ${archiveError.message}`);

    // 🔔 Alerte audit
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: actorId,
        action: 'USER_DELETED',
        target_type: 'user',
        target_id: userId,
        data_json: { email: u?.email, role: u?.role, forced: force === true, via: 'node_backend' },
      });
    } catch (e) { logger.warn(`[admin/delete-user] audit insert: ${e instanceof Error ? e.message : String(e)}`); }

    // ===== SUPPRESSION CASCADE =====
    // Logs & audits
    await safeDelete('system_errors', 'user_id', userId);
    await safeDelete('audit_logs', 'actor_id', userId);
    await safeDelete('security_audit_logs', 'actor_id', userId);
    await safeDelete('communication_audit_logs', 'user_id', userId);
    await safeDelete('taxi_audit_logs', 'actor_id', userId);
    await safeDelete('vehicle_security_log', 'actor_id', userId);
    await safeDelete('inventory_history', 'user_id', userId);
    await safeDelete('secure_logs', 'user_id', userId);
    await safeDelete('fraud_detection_logs', 'user_id', userId);
    await safeDelete('delivery_logs', 'user_id', userId);
    await safeDelete('wallet_logs', 'user_id', userId);
    await safeDelete('transaction_audit_log', 'user_id', userId);
    if (u?.email) await safeDelete('auth_attempts_log', 'identifier', u.email);

    // Financier
    await safeDelete('wallet_transactions', 'user_id', userId);
    await safeDelete('wallet_suspicious_activities', 'user_id', userId);
    await safeDelete('wallet_idempotency_keys', 'user_id', userId);
    await safeDelete('wallets', 'user_id', userId);
    await safeDelete('virtual_cards', 'user_id', userId);
    await safeDelete('transactions', 'user_id', userId);
    await safeDelete('financial_transactions', 'user_id', userId);
    await safeDelete('financial_transactions', 'created_by', userId);
    await safeDelete('financial_ledger', 'actor_id', userId);
    await safeDelete('financial_quarantine', 'actor_id', userId);
    await safeDelete('moneroo_payments', 'user_id', userId);
    await safeDelete('payment_methods', 'user_id', userId);

    // Client
    const { data: customer } = await supabaseAdmin.from('customers').select('id').eq('user_id', userId).maybeSingle();
    if (customer) {
      await safeDelete('carts', 'customer_id', (customer as any).id);
      await safeDelete('customer_credits', 'customer_id', (customer as any).id);
      await safeDelete('customers', 'id', (customer as any).id);
    }
    await safeDelete('advanced_carts', 'user_id', userId);
    await safeDelete('wishlists', 'user_id', userId);
    await safeDelete('user_addresses', 'user_id', userId);
    await safeDelete('product_views', 'user_id', userId);
    await safeDelete('product_reviews', 'user_id', userId);
    await safeDelete('product_recommendations', 'user_id', userId);
    await safeDelete('user_product_interactions', 'user_id', userId);
    await safeDelete('digital_product_purchases', 'user_id', userId);

    // Vendeur
    const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('user_id', userId).maybeSingle();
    if (vendor) {
      const vendorId = (vendor as any).id;
      const { data: digitalProducts } = await supabaseAdmin.from('digital_products').select('id').eq('vendor_id', vendorId);
      if (digitalProducts && digitalProducts.length > 0) {
        await safeDeleteByIds('digital_product_purchases', 'product_id', digitalProducts.map((dp: any) => dp.id));
        await safeDelete('digital_products', 'vendor_id', vendorId);
      }
      const { data: vendorOrders } = await supabaseAdmin.from('orders').select('id').eq('vendor_id', vendorId);
      if (vendorOrders && vendorOrders.length > 0) {
        for (const o of vendorOrders as any[]) {
          await safeDelete('escrow_transactions', 'order_id', o.id);
          await safeDelete('order_items', 'order_id', o.id);
          await safeDelete('order_status_history', 'order_id', o.id);
          await safeDelete('delivery_tracking', 'order_id', o.id);
          await safeDelete('china_logistics', 'order_id', o.id);
          await safeDelete('payment_schedules', 'order_id', o.id);
        }
      }
      await safeDelete('dropship_orders', 'vendor_id', vendorId);
      await safeDelete('orders', 'vendor_id', vendorId);

      const { data: products } = await supabaseAdmin.from('products').select('id').eq('vendor_id', vendorId);
      if (products && products.length > 0) {
        for (const p of products as any[]) {
          await safeDelete('product_variants', 'product_id', p.id);
          await safeDelete('inventory', 'product_id', p.id);
          await safeDelete('product_images', 'product_id', p.id);
          await safeDelete('product_views', 'product_id', p.id);
          await safeDelete('product_reviews', 'product_id', p.id);
          await safeDelete('product_recommendations', 'product_id', p.id);
          await safeDelete('advanced_carts', 'product_id', p.id);
          await safeDelete('carts', 'product_id', p.id);
        }
      }
      await safeDelete('products', 'vendor_id', vendorId);
      await safeDelete('advanced_carts', 'vendor_id', vendorId);

      const { data: vendorServices } = await supabaseAdmin.from('professional_services').select('id').eq('vendor_id', vendorId);
      if (vendorServices && vendorServices.length > 0) {
        for (const ps of vendorServices as any[]) {
          await safeDelete('beauty_appointments', 'professional_service_id', ps.id);
          await safeDelete('beauty_services', 'professional_service_id', ps.id);
          await safeDelete('beauty_staff', 'professional_service_id', ps.id);
          await safeDelete('service_bookings', 'service_id', ps.id);
          await safeDelete('service_reviews', 'professional_service_id', ps.id);
          await safeDelete('service_subscriptions', 'professional_service_id', ps.id);
          await safeDelete('restaurant_menu_items', 'professional_service_id', ps.id);
          await safeDelete('restaurant_orders', 'professional_service_id', ps.id);
        }
        await safeDelete('professional_services', 'vendor_id', vendorId);
      }

      await safeDelete('vendor_settings', 'vendor_id', vendorId);
      await safeDelete('vendor_analytics', 'vendor_id', vendorId);
      await safeDelete('vendor_subscriptions', 'vendor_id', vendorId);
      await safeDelete('china_dropship_settings', 'vendor_id', vendorId);
      await safeDelete('china_dropship_reports', 'vendor_id', vendorId);
      await safeDelete('dropship_settings', 'vendor_id', vendorId);
      await safeDelete('service_products', 'vendor_id', vendorId);
      await safeDelete('quotes', 'vendor_id', vendorId);
      await safeDelete('invoices', 'vendor_id', vendorId);
      await safeDelete('contracts', 'vendor_id', vendorId);
      await safeDelete('deliveries', 'vendor_id', vendorId);
      await safeDelete('vendor_agents', 'vendor_id', vendorId);
      await safeDelete('vendor_employees', 'vendor_id', vendorId);
      await safeDelete('clients', 'vendor_id', vendorId);
      await safeDelete('prospects', 'vendor_id', vendorId);
      await safeDelete('promo_codes', 'vendor_id', vendorId);
      await safeDelete('support_tickets', 'vendor_id', vendorId);
      await safeDelete('short_links', 'vendor_id', vendorId);
      await safeDelete('ai_generated_documents', 'vendor_id', vendorId);
      await safeDelete('analytics_daily_stats', 'vendor_id', vendorId);
      await safeDelete('shop_visits_raw', 'vendor_id', vendorId);
      await safeDelete('product_views_raw', 'vendor_id', vendorId);
      await safeDelete('debts', 'created_by', userId);
      await safeDelete('vendors', 'id', vendorId);
    }

    // Services professionnels liés au user
    const { data: proServices } = await supabaseAdmin.from('professional_services').select('id').eq('user_id', userId);
    if (proServices && proServices.length > 0) {
      for (const ps of proServices as any[]) {
        await safeDelete('beauty_appointments', 'professional_service_id', ps.id);
        await safeDelete('beauty_services', 'professional_service_id', ps.id);
        await safeDelete('beauty_staff', 'professional_service_id', ps.id);
        await safeDelete('restaurant_menu_items', 'professional_service_id', ps.id);
        await safeDelete('restaurant_orders', 'professional_service_id', ps.id);
        await safeDelete('service_reviews', 'professional_service_id', ps.id);
        await safeDelete('service_subscriptions', 'professional_service_id', ps.id);
      }
      await safeDelete('professional_services', 'user_id', userId);
    }

    // Livreur
    const { data: driver } = await supabaseAdmin.from('delivery_drivers').select('id').eq('user_id', userId).maybeSingle();
    if (driver) {
      await safeDelete('deliveries', 'driver_id', (driver as any).id);
      await safeDelete('delivery_drivers', 'id', (driver as any).id);
    }
    await safeDelete('drivers', 'user_id', userId);
    await safeDelete('driver_subscriptions', 'user_id', userId);
    await safeDelete('driver_subscription_revenues', 'user_id', userId);
    await safeDelete('delivery_notifications', 'user_id', userId);

    // Taxi
    try { await supabaseAdmin.from('taxi_trips').delete().or(`driver_id.eq.${userId},client_id.eq.${userId}`); } catch { /* */ }
    await safeDelete('taxi_drivers', 'user_id', userId);
    await safeDelete('taxi_rides', 'user_id', userId);
    await safeDelete('taxi_ratings', 'user_id', userId);
    await safeDelete('taxi_notifications', 'user_id', userId);

    // Communications
    const { data: conversations } = await supabaseAdmin.from('conversation_participants').select('conversation_id').eq('user_id', userId);
    if (conversations && conversations.length > 0) {
      for (const c of conversations as any[]) await safeDelete('messages', 'conversation_id', c.conversation_id);
    }
    await safeDelete('conversation_participants', 'user_id', userId);
    try { await supabaseAdmin.from('calls').delete().or(`caller_id.eq.${userId},receiver_id.eq.${userId}`); } catch { /* */ }
    await safeDelete('communication_notifications', 'user_id', userId);
    await safeDelete('notifications', 'user_id', userId);
    await safeDelete('push_notifications', 'user_id', userId);

    // Agent
    const { data: agentMgmt } = await supabaseAdmin.from('agents_management').select('id').eq('user_id', userId);
    if (agentMgmt && agentMgmt.length > 0) {
      for (const a of agentMgmt as any[]) {
        await safeDelete('agent_affiliate_commissions', 'agent_id', a.id);
        await safeDelete('agent_affiliate_links', 'agent_id', a.id);
        await safeDelete('agent_commissions_log', 'agent_id', a.id);
        await safeDelete('agent_created_users', 'agent_id', a.id);
        await safeDelete('agent_invitations', 'agent_id', a.id);
        await safeDelete('agent_permissions', 'agent_id', a.id);
        await safeDelete('agent_wallets', 'agent_id', a.id);
      }
    }

    // Divers
    await safeDelete('user_ids', 'user_id', userId);
    await safeDelete('user_roles', 'user_id', userId);
    await safeDelete('user_contacts', 'user_id', userId);
    await safeDelete('user_analytics', 'user_id', userId);
    await safeDelete('user_agent_affiliations', 'user_id', userId);
    await safeDelete('trackings', 'user_id', userId);
    await safeDelete('subscriptions', 'user_id', userId);
    await safeDelete('service_subscriptions', 'user_id', userId);
    await safeDelete('service_subscription_payments', 'user_id', userId);
    await safeDelete('support_tickets', 'requester_id', userId);
    await safeDelete('mfa_verifications', 'user_id', userId);
    await safeDelete('generated_reports', 'user_id', userId);
    await safeDelete('custom_report_templates', 'user_id', userId);
    await safeDelete('performance_metrics', 'user_id', userId);
    await safeDelete('professional_services', 'user_id', userId);
    await safeDelete('warehouse_permissions', 'user_id', userId);
    await safeDelete('soc_analysts', 'user_id', userId);
    await safeDelete('vendor_employees', 'user_id', userId);
    await safeDelete('vendor_agents', 'user_id', userId);
    await safeDelete('agent_created_users', 'user_id', userId);
    await safeDelete('agents', 'user_id', userId);
    await safeDelete('agents_management', 'user_id', userId);
    await safeDelete('api_keys', 'user_id', userId);
    await safeDelete('revenus_pdg', 'user_id', userId);
    await safeDelete('pdg_management', 'user_id', userId);
    await safeDelete('broadcast_recipients', 'user_id', userId);
    await safeDelete('card_transactions', 'user_id', userId);
    await safeDelete('djomy_payments', 'user_id', userId);
    await safeDelete('djomy_transactions', 'user_id', userId);
    await safeDelete('secure_transactions', 'user_id', userId);
    await safeDelete('security_events', 'user_id', userId);
    await safeDelete('product_views_raw', 'user_id', userId);
    await safeDelete('phone_history', 'user_id', userId);
    await safeDelete('ai_generated_documents', 'user_id', userId);
    await safeDelete('location_access', 'user_id', userId);
    await safeDelete('message_read_receipts', 'user_id', userId);
    await safeDelete('idempotency_keys', 'user_id', userId);
    await safeDelete('id_normalization_logs', 'user_id', userId);
    await safeDelete('dropship_activity_logs', 'user_id', userId);
    await safeDelete('financial_audit_logs', 'user_id', userId);
    await safeDelete('financial_security_alerts', 'user_id', userId);
    if (u?.email) await safeDelete('bug_reports', 'reporter_email', u.email);

    // Profil
    await safeDelete('profiles', 'id', userId);

    // Nettoyage dynamique des FK restantes + storage (best-effort, RPC)
    try { await supabaseAdmin.rpc('cleanup_user_references', { target_user_id: userId }); }
    catch (e) { logger.warn(`[admin/delete-user] cleanup_user_references: ${e instanceof Error ? e.message : String(e)}`); }
    try { await supabaseAdmin.rpc('delete_user_storage_objects', { target_user_id: userId }); }
    catch (e) { logger.warn(`[admin/delete-user] storage cleanup: ${e instanceof Error ? e.message : String(e)}`); }

    // Cognito
    const userEmail = u?.email;
    if (userEmail) {
      await deleteCognitoUser(userEmail);
    } else {
      try {
        const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authUserData?.user?.email) await deleteCognitoUser(authUserData.user.email);
      } catch { /* */ }
    }

    // Auth Supabase
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      logger.error(`[admin/delete-user] Erreur suppression auth: ${deleteError.message}`);
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUser?.user) {
        res.status(200).json({
          success: false,
          error: `Impossible de supprimer le compte auth: ${deleteError.message}. Des données liées existent peut-être encore.`,
        });
        return;
      }
    }

    logger.info(`[admin/delete-user] ✅ Utilisateur ${userId} (${userEmail}) supprimé`);
    res.status(200).json({ success: true, message: 'Utilisateur et toutes ses données supprimés' });
  } catch (error: any) {
    logger.error(`[admin/delete-user] Erreur: ${error.message}`);
    res.status(200).json({ success: false, error: error.message || 'Erreur inconnue' });
  }
});

export default router;
