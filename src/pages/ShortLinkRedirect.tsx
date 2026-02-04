/**
 * 🔗 PAGE DE REDIRECTION SHORT URL
 * Résout les liens courts et redirige vers la page originale
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Link2Off, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface LinkInfo {
  title: string;
  type: string;
  originalUrl: string;
  targetPath: string;
}

export default function ShortLinkRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'fallback'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  
  // Compteur pour éviter les appels multiples
  const resolveCount = useRef(0);

  const resolveAndRedirect = useCallback(async () => {
    if (!shortCode) {
      setStatus('error');
      setErrorMessage('Code de lien manquant');
      return;
    }

    // Incrémenter le compteur et capturer la valeur
    const currentResolve = ++resolveCount.current;
    console.log('🔗 [ShortLink] Starting resolve #', currentResolve, 'for:', shortCode);

    try {
      const { data, error: fetchError } = await supabase
        .from('shared_links' as 'shared_links')
        .select('original_url, title, link_type, resource_id')
        .eq('short_code', shortCode)
        .eq('is_active', true)
        .maybeSingle();

      // Vérifier si un autre appel a été fait pendant qu'on attendait
      if (currentResolve !== resolveCount.current) {
        console.log('🔗 [ShortLink] Resolve #', currentResolve, 'cancelled (newer resolve in progress)');
        return;
      }

      console.log('🔗 [ShortLink] Query result:', { data, fetchError, currentResolve });

      if (fetchError) {
        console.error('🔗 [ShortLink] Database error:', fetchError);
        setStatus('error');
        setErrorMessage('Erreur lors de la résolution du lien');
        return;
      }
      
      if (!data) {
        console.error('🔗 [ShortLink] Link not found for code:', shortCode);
        setStatus('error');
        setErrorMessage('Lien introuvable ou expiré');
        return;
      }

      console.log('🔗 [ShortLink] Found link:', data.original_url);

      // Incrémenter le compteur de vues (fire and forget)
      (supabase.rpc as any)('increment_shared_link_views', { 
        p_short_code: shortCode 
      }).catch((e: any) => console.warn('Failed to increment views:', e));

      // Extraire le chemin relatif de l'URL originale
      let targetPath: string;
      const originalUrl = data.original_url;
      
      try {
        const url = new URL(originalUrl);
        // Retirer les paramètres internes Lovable
        for (const key of Array.from(url.searchParams.keys())) {
          if (key.startsWith('__lovable')) url.searchParams.delete(key);
        }
        targetPath = url.pathname + url.search;
        console.log('🔗 [ShortLink] Extracted path:', targetPath);
      } catch {
        // Si l'URL est déjà relative ou malformée
        targetPath = originalUrl.startsWith('/') 
          ? originalUrl 
          : `/${originalUrl}`;
        console.log('🔗 [ShortLink] Using fallback path:', targetPath);
      }

      // Préparer le fallback
      const info: LinkInfo = {
        title: data.title,
        type: data.link_type,
        originalUrl: originalUrl,
        targetPath
      };
      
      console.log('🔗 [ShortLink] Navigating to:', targetPath);
      
      // Effectuer la navigation
      navigate(targetPath, { replace: true });
      
      // Vérifier après un court délai si la navigation a réussi
      setTimeout(() => {
        if (window.location.pathname.startsWith('/s/')) {
          console.log('🔗 [ShortLink] Navigation may have failed, showing fallback UI');
          setLinkInfo(info);
          setStatus('fallback');
        } else {
          console.log('🔗 [ShortLink] Navigation succeeded');
        }
      }, 300);

    } catch (err) {
      console.error('🔗 [ShortLink] Unexpected error:', err);
      if (currentResolve === resolveCount.current) {
        setStatus('error');
        setErrorMessage('Erreur inattendue');
      }
    }
  }, [shortCode, navigate]);

  useEffect(() => {
    resolveAndRedirect();
  }, [resolveAndRedirect]);

  // État de chargement
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (status === 'error') {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link2Off className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Lien invalide</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
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

  // État fallback (navigation a échoué, afficher un bouton manuel)
  if (status === 'fallback' && linkInfo) {
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
