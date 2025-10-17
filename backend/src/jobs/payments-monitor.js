/**
 * 💰 MONITORING PAIEMENTS - 224SOLUTIONS
 * Job de surveillance des paiements en attente et génération d'alertes
 */

const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

// Configuration Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration des alertes
const ALERT_CONFIG = {
  pending_threshold_hours: 48,
  critical_threshold_hours: 72,
  max_alerts_per_day: 10,
  notification_channels: ['email', 'slack', 'dashboard']
};

// =====================================================
// 1. JOB PRINCIPAL DE MONITORING
// =====================================================

/**
 * Job de monitoring des paiements en attente
 */
async function monitorPendingPayments() {
  console.log('🔍 Début du monitoring des paiements...');
  
  try {
    // Récupérer les paiements en attente depuis plus de 48h
    const { data: pendingPayments, error } = await supabase
      .from('payment_links')
      .select(`
        *,
        vendeur:profiles!payment_links_vendeur_id_fkey(id, first_name, last_name, business_name, email),
        client:profiles!payment_links_client_id_fkey(id, first_name, last_name, email)
      `)
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - ALERT_CONFIG.pending_threshold_hours * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('❌ Erreur récupération paiements:', error);
      return;
    }

    console.log(`📊 ${pendingPayments.length} paiements en attente depuis plus de ${ALERT_CONFIG.pending_threshold_hours}h`);

    // Traiter chaque paiement en attente
    for (const payment of pendingPayments) {
      await processPendingPayment(payment);
    }

    // Générer un rapport de monitoring
    await generateMonitoringReport(pendingPayments);

    console.log('✅ Monitoring des paiements terminé');

  } catch (error) {
    console.error('❌ Erreur monitoring paiements:', error);
  }
}

/**
 * Traite un paiement en attente
 */
async function processPendingPayment(payment) {
  try {
    const hoursPending = Math.floor((Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60));
    
    // Déterminer le niveau d'alerte
    let alertLevel = 'warning';
    if (hoursPending >= ALERT_CONFIG.critical_threshold_hours) {
      alertLevel = 'critical';
    }

    // Vérifier si une alerte existe déjà
    const { data: existingAlert } = await supabase
      .from('payment_alerts')
      .select('id')
      .eq('payment_id', payment.id)
      .eq('status', 'active')
      .single();

    if (existingAlert) {
      console.log(`⚠️ Alerte déjà existante pour le paiement ${payment.id}`);
      return;
    }

    // Créer l'alerte
    const alert = {
      payment_id: payment.id,
      vendeur_id: payment.vendeur_id,
      client_id: payment.client_id,
      alert_level: alertLevel,
      hours_pending: hoursPending,
      amount: payment.montant,
      currency: payment.devise,
      status: 'active',
      created_at: new Date().toISOString()
    };

    const { data: alertData, error: alertError } = await supabase
      .from('payment_alerts')
      .insert(alert)
      .select()
      .single();

    if (alertError) {
      console.error('❌ Erreur création alerte:', alertError);
      return;
    }

    // Envoyer les notifications
    await sendPaymentAlertNotifications(alertData, payment);

    console.log(`🚨 Alerte créée pour le paiement ${payment.id} (${hoursPending}h en attente)`);

  } catch (error) {
    console.error('❌ Erreur traitement paiement:', error);
  }
}

/**
 * Envoie les notifications d'alerte
 */
async function sendPaymentAlertNotifications(alert, payment) {
  try {
    // Notification par email au vendeur
    if (payment.vendeur?.email) {
      await sendEmailNotification(alert, payment);
    }

    // Notification Slack (si configuré)
    if (process.env.SLACK_WEBHOOK_URL) {
      await sendSlackNotification(alert, payment);
    }

    // Notification dashboard (enregistrement en base)
    await recordDashboardNotification(alert, payment);

  } catch (error) {
    console.error('❌ Erreur envoi notifications:', error);
  }
}

/**
 * Envoie une notification par email
 */
async function sendEmailNotification(alert, payment) {
  try {
    const subject = `🚨 Alerte Paiement - ${payment.vendeur?.business_name || 'Vendeur'}`;
    const content = `
      <h2>🚨 Alerte Paiement en Attente</h2>
      <p><strong>Paiement ID:</strong> ${payment.id}</p>
      <p><strong>Montant:</strong> ${payment.montant} ${payment.devise}</p>
      <p><strong>Client:</strong> ${payment.client?.first_name || 'N/A'} ${payment.client?.last_name || ''}</p>
      <p><strong>Durée en attente:</strong> ${alert.hours_pending} heures</p>
      <p><strong>Niveau d'alerte:</strong> ${alert.alert_level.toUpperCase()}</p>
      <p><strong>Action recommandée:</strong> Contacter le client pour finaliser le paiement</p>
    `;

    // Enregistrer l'email en base (pour envoi par un service externe)
    await supabase
      .from('notification_queue')
      .insert({
        type: 'email',
        recipient: payment.vendeur.email,
        subject: subject,
        content: content,
        priority: alert.alert_level === 'critical' ? 'high' : 'medium',
        status: 'pending'
      });

    console.log(`📧 Email d'alerte enregistré pour ${payment.vendeur.email}`);

  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
  }
}

