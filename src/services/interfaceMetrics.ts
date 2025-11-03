import { supabase } from '@/integrations/supabase/client';

export interface RealInterfaceMetrics {
  interface: string;
  activeUsers: number;
  transactions: number;
  errors: number;
  performance: number;
  revenue?: number;
  lastActivity?: string;
}

export class InterfaceMetricsService {
  // Récupérer les métriques des vendeurs
  static async getVendorMetrics(): Promise<RealInterfaceMetrics> {
    try {
      // Compter les vendeurs actifs
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'vendeur');

      // Compter les produits (transactions)
      const { count: transactions } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Compter les erreurs liées aux vendeurs
      const { count: errors } = await supabase
        .from('system_errors')
        .select('*', { count: 'exact', head: true })
        .ilike('module', '%vendeur%');

      return {
        interface: 'Vendeurs',
        activeUsers: activeUsers || 0,
        transactions: transactions || 0,
        errors: errors || 0,
        performance: 95 - (errors || 0) * 2,
      };
    } catch (error) {
      console.error('Error getting vendor metrics:', error);
      return {
        interface: 'Vendeurs',
        activeUsers: 0,
        transactions: 0,
        errors: 0,
        performance: 0,
      };
    }
  }

  // Récupérer les métriques des clients
  static async getClientMetrics(): Promise<RealInterfaceMetrics> {
    try {
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');

      const { count: transactions } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      const { count: errors } = await supabase
        .from('system_errors')
        .select('*', { count: 'exact', head: true })
        .ilike('module', '%client%');

      return {
        interface: 'Clients',
        activeUsers: activeUsers || 0,
        transactions: transactions || 0,
        errors: errors || 0,
        performance: 95 - (errors || 0) * 2,
      };
    } catch (error) {
      console.error('Error getting client metrics:', error);
      return {
        interface: 'Clients',
        activeUsers: 0,
        transactions: 0,
        errors: 0,
        performance: 0,
      };
    }
  }

  // Récupérer les métriques des livreurs
  static async getDeliveryMetrics(): Promise<RealInterfaceMetrics> {
    try {
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'livreur');

      const { count: transactions } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true });

      const { count: errors } = await supabase
        .from('system_errors')
        .select('*', { count: 'exact', head: true })
        .ilike('module', '%livreur%');

      return {
        interface: 'Livreurs',
        activeUsers: activeUsers || 0,
        transactions: transactions || 0,
        errors: errors || 0,
        performance: 95 - (errors || 0) * 2,
      };
    } catch (error) {
      console.error('Error getting delivery metrics:', error);
      return {
        interface: 'Livreurs',
        activeUsers: 0,
        transactions: 0,
        errors: 0,
        performance: 0,
      };
    }
  }

  // Récupérer les métriques des agents
  static async getAgentMetrics(): Promise<RealInterfaceMetrics> {
    try {
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      const { count: errors } = await supabase
        .from('system_errors')
        .select('*', { count: 'exact', head: true })
        .ilike('module', '%agent%');

      return {
        interface: 'Agents',
        activeUsers: activeUsers || 0,
        transactions: 0,
        errors: errors || 0,
        performance: 95 - (errors || 0) * 2,
      };
    } catch (error) {
      console.error('Error getting agent metrics:', error);
      return {
        interface: 'Agents',
        activeUsers: 0,
        transactions: 0,
        errors: 0,
        performance: 0,
      };
    }
  }

  // Récupérer les métriques des bureaux syndicats
  static async getBureauMetrics(): Promise<RealInterfaceMetrics> {
    try {
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'syndicat');

      const { count: errors } = await supabase
        .from('system_errors')
        .select('*', { count: 'exact', head: true })
        .ilike('module', '%bureau%');

      return {
        interface: 'Bureaux Syndicats',
        activeUsers: activeUsers || 0,
        transactions: 0,
        errors: errors || 0,
        performance: 95 - (errors || 0) * 2,
      };
    } catch (error) {
      console.error('Error getting bureau metrics:', error);
      return {
        interface: 'Bureaux Syndicats',
        activeUsers: 0,
        transactions: 0,
        errors: 0,
        performance: 0,
      };
    }
  }

  // Récupérer les métriques des transitaires
  static async getTransitaireMetrics(): Promise<RealInterfaceMetrics> {
    try {
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'transitaire');

      const { count: errors } = await supabase
        .from('system_errors')
        .select('*', { count: 'exact', head: true })
        .ilike('module', '%transitaire%');

      return {
        interface: 'Transitaires',
        activeUsers: activeUsers || 0,
        transactions: 0,
        errors: errors || 0,
        performance: 95 - (errors || 0) * 2,
      };
    } catch (error) {
      console.error('Error getting transitaire metrics:', error);
      return {
        interface: 'Transitaires',
        activeUsers: 0,
        transactions: 0,
        errors: 0,
        performance: 0,
      };
    }
  }

  // Récupérer les métriques des taxi-motos
  static async getTaxiMotoMetrics(): Promise<RealInterfaceMetrics> {
    try {
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'taxi');

      const { count: errors } = await supabase
        .from('system_errors')
        .select('*', { count: 'exact', head: true })
        .ilike('module', '%taxi%');

      return {
        interface: 'Taxi-motos',
        activeUsers: activeUsers || 0,
        transactions: 0,
        errors: errors || 0,
        performance: 95 - (errors || 0) * 2,
      };
    } catch (error) {
      console.error('Error getting taxi-moto metrics:', error);
      return {
        interface: 'Taxi-motos',
        activeUsers: 0,
        transactions: 0,
        errors: 0,
        performance: 0,
      };
    }
  }

  // Récupérer toutes les métriques en une fois
  static async getAllMetrics(): Promise<RealInterfaceMetrics[]> {
    const [
      vendorMetrics,
      clientMetrics,
      deliveryMetrics,
      agentMetrics,
      bureauMetrics,
      transitaireMetrics,
      taxiMotoMetrics,
    ] = await Promise.all([
      this.getVendorMetrics(),
      this.getClientMetrics(),
      this.getDeliveryMetrics(),
      this.getAgentMetrics(),
      this.getBureauMetrics(),
      this.getTransitaireMetrics(),
      this.getTaxiMotoMetrics(),
    ]);

    return [
      vendorMetrics,
      clientMetrics,
      deliveryMetrics,
      agentMetrics,
      bureauMetrics,
      transitaireMetrics,
      taxiMotoMetrics,
    ];
  }
}
