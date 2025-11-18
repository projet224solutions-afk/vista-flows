/**
 * 🔒 API ADMIN - AUDIT ET SÉCURITÉ
 * Endpoint pour récupérer les logs d'audit et de sécurité
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { type, limit = 50 } = req.query;

    if (type === 'audit') {
      // Récupérer les logs d'audit
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select(`
          *,
          actor:profiles!audit_logs_actor_id_fkey(id, first_name, last_name, business_name)
        `)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (auditError) {
        console.error('Erreur récupération audit:', auditError);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      res.status(200).json({
        success: true,
        audit_logs: auditLogs || []
      });

    } else if (type === 'fraud') {
      // Récupérer les logs de fraude
      const { data: fraudLogs, error: fraudError } = await supabase
        .from('fraud_detection_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (fraudError) {
        console.error('Erreur récupération fraude:', fraudError);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      res.status(200).json({
        success: true,
        fraud_logs: fraudLogs || []
      });

    } else {
      // Récupérer les deux types
      const [{ data: auditLogs, error: auditError }, { data: fraudLogs, error: fraudError }] = await Promise.all([
        supabase
          .from('audit_logs')
          .select(`
            *,
            actor:profiles!audit_logs_actor_id_fkey(id, first_name, last_name, business_name)
          `)
          .order('created_at', { ascending: false })
          .limit(parseInt(limit)),
        supabase
          .from('fraud_detection_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(parseInt(limit))
      ]);

      if (auditError || fraudError) {
        console.error('Erreur récupération sécurité:', { auditError, fraudError });
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      res.status(200).json({
        success: true,
        audit_logs: auditLogs || [],
        fraud_logs: fraudLogs || []
      });
    }

  } catch (error) {
    console.error('Erreur API security audit:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur interne' 
    });
  }
}
