/**
 * 🔗 PAGE DE REDIRECTION SHORT URL
 * Résout les liens courts et redirige vers la page originale
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Link2Off, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ShortLinkRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<{
    title: string;
    type: string;
    originalUrl: string;
    targetPath: string;
  } | null>(null);
  
  // Protection contre double exécution
  const hasResolved = useRef(false);

  useEffect(() => {
    // Si déjà résolu ou pas de shortCode, ne rien faire
    if (!shortCode || hasResolved.current) {
      return;
    }
    
    hasResolved.current = true;
    resolveAndRedirect();
  }, [shortCode]);

  const resolveAndRedirect = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔗 [ShortLink] Resolving short code:', shortCode);

      const { data, error: fetchError } = await supabase
        .from('shared_links' as 'shared_links')
        .select('original_url, title, link_type, resource_id')
        .eq('short_code', shortCode as string)
        .eq('is_active', true)
        .maybeSingle();

      console.log('🔗 [ShortLink] Query result:', { data, fetchError });

      if (fetchError) {
        console.error('🔗 [ShortLink] Database error:', fetchError);
        setError('Erreur lors de la résolution du lien');
        setLoading(false);
        return;
      }
      
      if (!data) {
        console.error('🔗 [ShortLink] Link not found for code:', shortCode);
        setError('Lien introuvable ou expiré');
        setLoading(false);
        return;
      }

      console.log('🔗 [ShortLink] Found link data:', {
        originalUrl: data.original_url,
        title: data.title,
        linkType: data.link_type
      });

      // Incrémenter le compteur de vues
      (supabase.rpc as any)('increment_shared_link_views', { 
        p_short_code: shortCode 
      }).catch((e: any) => console.warn('Failed to increment views:', e));

      // Extraire le chemin relatif de l'URL originale
      let targetPath: string;
      
      try {
        const url = new URL(data.original_url);
        // Retirer les paramètres internes Lovable
        for (const key of Array.from(url.searchParams.keys())) {
          if (key.startsWith('__lovable')) url.searchParams.delete(key);
        }
        targetPath = url.pathname + url.search;
      } catch {
        // Si l'URL est déjà relative ou malformée
        targetPath = data.original_url.startsWith('/') 
          ? data.original_url 
          : `/${data.original_url}`;
      }

      console.log('🔗 [ShortLink] Target path extracted:', targetPath);

      // Stocker les infos pour affichage en cas d'échec de navigation
      setLinkInfo({
        title: data.title,
        type: data.link_type,
        originalUrl: data.original_url,
        targetPath
      });

      // ⚡ Utiliser React Router navigate() pour les chemins internes
      // Cela garantit une navigation SPA propre
      console.log('🔗 [ShortLink] Navigating to:', targetPath);
      
      // Utiliser navigate avec replace pour ne pas polluer l'historique
      navigate(targetPath, { replace: true });
      
      // Mettre loading à false car on a lancé la navigation
      setLoading(false);

    } catch (err) {
      console.error('🔗 [ShortLink] Error resolving short link:', err);
      setError('Erreur lors de la résolution du lien');
      setLoading(false);
      hasResolved.current = false; // Permettre un retry
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link2Off className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Lien invalide</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Ce lien de partage n'est plus valide ou a expiré.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/marketplace', { replace: true })} className="w-full">
                Voir le Marketplace
              </Button>
              <Button variant="outline" onClick={() => navigate('/', { replace: true })} className="w-full">
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si linkInfo existe mais qu'on est toujours ici, la navigation a peut-être échoué
  // Afficher un bouton de redirection manuelle
  if (linkInfo) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>{linkInfo.title}</CardTitle>
            <CardDescription>
              Cliquez pour accéder à cette {linkInfo.type === 'shop' ? 'boutique' : 'page'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate(linkInfo.targetPath, { replace: true })}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir le lien
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/', { replace: true })}
              className="w-full"
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
