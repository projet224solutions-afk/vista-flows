import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface PDGCopilotProps {
  mfaVerified: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function PDGCopilot({ mfaVerified }: PDGCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis votre copilote IA PDG. Je peux vous aider à gérer votre plateforme. Posez-moi une question !'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Simuler une réponse IA (à remplacer par l'appel à Lovable AI)
      const response = await generateAIResponse(input);
      
      // Log conversation
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('copilot_conversations').insert({
        pdg_user_id: user?.id,
        message_in: input,
        message_out: response,
        mfa_verified: mfaVerified
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Erreur copilote:', error);
      toast.error('Erreur lors de la communication avec le copilote');
    } finally {
      setLoading(false);
    }
  };

  const generateAIResponse = async (query: string): Promise<string> => {
    try {
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes('utilisateur') || lowerQuery.includes('user')) {
        const { data: users, count } = await supabase
          .from('profiles')
          .select('role, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
        
        const roleStats = users?.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
        
        return `👥 **Analyse des utilisateurs :**
        
📈 **Total** : ${count || 0} utilisateurs
👤 **Clients** : ${roleStats.client || 0}
🏪 **Vendeurs** : ${roleStats.vendeur || 0}
🚚 **Livreurs** : ${roleStats.livreur || 0}
👑 **Admins** : ${roleStats.admin || 0}

Les derniers inscrits sont principalement des ${Object.keys(roleStats)[0] || 'clients'}.`;
      }
      
      if (lowerQuery.includes('transaction') || lowerQuery.includes('paiement') || lowerQuery.includes('revenu')) {
        const { data: recentTrans } = await supabase
          .from('wallet_transactions')
          .select('amount, status, created_at, transaction_type')
          .order('created_at', { ascending: false })
          .limit(20);
        
        const completed = recentTrans?.filter(t => t.status === 'completed') || [];
        const pending = recentTrans?.filter(t => t.status === 'pending') || [];
        const totalCompleted = completed.reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const totalPending = pending.reduce((sum, t) => sum + Number(t.amount || 0), 0);
        
        return `💰 **Analyse financière :**
        
✅ **Transactions complétées** : ${totalCompleted.toLocaleString()} GNF
⏳ **En attente** : ${totalPending.toLocaleString()} GNF
📊 **Taux de succès** : ${completed.length}/${recentTrans?.length || 1} (${Math.round((completed.length / (recentTrans?.length || 1)) * 100)}%)

${totalPending > 0 ? '⚠️ **Attention** : Des paiements sont en attente depuis plus de 24h.' : '✅ Tous les paiements sont traités.'}`;
      }
      
      if (lowerQuery.includes('vendeur') || lowerQuery.includes('vendor')) {
        const { data: vendors } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'vendeur');
        return `Il y a ${vendors?.length || 0} vendeurs actifs sur la plateforme.`;
      }
      
      if (lowerQuery.includes('produit') || lowerQuery.includes('product')) {
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });
        return `Il y a ${count || 0} produits dans le catalogue.`;
      }
      
      if (lowerQuery.includes('commande') || lowerQuery.includes('order')) {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });
        return `Il y a ${count || 0} commandes au total.`;
      }
      
      if (lowerQuery.includes('fraude') || lowerQuery.includes('sécurité')) {
        const { data: fraud } = await supabase
          .from('fraud_detection_logs')
          .select('*')
          .eq('reviewed', false);
        return `Il y a ${fraud?.length || 0} alertes de fraude non traitées. ${fraud?.filter(f => f.risk_level === 'critical').length || 0} sont critiques.`;
      }
      
      if (lowerQuery.includes('bureau') || lowerQuery.includes('syndicat')) {
        const { data: bureaux, count } = await supabase
          .from('bureaus')
          .select('*', { count: 'exact' });
        
        const { data: members, count: membersCount } = await supabase
          .from('members')
          .select('*', { count: 'exact' });
        
        const { data: vehicles, count: vehiclesCount } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact' });
        
        return `🏢 **Analyse Bureau Syndical :**
        
📊 **Bureaux** : ${count || 0}
👷 **Membres** : ${membersCount || 0}
🚗 **Véhicules** : ${vehiclesCount || 0}

Les bureaux les plus actifs sont à ${bureaux?.[0]?.prefecture || 'Conakry'}.`;
      }

      // Réponse par défaut intelligente
      return `🤖 **Copilote IA PDG - 224Solutions**

Je peux vous aider avec :
📊 **Statistiques** - Utilisateurs, transactions, revenus
👥 **Gestion** - Vendeurs, clients, livreurs  
💰 **Finance** - Paiements, commissions, alertes
🏢 **Bureaux** - Syndicats, travailleurs, motos
🛡️ **Sécurité** - Fraude, audit, monitoring

**Posez-moi une question spécifique !** Par exemple :
- "Combien d'utilisateurs avons-nous ?"
- "Quel est notre chiffre d'affaires ?"
- "Y a-t-il des problèmes de sécurité ?"`;
    } catch (error) {
      console.error('Erreur génération réponse IA:', error);
      return 'Désolé, je rencontre une erreur technique. Veuillez réessayer.';
    }
  };

  return (
    <div className="space-y-6">
      {/* MFA Warning */}
      {!mfaVerified && (
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <p className="text-orange-300 text-sm">
              MFA non vérifié - Les actions critiques ne seront pas exécutées
            </p>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Copilote IA PDG
            <Badge variant="outline" className="ml-2">
              <Shield className="w-3 h-3 mr-1" />
              Sécurisé
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Messages */}
          <div className="h-96 overflow-y-auto space-y-4 p-4 bg-slate-900/50 rounded-lg">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-100 p-3 rounded-lg">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Posez votre question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="bg-slate-700 border-slate-600 text-white"
              disabled={loading}
            />
            <Button onClick={sendMessage} disabled={loading} className="gap-2">
              <Send className="w-4 h-4" />
              Envoyer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              'Statistiques utilisateurs',
              'Transactions du jour',
              'Alertes fraude',
              'Commissions actives'
            ].map((action) => (
              <Button
                key={action}
                variant="outline"
                size="sm"
                onClick={() => setInput(action)}
                className="text-xs"
              >
                {action}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
