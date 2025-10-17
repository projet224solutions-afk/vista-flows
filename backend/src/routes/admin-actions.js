/**
 * ⚠️ ACTIONS ADMINISTRATIVES - 224SOLUTIONS
 * Endpoints pour les actions destructrices avec confirmation double
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuration Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =====================================================
// 1. EXÉCUTION D'ACTIONS DESTRUCTRICES
// =====================================================

/**
 * POST /admin/actions/execute
 * Exécute une action destructrice avec confirmation double
 */
router.post('/execute', async (req, res) => {
  try {
    const { 
      action, 
      target_id, 
      target_type, 
      confirmation_data,
      user_id,
      password 
    } = req.body;

    // Vérifier l'en-tête de confirmation
    if (req.headers['x-confirmed'] !== 'true') {
      return res.status(400).json({ 
        error: 'Confirmation requise' 
      });
    }

    // Vérifier l'authentification de l'utilisateur
    if (!user_id) {
      return res.status(401).json({ 
        error: 'Utilisateur non authentifié' 
      });
    }

    // Vérifier le mot de passe si fourni
    if (password) {
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('password_hash')
        .eq('id', user_id)
        .single();

      if (userError || !user) {
        return res.status(401).json({ 
          error: 'Utilisateur non trouvé' 
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: 'Mot de passe incorrect' 
        });
      }
    }

    // Enregistrer l'audit avant l'action
    const auditLog = {
      user_id,
      action: `admin_${action}`,
      target_type,
      target_id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      confirmation_data,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data: auditData, error: auditError } = await supabase
      .from('admin_audit_logs')
      .insert(auditLog)
      .select()
      .single();

    if (auditError) {
      console.error('Erreur enregistrement audit:', auditError);
      return res.status(500).json({ 
        error: 'Erreur enregistrement audit' 
      });
    }

    // Exécuter l'action selon le type
    let result;
    try {
      switch (action) {
        case 'suspend_user':
          result = await suspendUser(target_id, user_id);
          break;
        case 'delete_user':
          result = await deleteUser(target_id, user_id);
          break;
        case 'suspend_vendor':
          result = await suspendVendor(target_id, user_id);
          break;
        case 'delete_vendor':
          result = await deleteVendor(target_id, user_id);
          break;
        case 'rollback_transaction':
          result = await rollbackTransaction(target_id, user_id);
          break;
        case 'suspend_payment':
          result = await suspendPayment(target_id, user_id);
          break;
        case 'delete_payment':
          result = await deletePayment(target_id, user_id);
          break;
        case 'system_rollback':
          result = await systemRollback(target_id, user_id);
          break;
        default:
          throw new Error(`Action non supportée: ${action}`);
      }

      // Mettre à jour l'audit avec le succès
      await supabase
        .from('admin_audit_logs')
        .update({ 
          status: 'completed',
          result_data: result,
          completed_at: new Date().toISOString()
        })
        .eq('id', auditData.id);

      res.json({
        success: true,
        message: `Action ${action} exécutée avec succès`,
        audit_id: auditData.id,
        result
      });

    } catch (actionError) {
      console.error(`Erreur exécution action ${action}:`, actionError);
      
      // Mettre à jour l'audit avec l'erreur
      await supabase
        .from('admin_audit_logs')
        .update({ 
          status: 'failed',
          error_message: actionError.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', auditData.id);

      res.status(500).json({
        error: `Erreur exécution action: ${actionError.message}`
      });
    }

  } catch (error) {
    console.error('Erreur action administrative:', error);
    res.status(500).json({ 
      error: 'Erreur serveur interne' 
    });
  }
});

// =====================================================
// 2. ACTIONS SPÉCIFIQUES
// =====================================================

/**
 * Suspendre un utilisateur
 */
async function suspendUser(userId, adminId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      is_active: false,
      suspended_at: new Date().toISOString(),
      suspended_by: adminId
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  return {
    action: 'user_suspended',
    user_id: userId,
    suspended_by: adminId,
    suspended_at: new Date().toISOString()
  };
}

/**
 * Supprimer un utilisateur
 */
async function deleteUser(userId, adminId) {
  // D'abord suspendre l'utilisateur
  await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId);

  // Puis supprimer (soft delete)
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      deleted_at: new Date().toISOString(),
      deleted_by: adminId
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  return {
    action: 'user_deleted',
    user_id: userId,
    deleted_by: adminId,
    deleted_at: new Date().toISOString()
  };
}

/**
 * Suspendre un vendeur
 */
async function suspendVendor(vendorId, adminId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      is_active: false,
      vendor_suspended_at: new Date().toISOString(),
      vendor_suspended_by: adminId
    })
    .eq('id', vendorId)
    .eq('role', 'vendeur')
    .select()
    .single();

  if (error) throw error;

  return {
    action: 'vendor_suspended',
    vendor_id: vendorId,
    suspended_by: adminId,
    suspended_at: new Date().toISOString()
  };
}

