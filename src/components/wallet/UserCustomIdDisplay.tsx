import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const UserCustomIdDisplay = () => {
  const { user } = useAuth();
  const [customId, setCustomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadCustomId();
    }
  }, [user?.id]);

  const loadCustomId = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_ids')
        .select('custom_id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setCustomId(data?.custom_id || null);
    } catch (error) {
      console.error('❌ Erreur chargement custom_id:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (customId) {
      navigator.clipboard.writeText(customId);
      setCopied(true);
      toast.success('Code copié dans le presse-papier !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-elegant">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!customId) {
    return null;
  }

  return (
    <Card className="shadow-elegant bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Votre Code d'Identification</CardTitle>
            <CardDescription>Partagez ce code pour recevoir des paiements</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between bg-background rounded-lg p-4 border-2 border-primary/20">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xl font-mono px-4 py-2">
              {customId}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="hover:bg-primary/10"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          💡 Les autres utilisateurs peuvent vous envoyer de l'argent avec ce code
        </p>
      </CardContent>
    </Card>
  );
};
