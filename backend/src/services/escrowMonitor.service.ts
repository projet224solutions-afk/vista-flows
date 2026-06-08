/**
 * 🩺 SURVEILLANCE PLATEFORME (escrow/conversion + abonnements + …)
 *
 * Framework générique : chaque DOMAINE expose une RPC `<x>_monitor_report()` renvoyant
 * { generated_at, checks:[{key,label,severity,count,observed}] }. runDomainMonitor() lance la RPC et
 * synchronise les alertes dans system_alerts (1 alerte 'active' par contrôle en anomalie, AUTO-RÉSOLUE
 * quand count=0, dédup via metadata->>'alert_key'). runPlatformMonitors() lance tous les domaines.
 * Appelé par l'endpoint PDG et par le cycle 24/7.
 */

import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

export interface MonitorCheck {
  key: string;
  label: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  observed: number;
}
export interface MonitorReport {
  generated_at: string;
  checks: MonitorCheck[];
  overall: 'ok' | 'warning' | 'critical';
}

interface DomainDef { key: string; module: string; label: string; rpc: string; }

// Registre des domaines surveillés — pour en ajouter un : créer la RPC <x>_monitor_report() et l'ajouter ici.
export const MONITOR_DOMAINS: DomainDef[] = [
  { key: 'escrow', module: 'escrow', label: 'Escrow & Conversion', rpc: 'escrow_monitor_report' },
  { key: 'subscription', module: 'subscription', label: 'Abonnements', rpc: 'subscription_monitor_report' },
  { key: 'transfer', module: 'transfer', label: 'Transferts', rpc: 'transfer_monitor_report' },
  { key: 'commission', module: 'commission', label: 'Commissions', rpc: 'commission_monitor_report' },
  { key: 'order', module: 'order', label: 'Commandes', rpc: 'order_monitor_report' },
  { key: 'wallet', module: 'wallet', label: 'Wallet (dépôts/retraits)', rpc: 'wallet_monitor_report' },
  { key: 'pos', module: 'pos', label: 'POS (caisse vendeur)', rpc: 'pos_monitor_report' },
  { key: 'aml', module: 'aml', label: 'Provenance & plafonds wallet', rpc: 'wallet_provenance_report' },
];

