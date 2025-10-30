import { useEffect } from 'react';
import { PdgRevenueService } from '@/services/pdgRevenueService';
import { supabase } from '@/lib/supabaseClient';

/**
 * Hook pour créer des données de démonstration
 * À utiliser UNIQUEMENT en développement
 */
export function usePdgRevenueDemo(enabled: boolean = false) {
  useEffect(() => {
    if (!enabled) return;

    const createDemoData = async () => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      console.log('🎯 [Demo] Création de données de test pour les revenus PDG...');

      // Créer quelques revenus de wallet
      await PdgRevenueService.recordRevenue({
        sourceType: 'frais_transaction_wallet',
        amount: 150, // 1.5% de 10000 GNF
        percentage: 1.5,
        userId: user.data.user.id,
        metadata: {
          description: 'Frais sur transfert wallet de test',
          original_amount: 10000,
        },
      });

      await PdgRevenueService.recordRevenue({
        sourceType: 'frais_transaction_wallet',
        amount: 300, // 1.5% de 20000 GNF
        percentage: 1.5,
        userId: user.data.user.id,
        metadata: {
          description: 'Frais sur retrait wallet de test',
          original_amount: 20000,
        },
      });

      // Créer quelques revenus d'achats
      await PdgRevenueService.recordRevenue({
        sourceType: 'frais_achat_commande',
        amount: 5000, // 10% de 50000 GNF
        percentage: 10,
        userId: user.data.user.id,
        metadata: {
          description: 'Commission sur achat boutique de test',
          original_amount: 50000,
          service: 'boutique',
        },
      });

      await PdgRevenueService.recordRevenue({
        sourceType: 'frais_achat_commande',
        amount: 8000, // 8% de 100000 GNF
        percentage: 8,
        userId: user.data.user.id,
        metadata: {
          description: 'Commission sur commande restaurant de test',
          original_amount: 100000,
          service: 'restaurant',
        },
      });

      console.log('✅ [Demo] Données de test créées avec succès !');
    };

    createDemoData();
  }, [enabled]);
}