/**
 * Supprimer un vendeur
 */
async function deleteVendor(vendorId, adminId) {
  // D'abord suspendre le vendeur
  await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', vendorId)
    .eq('role', 'vendeur');

  // Puis supprimer (soft delete)
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      deleted_at: new Date().toISOString(),
      deleted_by: adminId
    })
    .eq('id', vendorId)
    .eq('role', 'vendeur')
    .select()
    .single();

  if (error) throw error;

  return {
    action: 'vendor_deleted',
    vendor_id: vendorId,
    deleted_by: adminId,
    deleted_at: new Date().toISOString()
  };
}

/**
 * Annuler une transaction
 */
async function rollbackTransaction(transactionId, adminId) {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .update({ 
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: adminId
    })
    .eq('transaction_id', transactionId)
    .select()
    .single();

  if (error) throw error;

  return {
    action: 'transaction_rolled_back',
    transaction_id: transactionId,
    rolled_back_by: adminId,
    rolled_back_at: new Date().toISOString()
  };
}

/**
 * Suspendre un paiement
 */
async function suspendPayment(paymentId, adminId) {
  const { data, error } = await supabase
    .from('payment_links')
    .update({ 
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_by: adminId
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;

  return {
    action: 'payment_suspended',
    payment_id: paymentId,
    suspended_by: adminId,
    suspended_at: new Date().toISOString()
  };
}

/**
 * Supprimer un paiement
 */
async function deletePayment(paymentId, adminId) {
  const { data, error } = await supabase
    .from('payment_links')
    .update({ 
      status: 'deleted',
      deleted_at: new Date().toISOString(),
      deleted_by: adminId
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;

  return {
    action: 'payment_deleted',
    payment_id: paymentId,
    deleted_by: adminId,
    deleted_at: new Date().toISOString()
  };
}

/**
 * Rollback système
 */
async function systemRollback(rollbackId, adminId) {
  // Implémentation du rollback système
  // Cette fonction serait implémentée selon les besoins spécifiques
  
  return {
    action: 'system_rollback',
    rollback_id: rollbackId,
    executed_by: adminId,
    executed_at: new Date().toISOString()
  };
}

// =====================================================
// 3. AUDIT ET HISTORIQUE
// =====================================================

/**
 * GET /admin/actions/audit
 * Récupère l'historique des actions administratives
 */
router.get('/audit', async (req, res) => {
  try {
    const { limit = 50, offset = 0, action, user_id } = req.query;

    let query = supabase
      .from('admin_audit_logs')
      .select(`
        *,
        actor:profiles!admin_audit_logs_user_id_fkey(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    if (action) {
      query = query.eq('action', action);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur récupération audit:', error);
      return res.status(500).json({ 
        error: 'Erreur récupération audit' 
      });
    }

    res.json({
      success: true,
      audit_logs: data || [],
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Erreur récupération audit:', error);
    res.status(500).json({ 
      error: 'Erreur serveur interne' 
    });
  }
});

module.exports = router;
