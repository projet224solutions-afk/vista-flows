/**
 * Hook: Statistiques Beauté par SERVICE PROFESSIONNEL
 * Utilise professional_service_id pour les requêtes sur beauty_appointments, beauty_services, etc.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

interface SalesStats {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
}

export interface ServiceBeautyStats {
  appointments: AppointmentStats;
  sales: SalesStats;
  services: {
    total: number;
    active: number;
  };
  staff: {
    total: number;
  };
  todayAppointments: number;
  upcomingAppointments: number;
  hasData: boolean;
}

export interface RecentBeautyAppointment {
  id: string;
  status: string;
  total_price: number;
  appointment_date: string;
  customer_name?: string;
  service_name?: string;
  staff_name?: string;
}

function calculateAppointmentStats(appointments: any[]): AppointmentStats {
  return {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };
}

function calculateSalesStats(appointments: any[], startOfDay: Date, startOfWeek: Date, startOfMonth: Date): SalesStats {
  const completedAppointments = appointments.filter(a => a.status === 'completed');
  const totalRevenue = completedAppointments.reduce((sum, a) => sum + (a.total_price || 0), 0);
  const todayAppointments = completedAppointments.filter(a => new Date(a.appointment_date) >= startOfDay);
  const weekAppointments = completedAppointments.filter(a => new Date(a.appointment_date) >= startOfWeek);
  const monthAppointments = completedAppointments.filter(a => new Date(a.appointment_date) >= startOfMonth);

  return {
    totalRevenue,
    todayRevenue: todayAppointments.reduce((sum, a) => sum + (a.total_price || 0), 0),
    weekRevenue: weekAppointments.reduce((sum, a) => sum + (a.total_price || 0), 0),
    monthRevenue: monthAppointments.reduce((sum, a) => sum + (a.total_price || 0), 0),
  };
}

const defaultStats: ServiceBeautyStats = {
  appointments: { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
  sales: { totalRevenue: 0, todayRevenue: 0, weekRevenue: 0, monthRevenue: 0 },
  services: { total: 0, active: 0 },
  staff: { total: 0 },
  todayAppointments: 0,
  upcomingAppointments: 0,
  hasData: false,
};

export function useServiceBeautyStats(serviceId?: string) {
  const [stats, setStats] = useState<ServiceBeautyStats | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<RecentBeautyAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!serviceId) {
      console.log('⚠️ useServiceBeautyStats - Pas de serviceId fourni');
      setStats(defaultStats);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('💅 Chargement stats beauté pour serviceId:', serviceId);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // 1. Charger les rendez-vous
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('beauty_appointments')
        .select('id, status, total_price, appointment_date, customer_name')
        .eq('professional_service_id', serviceId)
        .order('appointment_date', { ascending: false });

      if (appointmentsError) {
        console.log('⚠️ Table beauty_appointments peut ne pas exister:', appointmentsError.message);
      }

      const appointments = appointmentsData || [];
      console.log('📅 Rendez-vous trouvés:', appointments.length);

      // Calculate stats
      const appointmentStats = calculateAppointmentStats(appointments);
      const salesStats = calculateSalesStats(appointments, startOfDay, startOfWeek, startOfMonth);

      // Aujourd'hui et à venir
      const today = appointments.filter(a => 
        new Date(a.appointment_date).toDateString() === now.toDateString() &&
        ['pending', 'confirmed'].includes(a.status)
      );
      const upcoming = appointments.filter(a => 
        new Date(a.appointment_date) > now &&
        ['pending', 'confirmed'].includes(a.status)
      );

      // 2. Charger les services
      const { data: servicesData, error: servicesError } = await supabase
        .from('beauty_services')
        .select('id, is_active')
        .eq('professional_service_id', serviceId);

      if (servicesError) {
        console.log('⚠️ Table beauty_services peut ne pas exister:', servicesError.message);
      }

      const services = servicesData || [];
      console.log('💇 Services trouvés:', services.length);

      // 3. Charger le personnel
      const { data: staffData, error: staffError } = await supabase
        .from('beauty_staff')
        .select('id')
        .eq('professional_service_id', serviceId);

      if (staffError) {
        console.log('⚠️ Table beauty_staff peut ne pas exister:', staffError.message);
      }

      const staff = staffData || [];
      console.log('👥 Staff trouvé:', staff.length);

      const hasData = appointments.length > 0 || services.length > 0 || staff.length > 0;

      setStats({
        appointments: appointmentStats,
        sales: salesStats,
        services: {
          total: services.length,
          active: services.filter(s => s.is_active !== false).length,
        },
        staff: {
          total: staff.length,
        },
        todayAppointments: today.length,
        upcomingAppointments: upcoming.length,
        hasData,
      });

      // Récents rendez-vous
      setRecentAppointments(
        appointments.slice(0, 10).map(a => ({
          id: a.id,
          status: a.status,
          total_price: a.total_price || 0,
          appointment_date: a.appointment_date,
          customer_name: a.customer_name,
        }))
      );

    } catch (err) {
      console.error('❌ Erreur inattendue:', err);
      setError('Erreur de chargement des statistiques beauté');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    recentAppointments,
    loading,
    error,
    refresh: loadStats,
  };
}
