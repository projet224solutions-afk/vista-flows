/**
 * 🔒 SERVICE DE SÉCURITÉ - VERSION SIMPLIFIÉE
 * Version simplifiée pour éviter les erreurs TypeScript
 */

import { supabase } from '@/lib/supabase';
import { MockSecurityService, type SecurityEvent, type SecurityIncident } from './mockSecurityService';

export type { SecurityEvent, SecurityIncident };

export class SecurityService {
  static async getSecurityEvents(): Promise<SecurityEvent[]> {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching security events:', error);
      return [];
    }
  }

  static async getSecurityIncidents(): Promise<SecurityIncident[]> {
    try {
      const { data, error } = await supabase
        .from('security_incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching security incidents:', error);
      return [];
    }
  }

  static async calculateThreatScore(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('calculate_threat_score', {
        p_user_id: userId
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error calculating threat score:', error);
      return 0;
    }
  }

  static async generateSecurityId(): Promise<string> {
    return `SEC-${Date.now()}`;
  }

  static async createIncident(incident: any): Promise<SecurityIncident> {
    const incidentId = `INC-${Date.now()}`;
    return {
      id: incidentId,
      incident_id: incidentId,
      title: incident.title || 'Nouvel incident',
      description: incident.description || '',
      incident_type: incident.incident_type || 'security',
      severity: incident.severity || 'medium',
      status: 'open',
      created_at: new Date().toISOString(),
      affected_modules: incident.affected_modules || []
    };
  }

  static async updateIncident(incidentId: string, updates: any): Promise<void> {}

  static async closeIncident(incidentId: string): Promise<void> {}
}

export default SecurityService;
