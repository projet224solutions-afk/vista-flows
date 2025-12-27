/**
 * 🔗 PAGE DE REDIRECTION SHORT URL
 * Résout les liens courts et redirige vers la page originale
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Link2Off, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface SharedLinkData {
  original_url: string;
  title: string;
  link_type: string;
  resource_id: string | null;
}

export default function ShortLinkRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<{
    title: string;
    type: string;
    originalUrl: string;
  } | null>(null);

  useEffect(() => {
    if (shortCode) {
      resolveAndRedirect();
    }
  }, [shortCode]);

  const resolveAndRedirect = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les infos du lien (avec cast pour éviter les erreurs de type)
      const { data, error: fetchError } = await (supabase
        .from('shared_links' as any)
        .select('original_url, title, link_type, resource_id')
        .eq('short_code', shortCode)
        .single() as any) as { data: SharedLinkData | null; error: any };

      if (fetchError || !data) {
        setError('Lien introuvable ou expiré');
        setLoading(false);
        return;
      }

      // Incrémenter le compteur de vues (cast to any pour éviter les erreurs de type)
      await (supabase.rpc as any)('increment_shared_link_views', { 
        p_short_code: shortCode 
      });

      // Stocker les infos pour affichage en cas de besoin
      setLinkInfo({
        title: data.title,
        type: data.link_type,
        originalUrl: data.original_url
      });

      // Extraire le chemin relatif de l'URL originale
      try {
        const url = new URL(data.original_url);
        const relativePath = url.pathname + url.search;
        // Rediriger vers la page
        navigate(relativePath, { replace: true });
      } catch {
        // Si l'URL est déjà relative
        navigate(data.original_url, { replace: true });
      }

    } catch (err) {
      console.error('Error resolving short link:', err);
      setError('Erreur lors de la résolution du lien');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
              <Button onClick={() => navigate('/marketplace')} className="w-full">
                Voir le Marketplace
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si on arrive ici, c'est que la redirection n'a pas fonctionné
  // On affiche un lien manuel
  if (linkInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>{linkInfo.title}</CardTitle>
            <CardDescription>
              Cliquez pour accéder à cette {linkInfo.type === 'shop' ? 'boutique' : 'page'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = linkInfo.originalUrl}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir le lien
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
