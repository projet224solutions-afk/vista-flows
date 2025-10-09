/**
 * 📍 API GÉOLOCALISATION - POSITION
 * Endpoint pour sauvegarder et récupérer les positions
 */

import { supabase } from '@/integrations/supabase/client';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        // Sauvegarder une position
        try {
            const { position, timestamp, userId } = req.body;

            if (!position || !position.latitude || !position.longitude) {
                return res.status(400).json({ error: 'Position invalide' });
            }

            const { data, error } = await supabase
                .from('user_positions')
                .insert({
                    user_id: userId || 'anonymous',
                    latitude: position.latitude,
                    longitude: position.longitude,
                    accuracy: position.accuracy,
                    altitude: position.altitude,
                    speed: position.speed,
                    heading: position.heading,
                    timestamp: timestamp || Date.now(),
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('Erreur sauvegarde position:', error);
                return res.status(500).json({ error: 'Erreur sauvegarde position' });
            }

            console.log(`📍 Position sauvegardée pour utilisateur ${userId}`);

            return res.status(201).json({
                success: true,
                position: data
            });

        } catch (error) {
            console.error('Erreur API position:', error);
            return res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    if (req.method === 'GET') {
        // Récupérer les positions d'un utilisateur
        try {
            const { userId, limit = 100, offset = 0 } = req.query;

            if (!userId) {
                return res.status(400).json({ error: 'userId requis' });
            }

            const { data: positions, error } = await supabase
                .from('user_positions')
                .select('*')
                .eq('user_id', userId)
                .order('timestamp', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                console.error('Erreur récupération positions:', error);
                return res.status(500).json({ error: 'Erreur récupération positions' });
            }

            return res.status(200).json({
                success: true,
                positions: positions || []
            });

        } catch (error) {
            console.error('Erreur API positions:', error);
            return res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    if (req.method === 'DELETE') {
        // Supprimer les positions anciennes
        try {
            const { userId, olderThan } = req.body;

            if (!userId) {
                return res.status(400).json({ error: 'userId requis' });
            }

            const cutoffDate = olderThan || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            const { error } = await supabase
                .from('user_positions')
                .delete()
                .eq('user_id', userId)
                .lt('created_at', cutoffDate);

            if (error) {
                console.error('Erreur suppression positions:', error);
                return res.status(500).json({ error: 'Erreur suppression positions' });
            }

            return res.status(200).json({
                success: true,
                message: 'Positions anciennes supprimées'
            });

        } catch (error) {
            console.error('Erreur API suppression positions:', error);
            return res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
}