/**
 * Envoie une notification Slack
 */
async function sendSlackNotification(alert, payment) {
  try {
    const slackMessage = {
      text: `🚨 Alerte Paiement - ${payment.vendeur?.business_name || 'Vendeur'}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Paiement en attente depuis ${alert.hours_pending}h*\n` +
                  `💰 Montant: ${payment.montant} ${payment.devise}\n` +
                  `👤 Client: ${payment.client?.first_name || 'N/A'} ${payment.client?.last_name || ''}\n` +
                  `🔴 Niveau: ${alert.alert_level.toUpperCase()}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Voir le paiement'
              },
              url: `${process.env.APP_URL}/admin/payments/${payment.id}`
            }
          ]
        }
      ]
    };

    // Enregistrer la notification Slack en base
    await supabase
      .from('notification_queue')
      .insert({
        type: 'slack',
        recipient: 'admin-channel',
        content: JSON.stringify(slackMessage),
        priority: alert.alert_level === 'critical' ? 'high' : 'medium',
        status: 'pending'
      });

    console.log('📱 Notification Slack enregistrée');

  } catch (error) {
    console.error('❌ Erreur notification Slack:', error);
  }
}

/**
 * Enregistre une notification dashboard
 */
async function recordDashboardNotification(alert, payment) {
  try {
    await supabase
      .from('dashboard_notifications')
      .insert({
        type: 'payment_alert',
        title: `Paiement en attente - ${payment.vendeur?.business_name || 'Vendeur'}`,
        message: `Paiement de ${payment.montant} ${payment.devise} en attente depuis ${alert.hours_pending}h`,
        priority: alert.alert_level,
        metadata: {
          payment_id: payment.id,
          alert_id: alert.id,
          vendeur_id: payment.vendeur_id,
          client_id: payment.client_id
        },
        is_read: false,
        created_at: new Date().toISOString()
      });

    console.log('📊 Notification dashboard enregistrée');

  } catch (error) {
    console.error('❌ Erreur notification dashboard:', error);
  }
}

/**
 * Génère un rapport de monitoring
 */
async function generateMonitoringReport(pendingPayments) {
  try {
    const totalPending = pendingPayments.length;
    const criticalPending = pendingPayments.filter(p => 
      Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60)) >= ALERT_CONFIG.critical_threshold_hours
    ).length;

    const totalAmount = pendingPayments.reduce((sum, p) => sum + Number(p.montant || 0), 0);

    const report = {
      date: new Date().toISOString(),
      total_pending_payments: totalPending,
      critical_pending_payments: criticalPending,
      total_pending_amount: totalAmount,
      average_pending_hours: totalPending > 0 ? 
        pendingPayments.reduce((sum, p) => sum + Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60)), 0) / totalPending : 0
    };

    // Enregistrer le rapport
    await supabase
      .from('monitoring_reports')
      .insert({
        report_type: 'payments_monitoring',
        report_data: report,
        created_at: new Date().toISOString()
      });

    console.log(`📈 Rapport généré: ${totalPending} paiements en attente, ${criticalPending} critiques`);

  } catch (error) {
    console.error('❌ Erreur génération rapport:', error);
  }
}

// =====================================================
// 2. CRON JOBS
// =====================================================

// Job de monitoring toutes les 2 heures
cron.schedule('0 */2 * * *', async () => {
  console.log('🕐 Démarrage du job de monitoring des paiements...');
  await monitorPendingPayments();
});

// Job de nettoyage des alertes anciennes (quotidien)
cron.schedule('0 2 * * *', async () => {
  console.log('🧹 Nettoyage des alertes anciennes...');
  await cleanupOldAlerts();
});

// =====================================================
// 3. FONCTIONS UTILITAIRES
// =====================================================

/**
 * Nettoie les alertes anciennes
 */
async function cleanupOldAlerts() {
  try {
    // Marquer comme résolues les alertes de plus de 7 jours
    await supabase
      .from('payment_alerts')
      .update({ status: 'resolved' })
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .eq('status', 'active');

    console.log('✅ Alertes anciennes nettoyées');

  } catch (error) {
    console.error('❌ Erreur nettoyage alertes:', error);
  }
}

/**
 * Force le monitoring (pour les tests)
 */
async function forceMonitoring() {
  console.log('🔧 Monitoring forcé...');
  await monitorPendingPayments();
}

// Export des fonctions pour les tests
module.exports = {
  monitorPendingPayments,
  processPendingPayment,
  sendPaymentAlertNotifications,
  cleanupOldAlerts,
  forceMonitoring
};
