import { useEffect, useMemo, useState, useCallback } from "react";

export type SyndicatStat = {
  label: string;
  value: string;
  icon: any;
  color: string;
};

export type ActiveBadge = {
  driver: string;
  badgeNumber: string;
  vestNumber: string;
  status: string;
  expires: string;
  zone: string;
};

export type SecurityAlert = {
  id: string;
  driver: string;
  type: string;
  zone: string;
  time: string;
  priority: string;
};

type UseSyndicatDataResult = {
  loading: boolean;
  stats: SyndicatStat[];
  activeBadges: ActiveBadge[];
  securityAlerts: SecurityAlert[];
  markAlertTreated: (id: string) => void;
  markAlertUrgent: (id: string) => void;
};

export function useSyndicatData(initial?: Partial<UseSyndicatDataResult>): UseSyndicatDataResult {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<SyndicatStat[]>(initial?.stats || []);
  const [activeBadges, setActiveBadges] = useState<ActiveBadge[]>(initial?.activeBadges || []);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(initial?.securityAlerts || []);

  useEffect(() => {
    let isMounted = true;

    // Simule une API locale; si vous avez Supabase, remplacez ce bloc par un fetch réel
    const load = async () => {
      try {
        // Simulation réseau
        await new Promise((r) => setTimeout(r, 300));

        const simulatedStats: SyndicatStat[] = stats.length ? stats : [
          { label: "Mototaxis actifs", value: "156", icon: null as any, color: "text-blue-500" },
          { label: "Missions en cours", value: "89", icon: null as any, color: "text-green-500" },
          { label: "Alertes sécurité", value: "3", icon: null as any, color: "text-red-500" },
          { label: "Badges valides", value: "142", icon: null as any, color: "text-purple-500" }
        ];

        const simulatedBadges: ActiveBadge[] = activeBadges.length ? activeBadges : [
          { driver: 'Mamadou Diallo', badgeNumber: 'SYN-2024-001', vestNumber: 'V-156', status: 'Actif', expires: '31 Déc 2024', zone: 'Plateau' },
          { driver: 'Fatou Sall', badgeNumber: 'SYN-2024-002', vestNumber: 'V-157', status: 'Actif', expires: '31 Déc 2024', zone: 'Médina' }
        ];

        const simulatedAlerts: SecurityAlert[] = securityAlerts.length ? securityAlerts : [
          { id: 'ALT-001', driver: 'Abdou Ba', type: 'Badge expiré', zone: 'Almadies', time: '14:30', priority: 'Haute' },
          { id: 'ALT-002', driver: 'Omar Ndiaye', type: 'SOS activé', zone: 'Yoff', time: '13:15', priority: 'Urgente' }
        ];

        if (!isMounted) return;
        setStats(simulatedStats);
        setActiveBadges(simulatedBadges);
        setSecurityAlerts(simulatedAlerts);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAlertTreated = useCallback((id: string) => {
    // ✅ Correction : action "Traiter" — ici nous journalisons et conservons l'état
    console.log('Alerte traitée:', id);
  }, []);

  const markAlertUrgent = useCallback((id: string) => {
    // ✅ Correction : action "Urgence" — passe l'état à "En cours d’intervention"
    setSecurityAlerts((prev) => prev.map((a) => a.id === id ? { ...a, priority: 'En cours d’intervention' } : a));
  }, []);

  return { loading, stats, activeBadges, securityAlerts, markAlertTreated, markAlertUrgent };
}


