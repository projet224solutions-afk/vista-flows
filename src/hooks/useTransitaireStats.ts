/**
 * HOOK TRANSITAIRE STATS - STUB
 * Module transitaire temporairement désactivé
 */

import { useState, useEffect } from 'react';

export function useTransitaireStats() {
  const [stats, setStats] = useState({
    totalShipments: 0,
    pendingShipments: 0,
    completedShipments: 0,
    totalRevenue: 0,
    customsInProgress: 0
  });
  const [loading, setLoading] = useState(false);

  return {
    stats,
    loading,
    reloadStats: () => Promise.resolve()
  };
}
