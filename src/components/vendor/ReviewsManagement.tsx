/**
 * 💬 GESTION DES AVIS CLIENTS AVEC COPILOTE IA
 * Interface vendeur pour voir et répondre aux avis avec aide de l'IA
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Star, 
  MessageSquare, 
  Send, 
  Sparkles, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Clock,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  verified_purchase: boolean;
  vendor_response: string | null;
  vendor_response_at: string | null;
  created_at: string;
  products?: {
    name: string;
    images: any[];
  };
  profiles?: {
    full_name: string;
  };
}

export default function ReviewsManagement() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [response, setResponse] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<'pending' | 'answered'>('pending');

  useEffect(() => {
    if (user?.id) {
      loadVendorAndReviews();
    }
  }, [user?.id]);

  const loadVendorAndReviews = async () => {
    try {
      setLoading(true);

      // Récupérer l'ID du vendeur
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (vendorError || !vendor) {
        toast.error('Boutique introuvable');
        return;
      }

      setVendorId(vendor.id);

      // Récupérer les avis des produits du vendeur
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('product_reviews')
        .select(`
          *,
          products!inner(
            name,
            images,
            vendor_id
          )
        `)
        .eq('products.vendor_id', vendor.id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      // Mapper les données pour correspondre au type Review
      const mappedReviews: Review[] = (reviewsData || []).map((r: any) => ({
        ...r,
        profiles: { full_name: 'Client' } // Fallback car la relation directe ne fonctionne pas
      }));

      setReviews(mappedReviews);
    } catch (error: any) {
      console.error('Erreur chargement avis:', error);
      toast.error('Erreur lors du chargement des avis');
    } finally {
      setLoading(false);
    }
  };

  const generateAIResponse = async (review: Review) => {
    if (!review) return;

    setGeneratingAI(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        toast.error('Session expirée');
        return;
      }

      const functionsBaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1';
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

      const prompt = `Tu es un assistant IA pour un vendeur sur 224Solutions. 
      
Un client a laissé cet avis sur le produit "${review.products?.name || 'Produit'}" :

**Note:** ${review.rating}/5 étoiles
**Titre:** ${review.title}
**Commentaire:** ${review.content}

Génère une réponse professionnelle, courtoise et personnalisée de la part du vendeur. La réponse doit :
- Remercier le client pour son avis
- Être adaptée à la note (positive, neutre ou négative)
- Rester concise (2-3 phrases maximum)
- Être chaleureuse et professionnelle
- En français

Réponse:`;

      const res = await fetch(`${functionsBaseUrl}/vendor-ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: prompt,
          messages: []
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur génération IA');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let generatedText = '';

      if (reader) {
        let textBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                generatedText += content;
                setResponse(generatedText);
              }
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }
      }

      toast.success('Réponse générée par l\'IA !');
    } catch (error) {
      console.error('Erreur génération IA:', error);
      toast.error('Erreur lors de la génération de la réponse');
    } finally {
      setGeneratingAI(false);
    }
  };

  const submitResponse = async () => {
    if (!selectedReview || !response.trim()) {
      toast.error('Veuillez entrer une réponse');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({
          vendor_response: response.trim(),
          vendor_response_at: new Date().toISOString()
        })
        .eq('id', selectedReview.id);

      if (error) throw error;

      toast.success('Réponse publiée avec succès !');
      setResponse('');
      setSelectedReview(null);
      loadVendorAndReviews();
    } catch (error) {
      console.error('Erreur publication réponse:', error);
      toast.error('Erreur lors de la publication');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const pendingReviews = reviews.filter(r => !r.vendor_response);
  const answeredReviews = reviews.filter(r => r.vendor_response);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Gestion des Avis Clients
          </CardTitle>
          <CardDescription>
            Répondez aux avis de vos clients avec l'aide de l'IA Copilote
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste des avis */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <div className="p-4 pb-0">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    En attente ({pendingReviews.length})
                  </TabsTrigger>
                  <TabsTrigger value="answered" className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Répondus ({answeredReviews.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="pending" className="m-0">
                <ScrollArea className="h-[600px]">
                  {pendingReviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                      <p className="text-muted-foreground">
                        Tous les avis ont été traités !
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {pendingReviews.map((review) => (
                        <div
                          key={review.id}
                          className={`p-4 hover:bg-muted/50 cursor-pointer transition ${
                            selectedReview?.id === review.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => {
                            setSelectedReview(review);
                            setResponse('');
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                <User className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">
                                  {review.profiles?.full_name || 'Client'}
                                </span>
                                {review.verified_purchase && (
                                  <Badge variant="secondary" className="text-xs">
                                    ✓ Achat vérifié
                                  </Badge>
                                )}
                              </div>
                              {renderStars(review.rating)}
                              <p className="font-medium mt-2 text-sm">{review.title}</p>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {review.content}
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span>{review.products?.name}</span>
                                <span>•</span>
                                <span>
                                  {format(new Date(review.created_at), 'dd MMM yyyy', { locale: fr })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="answered" className="m-0">
                <ScrollArea className="h-[600px]">
                  {answeredReviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Aucune réponse publiée pour le moment
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {answeredReviews.map((review) => (
                        <div key={review.id} className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                <User className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">
                                  {review.profiles?.full_name || 'Client'}
                                </span>
                              </div>
                              {renderStars(review.rating)}
                              <p className="font-medium mt-2 text-sm">{review.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {review.content}
                              </p>
                            </div>
                          </div>

                          {review.vendor_response && (
                            <div className="ml-13 bg-primary/5 rounded-lg p-3 border border-primary/20">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="default" className="text-xs">
                                  Réponse du vendeur
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(review.vendor_response_at!), 'dd MMM yyyy', { locale: fr })}
                                </span>
                              </div>
                              <p className="text-sm">{review.vendor_response}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Panneau de réponse */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Répondre avec l'IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedReview ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Sélectionnez un avis pour y répondre
                </p>
              </div>
            ) : (
              <>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {selectedReview.profiles?.full_name || 'Client'}
                      </p>
                      {renderStars(selectedReview.rating)}
                    </div>
                  </div>
                  <p className="text-sm font-medium">{selectedReview.title}</p>
                  <p className="text-sm text-muted-foreground">{selectedReview.content}</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Votre réponse</label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateAIResponse(selectedReview)}
                      disabled={generatingAI}
                      className="gap-2"
                    >
                      {generatingAI ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Génération...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          Générer avec l'IA
                        </>
                      )}
                    </Button>
                  </div>

                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Écrivez votre réponse ou utilisez l'IA pour générer une suggestion..."
                    rows={6}
                    className="resize-none"
                  />

                  <Button
                    onClick={submitResponse}
                    disabled={!response.trim() || submitting}
                    className="w-full gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Publication...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Publier la réponse
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
