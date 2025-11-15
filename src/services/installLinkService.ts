// SERVICE D'ENVOI DE LIENS D'INSTALLATION (VERSION SIMPLIFIÉE)
import { supabase } from '@/integrations/supabase/client';

export interface InstallLinkData {
  bureauId: string;
  presidentName: string;
  presidentEmail?: string;
  presidentPhone?: string;
}

export interface InstallLinkResult {
  success: boolean;
  link?: string;
  message?: string;
}

class InstallLinkService {
  async generateInstallLink(data: InstallLinkData): Promise<InstallLinkResult> {
    return { success: false, message: 'Service non disponible' };
  }
}

export default new InstallLinkService();
