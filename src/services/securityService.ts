/**
 * 🔒 SERVICE DE SÉCURITÉ - VERSION SIMPLIFIÉE
 * Version simplifiée pour éviter les erreurs TypeScript
 */

import { MockSecurityService, type SecurityEvent, type SecurityIncident } from './mockSecurityService';

export type { SecurityEvent, SecurityIncident };

export class SecurityService {
  static async getSecurityEvents(): Promise<SecurityEvent[]> {
    return MockSecurityService.getSecurityEvents();
  }

  static async getSecurityIncidents(): Promise<SecurityIncident[]> {
    return MockSecurityService.getSecurityIncidents();
  }

  static async calculateThreatScore(userId: string): Promise<number> {
    return MockSecurityService.calculateThreatScore(userId);
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