const SUGGESTED_FIX: Record<string, string> = {
  // escrow
  non_converted_releases: 'Libération ayant contourné le RPC (Edge cassée). Vérifier que confirm-delivery/request-refund déployées sont supprimées.',
  net_mismatch: 'Ligne wallet_transactions violant net = montant − frais. Vérifier les inserts de libération/remboursement.',
  currency_mismatch: 'Devise de libération ≠ devise escrow. Vérifier release_escrow_to_seller.',
  released_no_ledger: 'Escrow libéré sans transaction d\'historique. Vérifier l\'atomicité.',
  held_overdue: 'Escrows échus non libérés. Vérifier le cron escrow.auto-release.',
  stale_rates: 'Taux BCRG non rafraîchis > 24h. Relancer le scraping BCRG.',
  rapid_ops: 'Volume anormal d\'opérations escrow/remboursement en 5 min. Vérifier une attaque/abus.',
  escrow_amount_mismatch: 'Escrow > montant produit : la commission acheteur s\'est glissée dans l\'escrow (vendeur sur-payé). Vérifier que orders.routes met escrow.amount = subtotal.',
  // abonnements
  sub_expired_active_vendor: 'Abonnements vendeur expirés encore actifs. Vérifier le cron subscriptions.expire-check.',
  sub_expired_active_driver: 'Abonnements chauffeur expirés encore actifs. Vérifier l\'expiration des driver_subscriptions.',
  sub_expired_active_service: 'Abonnements service expirés encore actifs. Vérifier l\'expiration des service_subscriptions.',
  sub_active_no_period: 'Abonnement actif sans date de fin. Corriger la donnée / la création d\'abonnement.',
  sub_creation_spike: 'Création d\'abonnements en rafale. Vérifier un abus / une attaque.',
  // transferts
  transfer_stuck: 'Transfert sortant bloqué en attente > 1h. Vérifier le traitement / le provider mobile money.',
  transfer_orphan: 'Transfert sortant sans destinataire. Vérifier la création du transfert (leg manquant).',
  transfer_nonpositive: 'Transfert au montant ≤ 0. Vérifier la validation des montants.',
  transfer_rapid: 'Volume anormal de transferts en 5 min. Vérifier une attaque / un blanchiment.',
  // commissions
  commission_revenue_gap: 'Commission acheteur prélevée mais absente de revenus_pdg. Vérifier le log backend record_pdg_revenue.',
  agent_bad_rate: 'Taux de commission agent hors [0,100]. Corriger la configuration de l\'agent.',
  revenue_nonpositive: 'Revenu PDG ≤ 0 enregistré. Vérifier la source du revenu.',
  agent_commission_leak: 'GRAVE : commission agent > base (frais). Vérifier le plafond dans credit_agent_commission et max_total_agent_commission_percentage.',
  agent_commission_nonpositive: 'Commission agent ≤ 0 enregistrée. Vérifier le calcul des taux globaux (pdg_settings).',
  agent_commission_duplicate: 'Doublon (agent, transaction) : l\'index unique idx_agent_commissions_log_unique_transaction est-il présent ? Brèche d\'idempotence.',
  agent_commission_rapid: 'Rafale de commissions agent en 5 min. Vérifier un abus/attaque (transactions répétées d\'un même affilié).',
  agent_wallet_drift: 'agent_wallets ≠ somme des commissions loggées : crédit non tracé (chemin hors credit_agent_wallet_gnf) ou manipulation. Réconcilier.',
  order_paid_no_escrow: 'Commande payée sans escrow : le séquestre n\'a pas été créé. Vérifier create_order_core (insertion escrow) — risque vendeur non payé / argent bloqué.',
  order_duplicate_payment_intent: 'GRAVE : 2 commandes pour 1 paiement. L\'index unique uniq_orders_payment_intent est-il présent ? Webhook paiement rejoué.',
  order_negative_stock: 'Stock produit négatif : décrément concurrent incohérent. Vérifier le verrou FOR UPDATE / GREATEST(0,...) dans create_order_core.',
  order_rapid: 'Rafale de commandes en 5 min : possible bot/attaque. Vérifier le rate-limit de création de commande.',
  order_nonpositive: 'Commande au montant total ≤ 0. Vérifier la validation des montants (subtotal/total_amount).',
  wallet_negative_balance: 'GRAVE : wallet au solde négatif. Bug de sur-débit / course. Vérifier l\'optimistic lock dans debitWallet et corriger le solde.',
  wallet_duplicate_deposit: 'Dépôt dupliqué (même référence) : double-crédit. Vérifier le verrou idempotence insert-first de creditWallet et la clé d\'idempotence du provider.',
  wallet_rapid_withdraw: 'Rafale de retraits en 5 min : possible drainage/attaque. Vérifier le rate-limit et l\'activité suspecte.',
  wallet_suspicious_critical: 'Activité suspecte critique détectée (volume/fréquence). Examiner wallet_suspicious_activities et bloquer si besoin.',
  wallet_large_withdraw: 'Retrait de montant très élevé. Vérifier la légitimité (KYC, source des fonds).',
  // pos
  pos_stock_pending: 'Vente POS enregistrée sans décrément de stock (file pos_stock_reconciliation). Relancer le job de réconciliation ; risque de sur-vente.',
  pos_negative_stock: 'GRAVE : produit au stock négatif. Décrément concurrent incohérent. Vérifier le verrou FOR UPDATE / GREATEST(0,...) dans create_pos_sale_complete et le trigger commande.',
  pos_sale_incoherent: 'Vente POS dont total ≠ sous-total + taxe − remise. Vérifier le calcul server-side (create_pos_sale_complete) — un total client a pu être stocké à la place.',
  pos_credit_overdue: 'Ventes à crédit échues impayées. Relancer le recouvrement vendeur (vendor_credit_sales).',
  pos_rapid_sales: 'Rafale de ventes POS en 5 min. Vérifier un bot / abus de synchronisation (posSyncRateLimit).',
  // aml (provenance & plafonds wallet)
  untraced_increase: 'GRAVE : un solde wallet a augmenté SANS transaction correspondante = argent injecté hors circuit (manip DB / bypass de credit_user_wallet_safe). Auditer wallet_balance_audit, geler le wallet et investiguer immédiatement.',
  wallet_over_cap: 'Wallet dont le solde dépasse le plafond de détention de son rôle × palier KYC. Examiner la provenance : monter le KYC, relever le plafond (override) si légitime, ou geler/mettre en quarantaine.',
  quarantine_pending: 'Fonds en quarantaine (crédit au-dessus du plafond) en attente. Examiner la provenance puis libérer (KYC/override) ou rejeter depuis le panneau PDG « Provenance & plafonds ».',
  quarantine_stale: 'Quarantaine non traitée depuis > 7 jours. Décider (libérer ou rejeter) — l\'utilisateur attend ses fonds.',
};

