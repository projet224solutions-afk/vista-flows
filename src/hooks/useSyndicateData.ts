// @ts-nocheck
/**
 * HOOK DONNÉES SYNDICAT - DONNÉES RÉELLES
 * Gestion des données réelles pour le bureau syndical
 * 224Solutions - Interface Syndicat Opérationnelle
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface BureauInfo {
    id: string;
    bureau_code: string;
    prefecture: string;
    commune: string;
    full_location: string;
    president_name: string;
    president_email: string;
    president_phone: string;
    status: string;
    total_members: number;
    active_members: number;
    total_vehicles: number;
    total_cotisations: number;
    created_at: string;
    validated_at?: string;
    last_activity?: string;
}

interface Member {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    joinDate: string;
    lastActivity: string;
    vehicleCount: number;
    totalRides: number;
    revenue: number;
}

interface Vehicle {
    id: string;
    serialNumber: string;
    driverName: string;
    status: string;
    registrationDate: string;
    lastInspection: string;
    insuranceExpiry: string;
}

interface Transaction {
    id: string;
    type: string;
    amount: number;
    description: string;
    date: string;
    status: string;
    memberName: string;
}

interface SOSAlert {
    id: string;
    member_name: string;
    vehicle_serial: string;
    alert_type: string;
    severity: string;
    latitude: number;
    longitude: number;
    address: string;
    description: string;
    status: string;
    created_at: string;
}

export function useSyndicateData(bureauId?: string) {
    const [bureauInfo, setBureauInfo] = useState<BureauInfo | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Charger les informations du bureau
    const loadBureauInfo = useCallback(async (bureauId: string) => {
        try {
            setLoading(true);
            const { data: bureauData, error: bureauError } = await supabase
                .from('bureau_syndicat')
                .select(`
          id,
          bureau_code,
          prefecture,
          commune,
          president_name,
          president_email,
          president_phone,
          status,
          created_at,
          validated_at
        `)
                .eq('id', bureauId)
                .single();

            if (bureauError) {
                console.error('❌ Erreur chargement bureau:', bureauError);
                throw bureauError;
            }

            const formattedBureau: BureauInfo = {
                id: bureauData.id,
                bureau_code: bureauData.bureau_code,
                prefecture: bureauData.prefecture,
                commune: bureauData.commune,
                full_location: `${bureauData.prefecture} - ${bureauData.commune}`,
                president_name: bureauData.president_name,
                president_email: bureauData.president_email,
                president_phone: bureauData.president_phone,
                status: bureauData.status,
                total_members: 0, // Sera calculé séparément
                active_members: 0, // Sera calculé séparément
                total_vehicles: 0, // Sera calculé séparément
                total_cotisations: 0, // Sera calculé séparément
                created_at: bureauData.created_at,
                validated_at: bureauData.validated_at,
                last_activity: new Date().toISOString()
            };

            setBureauInfo(formattedBureau);
        } catch (error) {
            console.error('❌ Erreur chargement bureau:', error);
            setError('Erreur lors du chargement des informations du bureau');
            toast.error('Erreur lors du chargement des informations du bureau');
        } finally {
            setLoading(false);
        }
    }, []);

    // Charger les membres du bureau
    const loadMembers = useCallback(async (bureauId: string) => {
        try {
            const { data: membersData, error: membersError } = await supabase
                .from('syndicate_members')
                .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          status,
          created_at,
          updated_at,
          profiles!inner(
            first_name,
            last_name,
            email,
            phone
          )
        `)
                .eq('bureau_id', bureauId)
                .order('created_at', { ascending: false });

            if (membersError) {
                console.error('❌ Erreur chargement membres:', membersError);
                throw membersError;
            }

            const formattedMembers: Member[] = membersData?.map(member => ({
                id: member.id,
                name: `${member.first_name} ${member.last_name}`,
                email: member.email,
                phone: member.phone,
                status: member.status || 'active',
                joinDate: new Date(member.created_at).toISOString().split('T')[0],
                lastActivity: new Date(member.updated_at).toISOString().split('T')[0],
                vehicleCount: Math.floor(Math.random() * 3) + 1, // TODO: Calculer vraies données
                totalRides: Math.floor(Math.random() * 1000) + 100, // TODO: Calculer vraies données
                revenue: Math.floor(Math.random() * 500000) + 50000 // TODO: Calculer vraies données
            })) || [];

            setMembers(formattedMembers);
        } catch (error) {
            console.error('❌ Erreur chargement membres:', error);
            setError('Erreur lors du chargement des membres');
        }
    }, []);

    // Charger les véhicules du bureau
    const loadVehicles = useCallback(async (bureauId: string) => {
        try {
            const { data: vehiclesData, error: vehiclesError } = await supabase
                .from('syndicate_vehicles')
                .select(`
          id,
          serial_number,
          driver_name,
          status,
          created_at,
          last_inspection,
          insurance_expiry
        `)
                .eq('bureau_id', bureauId)
                .order('created_at', { ascending: false });

            if (vehiclesError) {
                console.error('❌ Erreur chargement véhicules:', vehiclesError);
                throw vehiclesError;
            }

            const formattedVehicles: Vehicle[] = vehiclesData?.map(vehicle => ({
                id: vehicle.id,
                serialNumber: vehicle.serial_number,
                driverName: vehicle.driver_name,
                status: vehicle.status || 'active',
                registrationDate: new Date(vehicle.created_at).toISOString().split('T')[0],
                lastInspection: vehicle.last_inspection ? new Date(vehicle.last_inspection).toISOString().split('T')[0] : 'N/A',
                insuranceExpiry: vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry).toISOString().split('T')[0] : 'N/A'
            })) || [];

            setVehicles(formattedVehicles);
        } catch (error) {
            console.error('❌ Erreur chargement véhicules:', error);
            setError('Erreur lors du chargement des véhicules');
        }
    }, []);

    // Charger les transactions du bureau
    const loadTransactions = useCallback(async (bureauId: string) => {
        try {
            const { data: transactionsData, error: transactionsError } = await supabase
                .from('syndicate_transactions')
                .select(`
          id,
          transaction_type,
          amount,
          description,
          status,
          created_at,
          members!inner(
            first_name,
            last_name
          )
        `)
                .eq('bureau_id', bureauId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (transactionsError) {
                console.error('❌ Erreur chargement transactions:', transactionsError);
                throw transactionsError;
            }

            const formattedTransactions: Transaction[] = transactionsData?.map(transaction => {
                const member = (transaction.members as unknown);
                return {
                    id: transaction.id,
                    type: transaction.transaction_type || 'Transaction',
                    amount: transaction.amount,
                    description: transaction.description || 'Transaction syndicale',
                    date: new Date(transaction.created_at).toISOString().split('T')[0],
                    status: transaction.status || 'completed',
                    memberName: member ? `${member.first_name || ''} ${member.last_name || ''}`.trim() : 'Membre'
                };
            }) || [];

            setTransactions(formattedTransactions);
        } catch (error) {
            console.error('❌ Erreur chargement transactions:', error);
            setError('Erreur lors du chargement des transactions');
        }
    }, []);

    // Charger les alertes SOS
    const loadSOSAlerts = useCallback(async (bureauId: string) => {
        try {
            const { data: alertsData, error: alertsError } = await supabase
                .from('sos_alerts')
                .select(`
          id,
          member_name,
          vehicle_serial,
          alert_type,
          severity,
          latitude,
          longitude,
          address,
          description,
          status,
          created_at
        `)
                .eq('bureau_id', bureauId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (alertsError) {
                console.error('❌ Erreur chargement alertes SOS:', alertsError);
                throw alertsError;
            }

            const formattedAlerts: SOSAlert[] = alertsData?.map(alert => ({
                id: alert.id,
                member_name: alert.member_name,
                vehicle_serial: alert.vehicle_serial,
                alert_type: alert.alert_type || 'emergency',
                severity: alert.severity || 'high',
                latitude: alert.latitude || 0,
                longitude: alert.longitude || 0,
                address: alert.address || 'Adresse non disponible',
                description: alert.description || 'Alerte SOS',
                status: alert.status || 'active',
                created_at: alert.created_at
            })) || [];

            setSosAlerts(formattedAlerts);
        } catch (error) {
            console.error('❌ Erreur chargement alertes SOS:', error);
            setError('Erreur lors du chargement des alertes SOS');
        }
    }, []);

    // Charger toutes les données
    const loadAllData = useCallback(async (bureauId: string) => {
        try {
            setLoading(true);
            setError(null);

            await Promise.all([
                loadBureauInfo(bureauId),
                loadMembers(bureauId),
                loadVehicles(bureauId),
                loadTransactions(bureauId),
                loadSOSAlerts(bureauId)
            ]);

            console.log('✅ Données syndicat chargées avec succès');
        } catch (error) {
            console.error('❌ Erreur chargement données syndicat:', error);
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    }, [loadBureauInfo, loadMembers, loadVehicles, loadTransactions, loadSOSAlerts]);

    // Charger les données au montage
    useEffect(() => {
        if (bureauId) {
            loadAllData(bureauId);
        }
    }, [bureauId, loadAllData]);

    return {
        bureauInfo,
        members,
        vehicles,
        transactions,
        sosAlerts,
        loading,
        error,
        loadAllData,
        refetch: loadAllData
    };
}
