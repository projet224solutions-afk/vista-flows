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

type Status = 'loading' | 'redirecting' | 'error' | 'fallback';

interface LinkInfo {
  title: string;
  type: string;
  targetPath: string;
}

export default function ShortLinkRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const hasResolved = useRef(false);

  useEffect(() => {
    if (!shortCode || hasResolved.current) return;
    hasResolved.current = true;

    resolveLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortCode]);

  const resolveLink = async () => {
    if (!shortCode) {
      setStatus('error');
      setErrorMessage('Code de lien manquant');
      return;
    }

    console.log('🔗 [ShortLink] Resolving:', shortCode);

    try {
      const { data, error } = await supabase
        .from('shared_links')
        .select('original_url, title, link_type')
        .eq('short_code', shortCode)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('🔗 [ShortLink] DB error:', error);
        setStatus('error');
        setErrorMessage('Erreur de connexion');
        return;
      }

      if (!data) {
        console.warn('🔗 [ShortLink] Not found:', shortCode);
        setStatus('error');
        setErrorMessage('Lien introuvable ou expiré');
        return;
      }

      // Verify original_url exists
      if (!data.original_url) {
        console.error('🔗 [ShortLink] No original_url in data');
        setStatus('error');
        setErrorMessage('Lien corrompu');
        return;
      }

      console.log('🔗 [ShortLink] Found:', data.original_url);

      // Increment views (fire and forget)
      (supabase.rpc as any)('increment_shared_link_views', { p_short_code: shortCode })
        .then(() => {})
        .catch(() => {});

      // Extract relative path
      let targetPath: string;
      try {
        const url = new URL(data.original_url);
        // Clean up Lovable preview params
        Array.from(url.searchParams.keys()).forEach(key => {
          if (key.startsWith('__lovable')) url.searchParams.delete(key);
        });
        targetPath = url.pathname + url.search + url.hash;
      } catch {
        // Handle relative URLs safely
        const originalUrl = data.original_url || '';
        targetPath = originalUrl.startsWith('/') 
          ? originalUrl 
          : `/${originalUrl}`;
      }

      console.log('🔗 [ShortLink] Target path:', targetPath);

      // Store link info for fallback
      setLinkInfo({
        title: data.title,
        type: data.link_type,
        targetPath
      });

      setStatus('redirecting');

      // Perform navigation
      navigate(targetPath, { replace: true });

      // Check if navigation succeeded after a short delay
      setTimeout(() => {
        // If we're still on /s/ path, show fallback button
        if (window.location.pathname.includes('/s/')) {
          console.log('🔗 [ShortLink] Navigation seems stuck, showing fallback');
          setStatus('fallback');
        }
      }, 500);

    } catch (err) {
      console.error('🔗 [ShortLink] Error:', err);
      setStatus('error');
      setErrorMessage('Erreur inattendue');
    }
  };

  const handleManualRedirect = () => {
    if (linkInfo?.targetPath) {
      window.location.href = linkInfo.targetPath;
    }
  };

  // Loading state
  if (status === 'loading' || status === 'redirecting') {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">
            {status === 'loading' ? 'Chargement...' : 'Redirection en cours...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state
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
          <CardContent className="space-y-3">
            <Button onClick={() => navigate('/marketplace', { replace: true })} className="w-full">
              Voir le Marketplace
            </Button>
            <Button variant="outline" onClick={() => navigate('/', { replace: true })} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback state (navigation failed)
  if (status === 'fallback' && linkInfo) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">{linkInfo.title}</CardTitle>
            <CardDescription>
              Cliquez pour accéder à {linkInfo.type === 'shop' ? 'cette boutique' : (linkInfo.type === 'product' || linkInfo.type === 'digital_product') ? 'ce produit' : 'cette page'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleManualRedirect} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir
            </Button>
            <Button variant="outline" onClick={() => navigate('/', { replace: true })} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
