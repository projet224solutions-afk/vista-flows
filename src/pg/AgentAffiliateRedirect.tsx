/**
 * PAGE DE REDIRECTION POUR LIEN D'AFFILIATION AGENT
 * Stocke le token d'affiliation et redirige vers la page de connexion
 * 224SOLUTIONS
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AgentAffiliateRedirect() {
  const [searchParams] = useSearchParams();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  // Token depuis URL params ou query string
  const affiliateToken = token || searchParams.get('ref');
  
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [agentName, setAgentName] = useState<string | null>(null);

  useEffect(() => {
    if (affiliateToken) {
      validateAndRedirect();
    } else {
      // Pas de token, rediriger directement vers /auth
      navigate('/auth');
    }
  }, [affiliateToken]);

  const validateAndRedirect = async () => {
    try {
      // Valider que le token existe
      if (!affiliateToken || affiliateToken.trim() === '') {
        throw new Error('Token d\'affiliation manquant');
      }

      // Valider le token aupr├¿s de la Edge Function
      // CORRECT: utiliser le chemin avec query params dans l'URL de invoke
      const { data, error } = await supabase.functions.invoke(
        'agent-affiliate-link',
        {
          body: {
            action: 'validate-token',
            token: affiliateToken
          }
        }
      );

      if (error) {
        console.error('Erreur Edge Function:', error);
        throw error;
      }

      if (data?.valid) {
        setStatus('valid');
        setAgentName(data.agent_name || 'Agent');

        // Stocker le token d'affiliation dans localStorage
        localStorage.setItem('affiliate_token', affiliateToken);
        localStorage.setItem('affiliate_agent_name', data.agent_name || 'Agent');
        localStorage.setItem('affiliate_agent_id', data.agent_id || '');
        localStorage.setItem('affiliate_target_role', data.target_role || 'all');
        localStorage.setItem('affiliate_timestamp', Date.now().toString());

        // Enregistrer le clic
        try {
          await supabase.functions.invoke(
            'agent-affiliate-link',
            {
              body: {
                action: 'track-click',
                token: affiliateToken
              }
            }
          );
        } catch (e) {
          console.warn('Erreur tracking clic:', e);
        }

        toast.success(`Bienvenue !`, {
          description: `Vous avez ├®t├® invit├® par ${data.agent_name || 'un agent'}. Cr├®ez votre compte pour continuer.`
        });

        // Rediriger vers la page de connexion apr├¿s un court d├®lai
        setTimeout(() => {
          navigate('/auth', { 
            state: { 
              fromAffiliate: true,
              agentName: data.agent_name,
              targetRole: data.target_role
            } 
          });
        }, 1500);
      } else {
        setStatus('invalid');
        toast.error('Lien invalide ou expir├®', {
          description: 'Ce lien d\'affiliation n\'est plus valide.'
        });
        
        // Rediriger vers /auth quand m├¬me apr├¿s un d├®lai
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur validation token:', error);
      setStatus('invalid');
      
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardContent className="pt-8 pb-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">V├®rification du lien...</h2>
              <p className="text-muted-foreground">Veuillez patienter</p>
            </>
          )}

          {status === 'valid' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-green-700">Lien v├®rifi├® !</h2>
              <p className="text-muted-foreground mb-4">
                Invitation de <span className="font-semibold text-primary">{agentName}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Redirection vers la page d'inscription...
              </p>
            </>
          )}

          {status === 'invalid' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-red-700">Lien invalide</h2>
              <p className="text-muted-foreground mb-4">
                Ce lien d'affiliation n'existe pas ou a expir├®.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirection vers la page de connexion...
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
