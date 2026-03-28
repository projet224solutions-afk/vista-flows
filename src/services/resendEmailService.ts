import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

class ResendEmailService {
  private static instance: ResendEmailService;

  static getInstance(): ResendEmailService {
    if (!ResendEmailService.instance) {
      ResendEmailService.instance = new ResendEmailService();
    }
    return ResendEmailService.instance;
  }

  /**
   * Envoi OTP via Edge Function securisee (secret conserve cote serveur).
   */
  async sendMfaCode(to: string, code: string): Promise<boolean> {
    console.log('OTP generated:', code);
    console.log('Sending OTP to:', to);

    try {
      const userName = to.split('@')[0] || 'Utilisateur';
      const { data, error } = await supabase.functions.invoke('send-otp-email', {
        body: {
          email: to,
          otp: code,
          userType: 'agent',
          userName,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success('Code MFA envoye a votre email');
        return true;
      }

      throw new Error(data?.error || 'Erreur envoi OTP');
    } catch (error) {
      console.error('OTP send error:', error);
      this.showDevelopmentCode(code, to);
      return true;
    }
  }

  private showDevelopmentCode(code: string, email: string): void {
    console.log('MFA development code:', code);

    toast.success(`Code MFA: ${code}`, {
      duration: 120000,
      description: `Mode developpement - envoi serveur indisponible\nDestination: ${email}`,
      style: {
        background: '#3b82f6',
        color: 'white',
        fontSize: '18px',
        fontWeight: 'bold',
      },
    });

    setTimeout(() => {
      alert(`CODE MFA DE DEVELOPPEMENT\n\n${code}\n\nCopiez ce code pour continuer\n\nPour envoyer de vrais emails:\n1. Deployer la fonction send-otp-email\n2. Configurer RESEND_API_KEY cote Supabase`);
    }, 500);
  }
}

export const resendEmailService = ResendEmailService.getInstance();
export default resendEmailService;
