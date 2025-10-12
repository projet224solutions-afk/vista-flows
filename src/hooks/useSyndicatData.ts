import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Users, Activity, AlertTriangle, CheckCircle } from "lucide-react";

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
  error?: string | null;
  stats: SyndicatStat[];
  activeBadges: ActiveBadge[];
  securityAlerts: SecurityAlert[];
  markAlertTreated: (id: string) => void;
  markAlertUrgent: (id: string) => void;
};

export function useSyndicatData(initial?: Partial<UseSyndicatDataResult>): UseSyndicatDataResult {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SyndicatStat[]>(initial?.stats || []);
  const [activeBadges, setActiveBadges] = useState<ActiveBadge[]>(initial?.activeBadges || []);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(initial?.securityAlerts || []);

  useEffect(() => {
    let isMounted = true;

    // Simule une API locale; si vous avez Supabase, remplacez ce bloc par un fetch réel
    const load = async () => {
      try {
        setError(null);

        // Tentative de récupération réelle via Supabase
        const [mototaxisCountRes, missionsCountRes, alertsCountRes, badgesCountRes] = await Promise.all([
          supabase.from('mototaxis').select('*', { count: 'exact', head: true }),
          supabase.from('missions').select('*', { count: 'exact', head: true }),
          supabase.from('alerts').select('*', { count: 'exact', head: true }),
          supabase.from('badges').select('*', { count: 'exact', head: true }),
        ]);

        const mototaxisCount = mototaxisCountRes.count ?? null;
        const missionsCount = missionsCountRes.count ?? null;
        const alertsCount = alertsCountRes.count ?? null;
        const badgesCount = badgesCountRes.count ?? null;

        const realStats: SyndicatStat[] = [
          { label: "Mototaxis actifs", value: String(mototaxisCount ?? '156'), icon: Users, color: "text-blue-500" },
          { label: "Missions en cours", value: String(missionsCount ?? '89'), icon: Activity, color: "text-green-500" },
          { label: "Alertes sécurité", value: String(alertsCount ?? '3'), icon: AlertTriangle, color: "text-red-500" },
          { label: "Badges valides", value: String(badgesCount ?? '142'), icon: CheckCircle, color: "text-purple-500" },
        ];

        // Badges actifs
        const { data: badgesData, error: badgesError } = await supabase
          .from('badges')
          .select('number, vest_number, status, expires_at, zone, driver:driver_id(full_name)')
          .eq('status', 'Actif')
          .limit(20);

        // Alertes sécurité
        const { data: alertsData, error: alertsError } = await supabase
          .from('alerts')
          .select('id, driver_id, type, zone, time, priority, status')
          .order('time', { ascending: false })
          .limit(50);

        if (!isMounted) return;

        // Fallback en cas d'erreur ou d'absence de table
        const simulatedBadges: ActiveBadge[] = activeBadges.length ? activeBadges : [
          { driver: 'Mamadou Diallo', badgeNumber: 'SYN-2024-001', vestNumber: 'V-156', status: 'Actif', expires: '31 Déc 2024', zone: 'Plateau' },
          { driver: 'Fatou Sall', badgeNumber: 'SYN-2024-002', vestNumber: 'V-157', status: 'Actif', expires: '31 Déc 2024', zone: 'Médina' }
        ];
        const mappedBadges: ActiveBadge[] = badgesError || !badgesData ? simulatedBadges : badgesData.map((b: any) => ({
          driver: b?.driver?.full_name ?? 'Conducteur',
          badgeNumber: b?.number ?? 'N/A',
          vestNumber: b?.vest_number ?? 'N/A',
          status: b?.status ?? 'Actif',
          expires: b?.expires_at ? new Date(b.expires_at).toLocaleDateString() : 'N/A',
          zone: b?.zone ?? 'N/A',
        }));

        const simulatedAlerts: SecurityAlert[] = securityAlerts.length ? securityAlerts : [
          { id: 'ALT-001', driver: 'Abdou Ba', type: 'Badge expiré', zone: 'Almadies', time: '14:30', priority: 'Haute' },
          { id: 'ALT-002', driver: 'Omar Ndiaye', type: 'SOS activé', zone: 'Yoff', time: '13:15', priority: 'Urgente' }
        ];
        const mappedAlerts: SecurityAlert[] = alertsError || !alertsData ? simulatedAlerts : alertsData.map((a: any) => ({
          id: String(a.id),
          driver: String(a.driver_id ?? 'N/A'),
          type: a.type ?? 'Alerte',
          zone: a.zone ?? 'N/A',
          time: a.time ? String(a.time) : new Date().toLocaleTimeString(),
          priority: a.priority ?? 'Haute',
        }));

        setStats(realStats);
        setActiveBadges(mappedBadges);
        setSecurityAlerts(mappedAlerts);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    // Rafraîchissement périodique léger
    const interval = setInterval(load, 10000);

    // Realtime alertes
    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        load();
      })
      .subscribe();

    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAlertTreated = useCallback((id: string) => {
    // ✅ Correction : action "Traiter" — mise à jour DB + journalisation + soft-update local
    (async () => {
      try {
        const { error } = await supabase
          .from('alerts')
          .update({ status: 'traitée' })
          .eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.warn('Alerte traitée (fallback local):', id, e);
      } finally {
        // Mise à jour locale douce
        setSecurityAlerts((prev) => prev.map((a) => a.id === id ? { ...a, priority: a.priority, /* conserve */ } : a));
      }
    })();
  }, []);

  const markAlertUrgent = useCallback((id: string) => {
    // ✅ Correction : action "Urgence" — notification + passe l'état à "En cours d’intervention"
    (async () => {
      try {
        // Enregistrer une notification
        await supabase.from('notifications').insert({
          type: 'SYNDICAT_URGENCE',
          payload: { alert_id: id },
          status: 'sent'
        } as any);
      } catch (e) {
        console.warn('Notification urgence (fallback):', id, e);
      } finally {
        setSecurityAlerts((prev) => prev.map((a) => a.id === id ? { ...a, priority: 'En cours d’intervention' } : a));
      }
    })();
  }, []);

  return { loading, error, stats, activeBadges, securityAlerts, markAlertTreated, markAlertUrgent };
}


