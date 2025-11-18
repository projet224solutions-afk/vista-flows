/**
 * WORKER SÉCURITÉ MOTOS - VÉRIFICATION PÉRIODIQUE
 * Scan automatique des nouvelles inscriptions pour détecter les doublons
 * 224Solutions - Module de sécurité intelligent
 */

const { supabase } = require('../lib/supabase');
const cron = require('node-cron');

class MotoSecurityWorker {
    constructor() {
        this.isRunning = false;
        this.scanInterval = 5; // minutes
        this.lastScanTime = null;
    }

    /**
     * Démarrer le worker
     */
    start() {
        console.log('🚀 DÉMARRAGE WORKER SÉCURITÉ MOTOS');
        
        // Scan toutes les 5 minutes
        cron.schedule('*/5 * * * *', () => {
            this.scanNewRegistrations();
        });

        // Scan quotidien complet à 2h du matin
        cron.schedule('0 2 * * *', () => {
            this.fullSecurityScan();
        });

        console.log('✅ Worker sécurité motos démarré');
    }

    /**
     * Scanner les nouvelles inscriptions
     */
    async scanNewRegistrations() {
        if (this.isRunning) {
            console.log('⏳ Scan déjà en cours, ignoré');
            return;
        }

        this.isRunning = true;
        console.log('🔍 SCAN NOUVELLES INSCRIPTIONS - Début');

        try {
            // Récupérer les enregistrements récents (dernières 10 minutes)
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            
            const { data: recentMotos, error: recentError } = await supabase
                .from('taxi_motos')
                .select('*')
                .gte('date_enregistrement', tenMinutesAgo)
                .order('date_enregistrement', { ascending: false });

            if (recentError) {
                console.error('❌ Erreur récupération motos récentes:', recentError);
                return;
            }

            if (!recentMotos || recentMotos.length === 0) {
                console.log('📭 Aucune nouvelle inscription récente');
                return;
            }

            console.log(`📊 ${recentMotos.length} nouvelles inscriptions à vérifier`);

            // Vérifier chaque nouvelle moto
            for (const moto of recentMotos) {
                await this.checkMotoForDuplicates(moto);
            }

            this.lastScanTime = new Date();
            console.log('✅ Scan nouvelles inscriptions terminé');

        } catch (error) {
            console.error('❌ Erreur scan nouvelles inscriptions:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Vérifier une moto pour des doublons
     */
    async checkMotoForDuplicates(moto) {
        try {
            console.log(`🔍 Vérification moto: ${moto.numero_serie}`);

            // Rechercher des doublons par numéro de série
            const { data: serieDuplicates, error: serieError } = await supabase
                .from('taxi_motos')
                .select('*')
                .eq('numero_serie', moto.numero_serie)
                .neq('id', moto.id);

            if (serieError) {
                console.error('❌ Erreur recherche doublons série:', serieError);
                return;
            }

            // Rechercher des doublons par VIN
            let vinDuplicates = [];
            if (moto.vin) {
                const { data: vinDups, error: vinError } = await supabase
                    .from('taxi_motos')
                    .select('*')
                    .eq('vin', moto.vin)
                    .neq('id', moto.id);

                if (vinError) {
                    console.error('❌ Erreur recherche doublons VIN:', vinError);
                } else {
                    vinDuplicates = vinDups || [];
                }
            }

            // Vérifier si des doublons sont signalés volés
            const allDuplicates = [...serieDuplicates, ...vinDuplicates];
            const stolenDuplicates = allDuplicates.filter(d => d.statut === 'vole');

            if (stolenDuplicates.length > 0) {
                console.log(`🚨 DOUBLON VOLÉ DÉTECTÉ: ${moto.numero_serie}`);
                await this.handleStolenDuplicate(moto, stolenDuplicates);
            } else if (allDuplicates.length > 0) {
                console.log(`⚠️ DOUBLON DÉTECTÉ: ${moto.numero_serie}`);
                await this.handleRegularDuplicate(moto, allDuplicates);
            } else {
                console.log(`✅ Moto ${moto.numero_serie} - Aucun doublon détecté`);
            }

        } catch (error) {
            console.error(`❌ Erreur vérification moto ${moto.numero_serie}:`, error);
        }
    }

    /**
     * Gérer un doublon de moto volée
     */
    async handleStolenDuplicate(newMoto, stolenDuplicates) {
        try {
            console.log(`🚨 TRAITEMENT DOUBLON VOLÉ: ${newMoto.numero_serie}`);

            // Créer une alerte de détection
            const { data: alert, error: alertError } = await supabase
                .from('moto_alertes')
                .insert([{
                    numero_serie: newMoto.numero_serie,
                    vin: newMoto.vin,
                    bureau_detection_id: newMoto.bureau_id,
                    ville_detection: newMoto.ville_enregistrement,
                    description: 'Détection automatique via worker - Moto signalée volée',
                    statut: 'en_cours'
                }])
                .select()
                .single();

            if (alertError) {
                console.error('❌ Erreur création alerte détection:', alertError);
                return;
            }

            // Bloquer la moto (changer le statut)
            const { error: blockError } = await supabase
                .from('taxi_motos')
                .update({ 
                    statut: 'suspendu',
                    alerte_envoyee: true 
                })
                .eq('id', newMoto.id);

            if (blockError) {
                console.error('❌ Erreur blocage moto:', blockError);
            }

            // Envoyer notifications
            await this.sendSecurityNotifications(newMoto, stolenDuplicates, alert.id);

            // Enregistrer l'audit
            await supabase.from('moto_security_audit').insert([{
                action: 'worker_stolen_detection',
                numero_serie: newMoto.numero_serie,
                vin: newMoto.vin,
                bureau_id: newMoto.bureau_id,
                metadata: {
                    alert_id: alert.id,
                    stolen_motos: stolenDuplicates.map(s => s.id),
                    detection_method: 'worker_scan'
                }
            }]);

            console.log(`✅ Alerte créée pour doublon volé: ${alert.id}`);

        } catch (error) {
            console.error('❌ Erreur traitement doublon volé:', error);
        }
    }

    /**
     * Gérer un doublon régulier
     */
    async handleRegularDuplicate(newMoto, duplicates) {
        try {
            console.log(`⚠️ TRAITEMENT DOUBLON RÉGULIER: ${newMoto.numero_serie}`);

            // Créer une alerte de doublon
            const { data: alert, error: alertError } = await supabase
                .from('moto_alertes')
                .insert([{
                    numero_serie: newMoto.numero_serie,
                    vin: newMoto.vin,
                    bureau_detection_id: newMoto.bureau_id,
                    ville_detection: newMoto.ville_enregistrement,
                    description: 'Détection automatique via worker - Doublon potentiel',
                    statut: 'en_cours'
                }])
                .select()
                .single();

            if (alertError) {
                console.error('❌ Erreur création alerte doublon:', alertError);
                return;
            }

            // Envoyer notification de doublon
            await this.sendDuplicateNotifications(newMoto, duplicates, alert.id);

            console.log(`✅ Alerte doublon créée: ${alert.id}`);

        } catch (error) {
            console.error('❌ Erreur traitement doublon régulier:', error);
        }
    }

    /**
     * Envoyer notifications de sécurité
     */
    async sendSecurityNotifications(newMoto, stolenDuplicates, alertId) {
        try {
            console.log('📢 ENVOI NOTIFICATIONS SÉCURITÉ');

            // Notification au bureau de détection
            await supabase.from('security_notifications').insert([{
                title: '🚨 Moto volée détectée automatiquement',
                body: `Moto ${newMoto.numero_serie} détectée - Enregistrement bloqué`,
                type: 'vol_detected',
                target_bureau_detection: newMoto.bureau_id,
                metadata: {
                    numero_serie: newMoto.numero_serie,
                    alert_id,
                    detection_method: 'worker'
                }
            }]);

            // Notification aux bureaux d'origine des motos volées
            for (const stolenMoto of stolenDuplicates) {
                await supabase.from('security_notifications').insert([{
                    title: '🔍 Votre moto volée détectée',
                    body: `Moto ${stolenMoto.numero_serie} détectée dans ${newMoto.ville_enregistrement}`,
                    type: 'vol_detected',
                    target_bureau_origin: stolenMoto.bureau_id,
                    metadata: {
                        numero_serie: newMoto.numero_serie,
                        alert_id,
                        detection_bureau: newMoto.bureau_id
                    }
                }]);
            }

            // Notification au PDG
            await supabase.from('security_notifications').insert([{
                title: '🔍 Alerte sécurité automatique',
                body: `Moto ${newMoto.numero_serie} - Détection inter-bureaux via worker`,
                type: 'security_alert',
                target_pdg: true,
                metadata: {
                    numero_serie: newMoto.numero_serie,
                    alert_id,
                    detection_method: 'worker'
                }
            }]);

            console.log('✅ Notifications sécurité envoyées');

        } catch (error) {
            console.error('❌ Erreur envoi notifications sécurité:', error);
        }
    }

    /**
     * Envoyer notifications de doublon
     */
    async sendDuplicateNotifications(newMoto, duplicates, alertId) {
        try {
            console.log('📢 ENVOI NOTIFICATIONS DOUBLON');

            // Notification au bureau de détection
            await supabase.from('security_notifications').insert([{
                title: '⚠️ Doublon détecté automatiquement',
                body: `Moto ${newMoto.numero_serie} - Vérification recommandée`,
                type: 'security_alert',
                target_bureau_detection: newMoto.bureau_id,
                metadata: {
                    numero_serie: newMoto.numero_serie,
                    alert_id,
                    detection_method: 'worker'
                }
            }]);

            // Notification au PDG
            await supabase.from('security_notifications').insert([{
                title: '⚠️ Doublon détecté',
                body: `Moto ${newMoto.numero_serie} - Vérification manuelle recommandée`,
                type: 'security_alert',
                target_pdg: true,
                metadata: {
                    numero_serie: newMoto.numero_serie,
                    alert_id,
                    detection_method: 'worker'
                }
            }]);

            console.log('✅ Notifications doublon envoyées');

        } catch (error) {
            console.error('❌ Erreur envoi notifications doublon:', error);
        }
    }

    /**
     * Scan de sécurité complet quotidien
     */
    async fullSecurityScan() {
        console.log('🔍 SCAN SÉCURITÉ COMPLET - Début');

        try {
            // Récupérer toutes les motos actives
            const { data: allMotos, error: allError } = await supabase
                .from('taxi_motos')
                .select('*')
                .in('statut', ['actif', 'vole']);

            if (allError) {
                console.error('❌ Erreur récupération toutes motos:', allError);
                return;
            }

            console.log(`📊 Scan complet de ${allMotos.length} motos`);

            // Grouper par numéro de série et VIN
            const serieGroups = {};
            const vinGroups = {};

            allMotos.forEach(moto => {
                if (moto.numero_serie) {
                    if (!serieGroups[moto.numero_serie]) {
                        serieGroups[moto.numero_serie] = [];
                    }
                    serieGroups[moto.numero_serie].push(moto);
                }

                if (moto.vin) {
                    if (!vinGroups[moto.vin]) {
                        vinGroups[moto.vin] = [];
                    }
                    vinGroups[moto.vin].push(moto);
                }
            });

            // Analyser les groupes
            let anomaliesFound = 0;

            // Analyser les numéros de série
            for (const [numeroSerie, motos] of Object.entries(serieGroups)) {
                if (motos.length > 1) {
                    console.log(`⚠️ DOUBLON SÉRIE: ${numeroSerie} (${motos.length} occurrences)`);
                    await this.analyzeDuplicateGroup(motos, 'numero_serie');
                    anomaliesFound++;
                }
            }

            // Analyser les VIN
            for (const [vin, motos] of Object.entries(vinGroups)) {
                if (motos.length > 1) {
                    console.log(`⚠️ DOUBLON VIN: ${vin} (${motos.length} occurrences)`);
                    await this.analyzeDuplicateGroup(motos, 'vin');
                    anomaliesFound++;
                }
            }

            console.log(`✅ Scan complet terminé - ${anomaliesFound} anomalies trouvées`);

        } catch (error) {
            console.error('❌ Erreur scan complet:', error);
        }
    }

    /**
     * Analyser un groupe de doublons
     */
    async analyzeDuplicateGroup(motos, field) {
        try {
            const stolenMotos = motos.filter(m => m.statut === 'vole');
            const activeMotos = motos.filter(m => m.statut === 'actif');

            if (stolenMotos.length > 0 && activeMotos.length > 0) {
                console.log(`🚨 CONFLIT DÉTECTÉ: ${field} avec motos volées et actives`);
                
                // Créer une alerte de conflit
                await supabase.from('moto_alertes').insert([{
                    numero_serie: motos[0].numero_serie,
                    vin: motos[0].vin,
                    description: `Conflit détecté via scan complet - ${field} avec statuts mixtes`,
                    statut: 'en_cours'
                }]);

                // Notifier le PDG
                await supabase.from('security_notifications').insert([{
                    title: '🚨 Conflit de sécurité détecté',
                    body: `${field} ${motos[0][field]} - Mélange de statuts volé/actif`,
                    type: 'security_alert',
                    target_pdg: true,
                    metadata: {
                        field,
                        value: motos[0][field],
                        motos_count: motos.length,
                        stolen_count: stolenMotos.length,
                        active_count: activeMotos.length
                    }
                }]);
            }

        } catch (error) {
            console.error('❌ Erreur analyse groupe doublon:', error);
        }
    }

    /**
     * Obtenir le statut du worker
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastScanTime: this.lastScanTime,
            scanInterval: this.scanInterval
        };
    }
}

// Instance singleton
const motoSecurityWorker = new MotoSecurityWorker();

module.exports = motoSecurityWorker;
