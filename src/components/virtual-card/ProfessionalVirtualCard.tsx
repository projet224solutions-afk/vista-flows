import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Eye, 
  EyeOff, 
  Copy, 
  Plus,
  Wifi,
  Lock,
  Shield,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Snowflake
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VirtualCardData {
  id: string;
  card_number: string;
  expiry_date: string;
  status: string;
  cvv: string;
  holder_name: string | null;
  daily_limit: number | null;
  monthly_limit: number | null;
}

interface WalletData {
  id: string;
  balance: number;
  currency: string;
}

export const ProfessionalVirtualCard = () => {
  const { user, profile } = useAuth();
  const [card, setCard] = useState<VirtualCardData | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [walletRes, cardRes] = await Promise.all([
        supabase.from('wallets').select('id, balance, currency').eq('user_id', user.id).maybeSingle(),
        supabase.from('virtual_cards').select('*').eq('user_id', user.id).maybeSingle()
      ]);
      setWallet(walletRes.data);
      setCard(cardRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCard = async () => {
    if (!user || !wallet) {
      toast.error('Un wallet actif est requis');
      return;
    }
    setCreating(true);
    try {
      const cardNumber = '5245' + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
      const cvv = Math.floor(Math.random() * 900 + 100).toString();
      const expiry = new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000);
      const holderName = profile?.first_name && profile?.last_name 
        ? `${profile.first_name} ${profile.last_name}`.toUpperCase()
        : 'UTILISATEUR 224PAY';

      const { error } = await supabase.from('virtual_cards').insert({
        user_id: user.id,
        card_number: cardNumber,
        holder_name: holderName,
        expiry_date: expiry.toISOString(),
        cvv,
        daily_limit: 1000000,
        monthly_limit: 10000000,
        status: 'active'
      });

      if (error) throw error;
      toast.success('Carte virtuelle créée avec succès !');
      await loadData();
    } catch (error) {
      console.error('Error creating card:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  };

  const formatCardNumber = (num: string, masked = true) => {
    if (masked) return num.replace(/(.{4})(.{4})(.{4})(.{4})/, '$1 •••• •••• $4');
    return num.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (date: string) => {
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      active: { color: 'bg-emerald-500', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Active' },
      frozen: { color: 'bg-blue-500', icon: <Snowflake className="w-3 h-3" />, label: 'Gelée' },
      blocked: { color: 'bg-red-500', icon: <AlertTriangle className="w-3 h-3" />, label: 'Bloquée' }
    };
    return configs[status] || configs.active;
  };

  if (loading) {
    return (
      <Button disabled variant="outline" className="gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Chargement...
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={card ? "default" : "outline"} 
          className={cn(
            "gap-2 transition-all",
            card && "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
          )}
        >
          <CreditCard className="w-4 h-4" />
          {card ? 'Ma Carte' : 'Créer une Carte'}
          {card && <CheckCircle2 className="w-3 h-3 text-emerald-300" />}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg p-0 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span>Carte Virtuelle 224PAY</span>
              {card && (
                <Badge className={cn("ml-auto", getStatusConfig(card.status).color)}>
                  {getStatusConfig(card.status).icon}
                  <span className="ml-1">{getStatusConfig(card.status).label}</span>
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {card ? (
            <div className="space-y-4">
              {/* Card Visual */}
              <div 
                className="relative cursor-pointer perspective-1000"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div className={cn(
                  "relative w-full aspect-[1.586/1] rounded-2xl transition-all duration-700 transform-style-preserve-3d",
                  isFlipped && "rotate-y-180"
                )}>
                  {/* Front */}
                  <div className={cn(
                    "absolute inset-0 backface-hidden",
                    isFlipped && "invisible"
                  )}>
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-6 flex flex-col justify-between shadow-2xl overflow-hidden">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/20" />
                        <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-white/10" />
                      </div>

                      {/* Header */}
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                          <div className="text-white font-bold text-lg tracking-wider">224PAY</div>
                          <Badge variant="outline" className="text-white/80 border-white/30 text-xs">
                            PREMIUM
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wifi className="w-5 h-5 text-white/80 rotate-90" />
                          <Shield className="w-5 h-5 text-white/80" />
                        </div>
                      </div>

                      {/* Chip */}
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-9 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center">
                          <div className="w-8 h-6 border-2 border-amber-600/50 rounded-sm" />
                        </div>
                      </div>

                      {/* Card Number */}
                      <div className="space-y-2 relative z-10">
                        <div className="flex items-center gap-2">
                          <p className="text-white/60 text-xs font-medium tracking-wider">NUMÉRO DE CARTE</p>
                          {showDetails && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0 text-white/60 hover:text-white hover:bg-white/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(card.card_number, 'Numéro');
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-white text-xl font-mono tracking-[0.2em]">
                            {formatCardNumber(card.card_number, !showDetails)}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-white/60 hover:text-white hover:bg-white/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDetails(!showDetails);
                            }}
                          >
                            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-end justify-between relative z-10">
                        <div>
                          <p className="text-white/60 text-xs font-medium tracking-wider mb-1">TITULAIRE</p>
                          <p className="text-white font-semibold tracking-wide text-sm">{card.holder_name || 'UTILISATEUR'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/60 text-xs font-medium tracking-wider mb-1">EXPIRE</p>
                          <p className="text-white font-semibold">{formatExpiry(card.expiry_date)}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex">
                            <div className="w-8 h-8 rounded-full bg-red-500 opacity-80" />
                            <div className="w-8 h-8 rounded-full bg-yellow-500 opacity-80 -ml-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Back */}
                  <div className={cn(
                    "absolute inset-0 backface-hidden rotate-y-180",
                    !isFlipped && "invisible"
                  )}>
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 flex flex-col shadow-2xl overflow-hidden">
                      {/* Magnetic Strip */}
                      <div className="w-full h-12 bg-slate-900 mt-6" />
                      
                      {/* Signature & CVV */}
                      <div className="flex-1 p-6 flex flex-col justify-center">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-10 bg-white/90 rounded flex items-center px-3">
                            <span className="text-slate-400 italic text-sm">{card.holder_name}</span>
                          </div>
                          <div className="bg-white px-4 py-2 rounded">
                            <p className="text-xs text-slate-500 mb-1">CVV</p>
                            <p className="text-slate-900 font-mono font-bold text-lg tracking-wider">
                              {showDetails ? card.cvv : '•••'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-4 text-center">
                          <p className="text-white/60 text-xs">
                            Cette carte est la propriété de 224PAY. En cas de perte, veuillez la retourner.
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="px-6 pb-4 flex items-center justify-between">
                        <div className="text-white/60 text-xs">
                          <Lock className="w-3 h-3 inline mr-1" />
                          Sécurisée par Stripe
                        </div>
                        <div className="text-white/60 text-xs">224SOLUTIONS</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-center text-white/40 text-xs mt-2">
                  Cliquez pour retourner la carte
                </p>
              </div>

              {/* Wallet Info */}
              {wallet && (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                          <Zap className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-white/60 text-xs">Solde disponible</p>
                          <p className="text-white font-bold text-xl">
                            {wallet.balance.toLocaleString('fr-FR')} <span className="text-sm text-white/60">{wallet.currency}</span>
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
                        Lié
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Limits Info */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-3">
                    <p className="text-white/60 text-xs mb-1">Limite journalière</p>
                    <p className="text-white font-semibold">
                      {(card.daily_limit || 0).toLocaleString('fr-FR')} GNF
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-3">
                    <p className="text-white/60 text-xs mb-1">Limite mensuelle</p>
                    <p className="text-white font-semibold">
                      {(card.monthly_limit || 0).toLocaleString('fr-FR')} GNF
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Stripe Integration Notice */}
              <Card className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-violet-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                      <Shield className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Sécurisée par Stripe</p>
                      <p className="text-white/60 text-xs mt-1">
                        Votre carte virtuelle utilise l'infrastructure de paiement Stripe pour des transactions sécurisées.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview Card */}
              <div className="relative">
                <div className="w-full aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-slate-600/50 via-slate-500/50 to-slate-600/50 p-6 flex flex-col justify-between border border-dashed border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="text-white/40 font-bold text-lg">224PAY</div>
                    <Badge variant="outline" className="text-white/40 border-white/20">PREVIEW</Badge>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                      <Plus className="w-8 h-8 text-white/40" />
                    </div>
                    <p className="text-white/60 text-sm">Créez votre carte virtuelle</p>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-white/30 text-sm">•••• •••• •••• ••••</div>
                    <div className="flex">
                      <div className="w-6 h-6 rounded-full bg-white/20" />
                      <div className="w-6 h-6 rounded-full bg-white/10 -ml-2" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-white/80">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm">Paiements en ligne sécurisés</span>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm">Limite journalière : 1 000 000 GNF</span>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm">Activation instantanée</span>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm">Sécurisée par Stripe</span>
                </div>
              </div>

              {/* Wallet Requirement */}
              {!wallet ? (
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="text-amber-400 font-medium text-sm">Wallet requis</p>
                        <p className="text-white/60 text-xs">
                          Vous devez avoir un wallet actif pour créer une carte virtuelle.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  onClick={createCard}
                  disabled={creating}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 h-12 text-base"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Créer ma carte virtuelle
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfessionalVirtualCard;
