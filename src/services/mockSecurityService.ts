/**
 * SERVICE MOCK POUR LA SÉCURITÉ
 * Utilisé temporairement en attendant la configuration complète de la DB
 */

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity_level: string;
  source_module: string;
  event_data: Record<string, unknown>;
  created_at: string;
  ip_address?: string;
  threat_level?: string;
  auto_response_taken?: boolean;
}

export interface SecurityIncident {
  id: string;
  incident_id: string;
  title: string;
  description: string;
  incident_type: string;
  severity: string;
  status: string;
  created_at: string;
  affected_modules?: string[];
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
