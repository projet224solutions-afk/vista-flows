import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useVendorSubscription } from '@/hooks/useVendorSubscription';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  Key, 
  Copy, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff,
  Activity,
  Zap,
  Shield,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';

interface ApiKey {
  id: string;
  key_name: string;
  api_key: string;
  plan_tier: string;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  is_active: boolean;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
}

const planLimits = {
  free: { perMinute: 10, perDay: 1000 },
  basic: { perMinute: 30, perDay: 5000 },
  pro: { perMinute: 100, perDay: 50000 },
  business: { perMinute: 500, perDay: 200000 },
  premium: { perMinute: -1, perDay: -1 } // Illimité
};

export function ApiKeyManager() {
  const { user } = useAuth();
  const { subscription } = useVendorSubscription();
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const [keys, setKeys] = useState<ApiKey[]>([]);

  const getDateLocale = (lang: string) => {
    if (lang === 'ar') return ar;
    if (lang === 'en') return enUS;
    return fr;
  };
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadKeys();
    }
  }, [user]);

  const loadKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys' as any)
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeys((data as any) || []);
    } catch (error) {
      console.error('Erreur chargement clés:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!user || !subscription) return;

    if (!newKeyName.trim()) {
      toast({
        title: t('apiKeys.toast.errorTitle'),
        description: t('apiKeys.toast.missingName'),
        variant: 'destructive'
      });
      return;
    }

    try {
      setCreating(true);
      const planName = subscription.plan_name?.toLowerCase() || 'free';
      const limits = planLimits[planName as keyof typeof planLimits] || planLimits.free;

      // Générer la clé API
      const { data: keyData, error: keyError } = await supabase
        .rpc('generate_api_key' as any);

      if (keyError) throw keyError;

      const { data, error } = await supabase
        .from('api_keys' as any)
        .insert({
          user_id: user.id,
          key_name: newKeyName,
          api_key: keyData,
          plan_tier: planName,
          rate_limit_per_minute: limits.perMinute,
          rate_limit_per_day: limits.perDay
        })
        .select()
        .single();

      if (error) throw error;

      setNewKey((data as any).api_key);
      setNewKeyName('');
      loadKeys();

      toast({
        title: t('apiKeys.toast.createdTitle'),
        description: t('apiKeys.toast.createdDescription')
      });
    } catch (error) {
      console.error('Erreur création clé:', error);
      toast({
        title: t('apiKeys.toast.errorTitle'),
        description: t('apiKeys.toast.createError'),
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('api_keys' as any)
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      toast({
        title: t('apiKeys.toast.deletedTitle'),
        description: t('apiKeys.toast.deletedDescription')
      });

      loadKeys();
    } catch (error) {
      console.error('Erreur suppression clé:', error);
      toast({
        title: t('apiKeys.toast.errorTitle'),
        description: t('apiKeys.toast.deleteError'),
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('apiKeys.toast.copiedTitle'),
      description: t('apiKeys.toast.copiedDescription')
    });
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const maskKey = (key: string) => {
    return key.substring(0, 12) + '•'.repeat(20);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('apiKeys.title')}</h2>
          <p className="text-muted-foreground">
            {t('apiKeys.description')}
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t('apiKeys.newKey')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('apiKeys.dialog.createTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('apiKeys.dialog.keyNameLabel')}</label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t('apiKeys.dialog.keyNamePlaceholder')}
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">{t('apiKeys.dialog.limitsPlan', { plan: subscription?.plan_name || 'free' })}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('apiKeys.dialog.perMinute')}</p>
                    <p className="font-bold">
                      {planLimits[subscription?.plan_name?.toLowerCase() as keyof typeof planLimits]?.perMinute === -1 
                        ? t('apiKeys.unlimited') 
                        : planLimits[subscription?.plan_name?.toLowerCase() as keyof typeof planLimits]?.perMinute || 10}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('apiKeys.dialog.perDay')}</p>
                    <p className="font-bold">
                      {planLimits[subscription?.plan_name?.toLowerCase() as keyof typeof planLimits]?.perDay === -1 
                        ? t('apiKeys.unlimited') 
                        : planLimits[subscription?.plan_name?.toLowerCase() as keyof typeof planLimits]?.perDay || 1000}
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={createApiKey} disabled={creating} className="w-full">
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('apiKeys.dialog.creating')}
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    {t('apiKeys.dialog.createAction')}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Nouvelle clé créée - à copier */}
      {newKey && (
        <Card className="border-primary">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">{t('apiKeys.newlyCreatedTitle')}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('apiKeys.newlyCreatedWarning')}
                </p>
                <div className="bg-muted p-3 rounded font-mono text-sm break-all">
                  {newKey}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(newKey)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des clés */}
      <div className="grid gap-4">
        {keys.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Key className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                {t('apiKeys.empty')}
              </p>
            </CardContent>
          </Card>
        ) : (
          keys.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {key.key_name}
                      {key.is_active ? (
                        <Badge className="bg-green-500">{t('apiKeys.status.active')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('apiKeys.status.inactive')}</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {visibleKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKeyVisibility(key.id)}
                    >
                      {visibleKeys.has(key.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(key.api_key)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteKey(key.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {t('apiKeys.limitPerMinute')}
                    </p>
                    <p className="font-bold">
                      {key.rate_limit_per_minute === -1 ? t('apiKeys.unlimited') : key.rate_limit_per_minute}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {t('apiKeys.usage')}
                    </p>
                    <p className="font-bold">{key.usage_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('apiKeys.plan')}</p>
                    <p className="font-bold capitalize">{key.plan_tier}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('apiKeys.lastUsed')}</p>
                    <p className="font-bold text-xs">
                      {key.last_used_at
                        ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true, locale: getDateLocale(language) })
                        : t('apiKeys.never')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
