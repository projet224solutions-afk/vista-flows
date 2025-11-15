/**
 * 🧪 Panneau de Test du Système de Communication
 * Permet de tester facilement la création de conversations et l'envoi de messages
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { universalCommunicationService } from '@/services/UniversalCommunicationService';

export default function CommunicationTestPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [testMessage, setTestMessage] = useState('Message de test du système de communication 224SOLUTIONS');
  const [users, setUsers] = useState<any[]>([]);

  // Charger les utilisateurs disponibles
  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .neq('id', user?.id)
        .limit(20);

      if (error) throw error;
      setUsers(data || []);
      toast.success(`${data?.length || 0} utilisateurs chargés`);
    } catch (error: any) {
      console.error('Erreur chargement utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };

  // Test complet du système
  const runFullTest = async () => {
    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (!selectedUser) {
      toast.error('Veuillez sélectionner un utilisateur');
      return;
    }

    setLoading(true);
    const results: any[] = [];

    try {
      // TEST 1: Créer une conversation
      results.push({ test: 'Création de conversation', status: 'running', message: 'En cours...' });
      setTestResults([...results]);

      const conversation = await universalCommunicationService.createConversation(
        [selectedUser],
        user.id,
        'Test Communication'
      );

      results[results.length - 1] = {
        test: 'Création de conversation',
        status: 'success',
        message: `Conversation créée: ${conversation.id}`,
        data: conversation
      };
      setTestResults([...results]);
      toast.success('✅ Conversation créée');

      // TEST 2: Envoyer un message
      results.push({ test: 'Envoi de message', status: 'running', message: 'En cours...' });
      setTestResults([...results]);

      const message = await universalCommunicationService.sendTextMessage(
        conversation.id,
        user.id,
        testMessage
      );

      results[results.length - 1] = {
        test: 'Envoi de message',
        status: 'success',
        message: `Message envoyé: ${message.id}`,
        data: message
      };
      setTestResults([...results]);
      toast.success('✅ Message envoyé');

      // TEST 3: Récupérer les messages
      results.push({ test: 'Récupération des messages', status: 'running', message: 'En cours...' });
      setTestResults([...results]);

      const messages = await universalCommunicationService.getMessages(conversation.id);

      results[results.length - 1] = {
        test: 'Récupération des messages',
        status: 'success',
        message: `${messages.length} message(s) récupéré(s)`,
        data: messages
      };
      setTestResults([...results]);
      toast.success('✅ Messages récupérés');

      // TEST 4: Marquer comme lu
      results.push({ test: 'Marquage comme lu', status: 'running', message: 'En cours...' });
      setTestResults([...results]);

      await universalCommunicationService.markMessagesAsRead(conversation.id, user.id);

      results[results.length - 1] = {
        test: 'Marquage comme lu',
        status: 'success',
        message: 'Messages marqués comme lus'
      };
      setTestResults([...results]);
      toast.success('✅ Messages marqués comme lus');

      toast.success('🎉 Tous les tests réussis !', {
        description: 'Le système de communication fonctionne parfaitement'
      });
    } catch (error: any) {
      console.error('Erreur test:', error);
      results.push({
        test: 'Erreur',
        status: 'error',
        message: error.message || 'Une erreur est survenue'
      });
      setTestResults([...results]);
      toast.error('❌ Test échoué: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Test du Système de Communication
        </CardTitle>
        <CardDescription>
          Testez la création de conversations et l'envoi de messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration du test */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Charger les utilisateurs disponibles</Label>
            <Button 
              onClick={loadUsers} 
              variant="outline" 
              className="w-full"
              disabled={loading}
            >
              <Users className="w-4 h-4 mr-2" />
              Charger les utilisateurs ({users.length})
            </Button>
          </div>

          {users.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Sélectionner un destinataire</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un utilisateur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Message de test</Label>
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Entrez votre message de test..."
                />
              </div>

              <Button
                onClick={runFullTest}
                disabled={loading || !selectedUser}
                className="w-full gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Lancer le test complet
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Résultats des tests */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Résultats des tests</Label>
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'success' ? 'bg-green-50 border-green-200' :
                  result.status === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                  {result.status === 'error' && <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  {result.status === 'running' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin mt-0.5" />}
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.test}</span>
                      <Badge variant={
                        result.status === 'success' ? 'default' :
                        result.status === 'error' ? 'destructive' :
                        'secondary'
                      }>
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-primary hover:underline">
                          Voir les détails
                        </summary>
                        <pre className="mt-2 p-2 bg-background/50 rounded text-xs overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
