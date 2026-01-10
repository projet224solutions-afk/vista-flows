import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resolveShortLink } from '@/hooks/useDeepLinking';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Composant pour gérer les redirections de short URLs
 * Route: /s/:shortCode
 * 
 * Exemple: /s/Xy9Kp3Qr → /boutique/boulangerie-conakry
 */
export default function ShortUrlRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Empêcher les redirections multiples
    if (hasRedirected.current || isRedirecting) {
      return;
    }

    const handleRedirect = async () => {
      if (!shortCode) {
        console.error('[ShortUrlRedirect] No short code provided');
        toast.error('Lien invalide');
        navigate('/marketplace', { replace: true });
        return;
      }

      setIsRedirecting(true);
      hasRedirected.current = true;
      console.log('[ShortUrlRedirect] Resolving short code:', shortCode);

      try {
        const link = await resolveShortLink(shortCode);
        
        if (!link) {
          console.error('[ShortUrlRedirect] Short link not found:', shortCode);
          toast.error('Ce lien n\'existe pas ou a expiré');
          navigate('/marketplace', { replace: true });
          return;
        }

        console.log('[ShortUrlRedirect] Resolved to:', link.originalUrl);

        // Extraire le path de l'URL complète
        let targetPath = link.originalUrl;
        
        try {
          const url = new URL(link.originalUrl);
          targetPath = url.pathname + url.search + url.hash;
        } catch (urlError) {
          // C'est déjà un path relatif
          if (!link.originalUrl.startsWith('/')) {
            targetPath = '/' + link.originalUrl;
          }
        }

        console.log('[ShortUrlRedirect] Redirecting to:', targetPath);
        
        // Utiliser replace pour éviter d'ajouter à l'historique
        navigate(targetPath, { replace: true });
        
      } catch (error) {
        console.error('[ShortUrlRedirect] Error resolving short link:', error);
        toast.error('Erreur lors de la redirection');
        navigate('/marketplace', { replace: true });
      }
    };

    handleRedirect();
  }, [shortCode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        <div>
          <p className="text-lg font-medium text-foreground">Redirection en cours...</p>
          <p className="text-sm text-muted-foreground mt-2">Veuillez patienter</p>
        </div>
      </div>
    </div>
  );
}
