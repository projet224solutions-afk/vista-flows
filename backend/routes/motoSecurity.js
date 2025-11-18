/**
 * ROUTES SÉCURITÉ MOTOS VOLÉES
 * Gestion complète du système de détection et d'alerte
 * 224Solutions - Module de sécurité intelligent
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * 1. DÉCLARER UNE MOTO VOLÉE
 * POST /api/moto-security/report-stolen
 */
router.post('/report-stolen', async (req, res) => {
    try {
        const { 
            numero_serie, 
            vin, 
            chauffeur_id, 
            bureau_id, 
            ville, 
            description,
            user_ip,
            user_agent
        } = req.body;

        // Validation des données
        if (!numero_serie || !bureau_id || !ville) {
            return res.status(400).json({
                success: false,
                error: 'Données manquantes: numero_serie, bureau_id, ville requis'
            });
        }

        console.log('🚨 DÉCLARATION DE VOL - MOTO:', numero_serie);

        // Vérifier si la moto existe déjà
        const { data: existingMoto, error: motoError } = await supabase
            .from('taxi_motos')
            .select('*')
            .or(`numero_serie.eq.${numero_serie}${vin ? ',vin.eq.' + vin : ''}`)
            .limit(1)
            .maybeSingle();

        if (motoError) {
            console.error('❌ Erreur recherche moto:', motoError);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la recherche de la moto'
            });
        }

        let motoId;
        if (existingMoto) {
            // Mettre à jour le statut existant
            const { data: updatedMoto, error: updateError } = await supabase
                .from('taxi_motos')
                .update({ 
                    statut: 'vole', 
                    alerte_envoyee: true,
                    ville_enregistrement: ville,
                    date_enregistrement: new Date().toISOString()
                })
                .eq('id', existingMoto.id)
                .select()
                .single();

            if (updateError) {
                console.error('❌ Erreur mise à jour moto:', updateError);
                return res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la mise à jour de la moto'
                });
            }

            motoId = updatedMoto.id;
        } else {
            // Créer une nouvelle entrée pour la moto volée
            const { data: newMoto, error: createError } = await supabase
                .from('taxi_motos')
                .insert([{
                    numero_serie,
                    vin,
                    statut: 'vole',
                    ville_enregistrement: ville,
                    date_enregistrement: new Date().toISOString(),
                    alerte_envoyee: true,
                    bureau_id,
                    chauffeur_id
                }])
                .select()
                .single();

            if (createError) {
                console.error('❌ Erreur création moto:', createError);
                return res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la création de la fiche moto'
                });
            }

            motoId = newMoto.id;
        }

        // Créer l'alerte
        const { data: alert, error: alertError } = await supabase
            .from('moto_alertes')
            .insert([{
                numero_serie,
                vin,
                chauffeur_id,
                bureau_origine_id: bureau_id,
                ville_signalement: ville,
                description: description || 'Moto signalée volée',
                statut: 'en_cours'
            }])
            .select()
            .single();

        if (alertError) {
            console.error('❌ Erreur création alerte:', alertError);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la création de l\'alerte'
            });
        }

        // Enregistrer l'audit
        await supabase.from('moto_security_audit').insert([{
            action: 'report_stolen',
            numero_serie,
            vin,
            user_id: chauffeur_id,
            bureau_id,
            ip_address: user_ip,
            user_agent,
            metadata: {
                description,
                ville,
                alert_id: alert.id
            }
        }]);

        // Envoyer notifications
        await notifyBureaux(numero_serie, vin, bureau_id, null, alert.id);

        console.log('✅ VOL DÉCLARÉ - Alerte créée:', alert.id);

        res.json({
            success: true,
            message: 'Moto signalée volée avec succès',
            alert: {
                id: alert.id,
                numero_serie: alert.numero_serie,
                statut: alert.statut,
                created_at: alert.created_at
            }
        });

    } catch (error) {
        console.error('❌ Erreur déclaration vol:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * 2. VÉRIFICATION LORS D'ENREGISTREMENT D'UNE NOUVELLE MOTO
 * POST /api/moto-security/register
 */
router.post('/register', async (req, res) => {
    try {
        const { 
            numero_serie, 
            vin, 
            bureau_id, 
            chauffeur_id, 
            ville,
            user_ip,
            user_agent
        } = req.body;

        if (!numero_serie || !bureau_id || !ville) {
            return res.status(400).json({
                success: false,
                error: 'Données manquantes: numero_serie, bureau_id, ville requis'
            });
        }

        console.log('🔍 VÉRIFICATION ENREGISTREMENT - MOTO:', numero_serie);

        // Vérifier si la moto est signalée volée
        const { data: stolenMoto, error: checkError } = await supabase
            .from('taxi_motos')
            .select('*')
            .or(`numero_serie.eq.${numero_serie}${vin ? ',vin.eq.' + vin : ''}`)
            .eq('statut', 'vole')
            .limit(1)
            .maybeSingle();

        if (checkError) {
            console.error('❌ Erreur vérification moto volée:', checkError);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la vérification'
            });
        }

        if (stolenMoto) {
            // Créer alerte de détection
            const { data: alert, error: alertError } = await supabase
                .from('moto_alertes')
                .insert([{
                    numero_serie,
                    vin,
                    bureau_detection_id: bureau_id,
                    ville_detection: ville,
                    description: 'Tentative d\'enregistrement sur moto signalée volée',
                    statut: 'en_cours'
                }])
                .select()
                .single();

            if (alertError) {
                console.error('❌ Erreur création alerte détection:', alertError);
            }

            // Enregistrer l'audit
            await supabase.from('moto_security_audit').insert([{
                action: 'stolen_detection',
                numero_serie,
                vin,
                user_id: chauffeur_id,
                bureau_id,
                ip_address: user_ip,
                user_agent,
                metadata: {
                    stolen_moto_id: stolenMoto.id,
                    alert_id: alert?.id
                }
            }]);

            // Notifier les bureaux
            await notifyBureaux(numero_serie, vin, stolenMoto.bureau_id, bureau_id, alert?.id);

            console.log('🚨 MOTO VOLÉE DÉTECTÉE - Enregistrement bloqué');

            return res.status(409).json({
                success: false,
                message: 'Moto signalée volée - enregistrement bloqué',
                alert: alert ? {
                    id: alert.id,
                    numero_serie: alert.numero_serie,
                    statut: alert.statut
                } : null,
                stolen_info: {
                    ville_origine: stolenMoto.ville_enregistrement,
                    date_vol: stolenMoto.date_enregistrement
                }
            });
        }

        // Enregistrement normal
        const { data: newMoto, error: createError } = await supabase
            .from('taxi_motos')
            .insert([{
                numero_serie,
                vin,
                chauffeur_id,
                bureau_id,
                ville_enregistrement: ville,
                date_enregistrement: new Date().toISOString(),
                statut: 'actif'
            }])
            .select()
            .single();

        if (createError) {
            console.error('❌ Erreur enregistrement moto:', createError);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de l\'enregistrement de la moto'
            });
        }

        // Enregistrer l'audit
        await supabase.from('moto_security_audit').insert([{
            action: 'moto_registered',
            numero_serie,
            vin,
            user_id: chauffeur_id,
            bureau_id,
            ip_address: user_ip,
            user_agent,
            metadata: {
                moto_id: newMoto.id
            }
        }]);

        console.log('✅ MOTO ENREGISTRÉE - Pas de problème détecté');

        res.json({
            success: true,
            message: 'Moto enregistrée avec succès',
            moto: {
                id: newMoto.id,
                numero_serie: newMoto.numero_serie,
                statut: newMoto.statut
            }
        });

    } catch (error) {
        console.error('❌ Erreur enregistrement moto:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * 3. LISTER LES ALERTES (BUREAU / PDG)
 * GET /api/moto-security/alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        const { bureau_id, statut, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('moto_alertes')
            .select(`
                *,
                bureau_origine:bureau_syndicat!bureau_origine_id(bureau_code, prefecture, commune),
                bureau_detection:bureau_syndicat!bureau_detection_id(bureau_code, prefecture, commune),
                chauffeur:users!chauffeur_id(first_name, last_name, email, phone)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (bureau_id) {
            query = query.or(`bureau_origine_id.eq.${bureau_id},bureau_detection_id.eq.${bureau_id}`);
        }

        if (statut) {
            query = query.eq('statut', statut);
        }

        const { data: alerts, error } = await query;

        if (error) {
            console.error('❌ Erreur récupération alertes:', error);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des alertes'
            });
        }

        res.json({
            success: true,
            alerts: alerts || [],
            count: alerts?.length || 0
        });

    } catch (error) {
        console.error('❌ Erreur listage alertes:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * 4. RÉSOUDRE UNE ALERTE
 * POST /api/moto-security/alerts/:id/resolve
 */
router.post('/alerts/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, resolution_type = 'resolue', notes } = req.body;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                error: 'user_id requis'
            });
        }

        console.log('✅ RÉSOLUTION ALERTE:', id);

        // Utiliser la fonction PostgreSQL pour marquer comme retrouvée
        const { data: result, error: resolveError } = await supabase
            .rpc('mark_moto_found', {
                alert_id: id,
                resolver_id: user_id
            });

        if (resolveError) {
            console.error('❌ Erreur résolution alerte:', resolveError);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la résolution de l\'alerte'
            });
        }

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Alerte non trouvée'
            });
        }

        // Enregistrer l'audit
        await supabase.from('moto_security_audit').insert([{
            action: 'alert_resolved',
            user_id,
            metadata: {
                alert_id: id,
                resolution_type,
                notes
            }
        }]);

        console.log('✅ ALERTE RÉSOLUE - Moto marquée comme retrouvée');

        res.json({
            success: true,
            message: 'Alerte résolue avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur résolution alerte:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * 5. STATISTIQUES DE SÉCURITÉ
 * GET /api/moto-security/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const { bureau_id, period = '30' } = req.query;

        // Récupérer les statistiques via la vue
        const { data: stats, error: statsError } = await supabase
            .from('moto_security_stats')
            .select('*')
            .single();

        if (statsError) {
            console.error('❌ Erreur récupération stats:', statsError);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des statistiques'
            });
        }

        // Statistiques par bureau si spécifié
        let bureauStats = null;
        if (bureau_id) {
            const { data: bureauData, error: bureauError } = await supabase
                .from('moto_alertes')
                .select('statut, created_at')
                .or(`bureau_origine_id.eq.${bureau_id},bureau_detection_id.eq.${bureau_id}`)
                .gte('created_at', new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString());

            if (!bureauError) {
                bureauStats = {
                    total: bureauData.length,
                    en_cours: bureauData.filter(a => a.statut === 'en_cours').length,
                    resolues: bureauData.filter(a => a.statut === 'resolue').length,
                    faux_positifs: bureauData.filter(a => a.statut === 'faux_positif').length
                };
            }
        }

        res.json({
            success: true,
            global_stats: stats,
            bureau_stats: bureauStats,
            period_days: parseInt(period)
        });

    } catch (error) {
        console.error('❌ Erreur récupération statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * 6. AUDIT TRAIL
 * GET /api/moto-security/audit
 */
router.get('/audit', async (req, res) => {
    try {
        const { action, bureau_id, limit = 100, offset = 0 } = req.query;

        let query = supabase
            .from('moto_security_audit')
            .select(`
                *,
                user:users!user_id(first_name, last_name, email),
                bureau:bureau_syndicat!bureau_id(bureau_code, prefecture, commune)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (action) {
            query = query.eq('action', action);
        }

        if (bureau_id) {
            query = query.eq('bureau_id', bureau_id);
        }

        const { data: audit, error } = await query;

        if (error) {
            console.error('❌ Erreur récupération audit:', error);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération de l\'audit'
            });
        }

        res.json({
            success: true,
            audit: audit || [],
            count: audit?.length || 0
        });

    } catch (error) {
        console.error('❌ Erreur récupération audit:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

/**
 * FONCTION HELPER: NOTIFIER LES BUREAUX
 */
async function notifyBureaux(numero_serie, vin, bureau_origine_id, bureau_detection_id, alert_id) {
    try {
        console.log('📢 ENVOI NOTIFICATIONS - Moto:', numero_serie);

        // Notification au bureau d'origine
        if (bureau_origine_id) {
            await supabase.from('security_notifications').insert([{
                title: '🚨 Moto volée détectée',
                body: `Moto ${numero_serie} détectée dans un autre bureau`,
                type: 'vol_detected',
                target_bureau_origin: bureau_origine_id,
                metadata: {
                    numero_serie,
                    vin,
                    alert_id,
                    detection_bureau: bureau_detection_id
                }
            }]);
        }

        // Notification au bureau de détection
        if (bureau_detection_id) {
            await supabase.from('security_notifications').insert([{
                title: '⚠️ Moto signalée volée',
                body: `Tentative d'enregistrement de moto ${numero_serie} signalée volée`,
                type: 'stolen_attempt',
                target_bureau_detection: bureau_detection_id,
                metadata: {
                    numero_serie,
                    vin,
                    alert_id,
                    origin_bureau: bureau_origine_id
                }
            }]);
        }

        // Notification au PDG
        await supabase.from('security_notifications').insert([{
            title: '🔍 Alerte sécurité moto',
            body: `Moto ${numero_serie} - Détection inter-bureaux`,
            type: 'security_alert',
            target_pdg: true,
            metadata: {
                numero_serie,
                vin,
                alert_id,
                origin_bureau: bureau_origine_id,
                detection_bureau: bureau_detection_id
            }
        }]);

        console.log('✅ NOTIFICATIONS ENVOYÉES');

    } catch (error) {
        console.error('❌ Erreur envoi notifications:', error);
    }
}

module.exports = router;
