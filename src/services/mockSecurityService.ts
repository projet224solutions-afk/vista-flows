/**
 * SERVICE MOCK POUR LA SÉCURITÉ
 * Utilisé temporairement en attendant la configuration complète de la DB
 */

export interface SecurityEvent {
  event_type: string;
  severity_level: string;
  source_module: string;
  event_data: any;
  created_at: string;
}

export interface SecurityIncident {
  incident_id: string;
  title: string;
  description: string;
  incident_type: string;
  severity: string;
  status: string;
  created_at: string;
}

export class MockSecurityService {
  static async getSecurityEvents(): Promise<SecurityEvent[]> {
    return [];
  }

  static async getSecurityIncidents(): Promise<SecurityIncident[]> {
    return [];
  }

  static async calculateThreatScore(userId: string): Promise<number> {
    return 0;
  }
}