function computeOverall(checks: MonitorCheck[]): 'ok' | 'warning' | 'critical' {
  if (checks.some((c) => c.count > 0 && c.severity === 'critical')) return 'critical';
  if (checks.some((c) => c.count > 0)) return 'warning';
  return 'ok';
}

/** Lance la RPC d'un domaine et synchronise ses alertes dans system_alerts. */
export async function runDomainMonitor(rpcName: string, module: string): Promise<MonitorReport> {
  const { data, error } = await supabaseAdmin.rpc(rpcName);
  if (error) {
    logger.error(`[Monitor:${module}] RPC ${rpcName} failed: ${error.message}`);
    throw new Error(error.message);
  }
  const report = data as { generated_at: string; checks: MonitorCheck[] };
  const checks = report.checks || [];
  const nowIso = new Date().toISOString();

  for (const c of checks) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('system_alerts')
        .select('id')
        .eq('module', module)
        .eq('status', 'active')
        .filter('metadata->>alert_key', 'eq', c.key)
        .maybeSingle();

      if (c.count > 0) {
        const payload = {
          title: `[${module}] ${c.label}`,
          message: `${c.count} cas détecté(s) (${c.severity}).`,
          severity: c.severity,
          module,
          status: 'active',
          suggested_fix: SUGGESTED_FIX[c.key] || '',
          metadata: { alert_key: c.key, count: c.count, observed: c.observed, source: 'platform_monitor', last_seen: nowIso },
        };
        if (existing) await supabaseAdmin.from('system_alerts').update(payload).eq('id', existing.id);
        else await supabaseAdmin.from('system_alerts').insert(payload);
      } else if (existing) {
        await supabaseAdmin.from('system_alerts')
          .update({ status: 'resolved', resolved_at: nowIso })
          .eq('id', existing.id);
      }
    } catch (e: any) {
      logger.warn(`[Monitor:${module}] alert sync failed (${c.key}): ${e?.message || e}`);
    }
  }

  return { generated_at: report.generated_at, checks, overall: computeOverall(checks) };
}

/** Lance tous les domaines + renvoie leurs rapports et les alertes associées. */
export async function runPlatformMonitors(): Promise<{
  domains: { key: string; label: string; report: MonitorReport }[];
  alerts: any[];
}> {
  const domains: { key: string; label: string; report: MonitorReport }[] = [];
  for (const d of MONITOR_DOMAINS) {
    try {
      const report = await runDomainMonitor(d.rpc, d.module);
      domains.push({ key: d.key, label: d.label, report });
    } catch (e: any) {
      logger.warn(`[Monitor] domaine ${d.key} échoué: ${e?.message || e}`);
      domains.push({ key: d.key, label: d.label, report: { generated_at: new Date().toISOString(), checks: [], overall: 'ok' } });
    }
  }

  const modules = MONITOR_DOMAINS.map((d) => d.module);
  const { data: alerts } = await supabaseAdmin
    .from('system_alerts')
    .select('id, title, message, severity, status, module, suggested_fix, created_at, metadata')
    .in('module', modules)
    .order('created_at', { ascending: false })
    .limit(60);

  return { domains, alerts: alerts || [] };
}

/** Compat : surveillance escrow seule. */
export async function runEscrowMonitor(): Promise<MonitorReport> {
  return runDomainMonitor('escrow_monitor_report', 'escrow');
}
