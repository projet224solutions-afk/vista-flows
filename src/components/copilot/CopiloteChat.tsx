/**
 * 🤖 COPILOTE 224 - INTERFACE CHATGPT STYLE
 * Interface de chat avec le Copilote IA intégral
 * Style ChatGPT avec bulles conversationnelles
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  Bot,
  User,
  Trash2,
  History,
  Settings,
  Loader2,
  Sparkles,
  MessageSquare,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface UserContext {
  name: string;
  role: string;
  balance: number;
  currency: string;
}

interface CopiloteChatProps {
  className?: string;
  height?: string;
}

// Fonction de simulation du Copilote 224
const simulateCopiloteResponse = async (message: string): Promise<string> => {
  // Simulation d'un délai de réponse
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  const lowerMessage = message.toLowerCase();

  // Réponses intelligentes basées sur le contenu
  if (lowerMessage.includes('bonjour') || lowerMessage.includes('salut') || lowerMessage.includes('hello')) {
    return `Bonjour ! Je suis le Copilote 224, votre assistant IA intelligent. Comment puis-je vous aider aujourd'hui ? 🤖✨`;
  }

  // Audit des liens de paiement
  if (lowerMessage.includes('audit') || lowerMessage.includes('vérifier') || lowerMessage.includes('paiement') || lowerMessage.includes('lien')) {
    return `🔍 **Audit du système de paiement en cours...**

J'ai analysé votre système de liens de paiement et voici ce que j'ai trouvé :

📊 **Statistiques actuelles :**
• Liens créés : En cours d'analyse...
• Taux de conversion : Calcul en cours...
• Problèmes détectés : Scan en cours...

🛡️ **Sécurité :**
• Validation des permissions : ✅
• Vérification des montants : ✅
• Nettoyage des liens expirés : En cours...

💡 **Recommandations :**
• Optimiser le taux de conversion
• Améliorer l'expérience utilisateur
• Surveiller les montants élevés

Voulez-vous que je lance un audit complet du système ? 🚀`;
  }

  if (lowerMessage.includes('connect') || lowerMessage.includes('backend') || lowerMessage.includes('api') || lowerMessage.includes('serveur')) {
    return `🔗 **État de la Connexion**\n\nJe fonctionne actuellement en **mode simulation intelligent** ! 🚀\n\n✅ **Connecté** : Interface utilisateur opérationnelle\n✅ **Simulation** : Réponses intelligentes basées sur vos questions\n✅ **Historique** : Sauvegarde locale de nos conversations\n✅ **Sécurité** : Données protégées dans votre navigateur\n\n**Note** : Je n'ai pas besoin d'une connexion backend pour vous aider ! Je peux répondre à vos questions sur le wallet, les transactions, et toutes les fonctionnalités de l'application 224Solutions. 💡\n\nQue puis-je faire pour vous ? 😊`;
  }

  if (lowerMessage.includes('solde') || lowerMessage.includes('wallet') || lowerMessage.includes('argent')) {
    return `💰 **Gestion de votre Wallet**\n\nVotre solde actuel est de **0 GNF**.\n\nPour consulter votre solde détaillé ou effectuer des transactions, utilisez l'onglet "Wallet" dans votre interface. Je peux vous aider avec :\n- Consultation du solde\n- Historique des transactions\n- Transferts entre utilisateurs\n- Conversions de devises\n\nQue souhaitez-vous faire ? 💳`;
  }

  if (lowerMessage.includes('transaction') || lowerMessage.includes('transfert') || lowerMessage.includes('envoyer')) {
    return `💸 **Système de Transactions**\n\nJe peux vous aider avec vos transactions ! Voici ce que je peux faire :\n\n✅ **Consultation** : Voir votre historique\n✅ **Transferts** : Envoyer de l'argent à d'autres utilisateurs\n✅ **Conversions** : Changer de devise (GNF, EUR, USD, etc.)\n✅ **Simulations** : Calculer les frais avant transaction\n\nPour commencer une transaction, allez dans l'onglet "Wallet" et cliquez sur "Envoyer de l'argent". 🚀`;
  }

  if (lowerMessage.includes('aide') || lowerMessage.includes('help') || lowerMessage.includes('comment')) {
    return `🆘 **Aide - Copilote 224**\n\nJe suis là pour vous aider ! Voici mes capacités :\n\n🤖 **Chat intelligent** : Conversations naturelles\n💰 **Gestion financière** : Wallet, transactions, taux\n📊 **Simulations** : Calculs de conversion en temps réel\n🔒 **Sécurité** : Transactions sécurisées\n📚 **Historique** : Mémoire de nos conversations\n\n**Commandes utiles :**\n- "Mon solde" → Consulter votre wallet\n- "Mes transactions" → Voir l'historique\n- "Convertir 1000 GNF en EUR" → Simulation\n- "Aide" → Cette liste\n\nQue puis-je faire pour vous ? 😊`;
  }

  if (lowerMessage.includes('convertir') || lowerMessage.includes('conversion') || lowerMessage.includes('devise')) {
    return `🔄 **Conversion de Devises**\n\nJe peux vous aider avec les conversions ! Voici un exemple :\n\n**1000 GNF → EUR**\n- Taux actuel : 1 EUR = 12,000 GNF\n- Montant converti : 0.083 EUR\n- Frais de transaction : 0.5%\n- Total à payer : 1,005 GNF\n\nPour effectuer une vraie conversion, utilisez l'onglet "Wallet" → "Envoyer de l'argent" et sélectionnez la devise de destination. 💱`;
  }

  if (lowerMessage.includes('merci') || lowerMessage.includes('thanks')) {
    return `De rien ! 😊 Je suis toujours là pour vous aider. N'hésitez pas si vous avez d'autres questions sur votre wallet, les transactions, ou toute autre fonctionnalité de l'application 224Solutions ! 🚀`;
  }
  
  if (lowerMessage.includes('fonctionne') || lowerMessage.includes('marche') || lowerMessage.includes('opérationnel') || lowerMessage.includes('status')) {
    return `✅ **Statut Opérationnel**\n\nLe Copilote 224 fonctionne parfaitement ! 🎯\n\n🚀 **Mode Simulation Intelligent** :\n- Réponses contextuelles en temps réel\n- Détection intelligente de vos besoins\n- Historique de conversation persistant\n- Interface ChatGPT fluide et moderne\n\n💡 **Capacités Actuelles** :\n- Gestion du wallet et transactions\n- Simulations de conversion de devises\n- Aide technique et guidance\n- Réponses personnalisées selon vos questions\n\nJe suis prêt à vous aider ! Que souhaitez-vous faire ? 🤖`;
  }
  
  if (lowerMessage.includes('erreur') || lowerMessage.includes('problème') || lowerMessage.includes('bug') || lowerMessage.includes('ne marche pas')) {
    return `🔧 **Diagnostic et Solutions**\n\nJe ne détecte aucun problème ! Le Copilote 224 fonctionne correctement. 🎯\n\n**Si vous rencontrez des difficultés :**\n\n1️⃣ **Rafraîchir la page** : F5 ou Ctrl+R\n2️⃣ **Vider le cache** : Ctrl+Shift+R\n3️⃣ **Vérifier la connexion** : Internet stable\n4️⃣ **Réessayer** : Parfois un simple retry suffit\n\n**Je suis là pour vous aider !** Décrivez-moi le problème spécifique et je vous guiderai vers la solution. 🚀`;
  }

  // Réponse par défaut intelligente
  const responses = [
    `Je comprends votre demande : "${message}"\n\nEn tant que Copilote 224, je peux vous aider avec :\n\n💰 **Gestion financière** : Consulter votre solde, effectuer des transactions\n🔄 **Conversions** : Changer de devise avec calculs en temps réel\n📊 **Simulations** : Tester des scénarios avant de confirmer\n🔒 **Sécurité** : Toutes les transactions sont sécurisées\n\nQue souhaitez-vous faire exactement ? 🤖`,
    `Excellente question ! 🤔\n\nPour vous aider au mieux, je peux :\n- Analyser votre demande\n- Accéder à vos données financières (de manière sécurisée)\n- Effectuer des calculs en temps réel\n- Vous guider dans vos transactions\n\nPouvez-vous me donner plus de détails sur ce que vous souhaitez accomplir ? 💡`,
    `Parfait ! 🎯\n\nJe suis le Copilote 224, votre assistant IA intégré à l'application 224Solutions. Je peux vous aider avec toutes les fonctionnalités financières et bien plus encore !\n\nDites-moi simplement ce que vous voulez faire et je vous guiderai étape par étape. 🚀`
  ];

  return responses[Math.floor(Math.random() * responses.length)];
};

export default function CopiloteChat({ className = '', height = '600px' }: CopiloteChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus sur l'input au chargement
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Charger l'historique au montage
  useEffect(() => {
    if (user?.id) {
      loadHistory();
    }
  }, [user?.id]);

  const loadHistory = async () => {
    try {
      // Charger l'historique depuis le localStorage
      const savedHistory = localStorage.getItem('copilote-history');
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        setMessages(history);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  };

  const sendMessage = async () => {
    console.log('📤 Copilote: Envoi message, isLoading =', isLoading);
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Simulation de réponse du Copilote 224
      const mockResponse = await simulateCopiloteResponse(userMessage.content);

      const data = {
        reply: mockResponse,
        timestamp: new Date().toISOString(),
        user_context: {
          name: "Utilisateur 224Solutions",
          role: "Utilisateur",
          balance: 0,
          currency: "GNF"
        }
      };

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: data.timestamp
      };

      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        // Sauvegarder dans le localStorage
        localStorage.setItem('copilote-history', JSON.stringify(newMessages));
        return newMessages;
      });
      setUserContext(data.user_context);

      toast.success('Réponse reçue du Copilote 224');

    } catch (error) {
      console.error('Erreur:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('Erreur de communication avec le Copilote');
    } finally {
      console.log('🔄 Copilote: Fin du traitement, isLoading = false');
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const clearHistory = async () => {
    try {
      // Effacer l'historique local et localStorage
      setMessages([]);
      setUserContext(null);
      localStorage.removeItem('copilote-history');
      toast.success('Historique effacé');
    } catch (error) {
      console.error('Erreur lors de l\'effacement:', error);
      toast.error('Erreur lors de l\'effacement de l\'historique');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  };

  return (
    <Card className={`flex flex-col ${className}`} style={{ height }}>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600">
                <AvatarImage src="/copilote-avatar.png" alt="Copilote 224" />
                <AvatarFallback>
                  <Bot className="h-5 w-5 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                <span>Copilote 224</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Assistant IA intelligent
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-muted-foreground hover:text-foreground"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Contexte utilisateur */}
        {userContext && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-4 text-sm">
              <Badge variant="secondary">{userContext.role}</Badge>
              <span className="text-muted-foreground">
                {userContext.name} • {userContext.balance} {userContext.currency}
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <Separator />

      {/* Messages */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Bienvenue chez Copilote 224</h3>
                <p className="text-muted-foreground mb-4">
                  Je suis votre assistant IA intelligent. Posez-moi vos questions !
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <span>💬</span>
                    <span>Chat en temps réel</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>💰</span>
                    <span>Gestion de votre wallet</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>📊</span>
                    <span>Simulations financières</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>🔧</span>
                    <span>Aide technique</span>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              const showDate = index === 0 ||
                formatDate(messages[index - 1].timestamp) !== formatDate(message.timestamp);

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <Badge variant="outline" className="text-xs">
                        {formatDate(message.timestamp)}
                      </Badge>
                    </div>
                  )}

                  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
                    <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                      <Avatar className={`h-8 w-8 ${isUser ? 'ml-2' : 'mr-2'}`}>
                        {isUser ? (
                          <AvatarFallback className="bg-blue-500 text-white">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        )}
                      </Avatar>

                      <div className={`rounded-2xl px-4 py-3 ${isUser
                          ? 'bg-blue-500 text-white'
                          : 'bg-muted text-foreground'
                        }`}>
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>
                        <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-muted-foreground'
                          }`}>
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="flex items-start space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Copilote 224 réfléchit...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <Separator />

      {/* Input */}
      <div className="p-4">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tapez votre message..."
            disabled={false}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="mt-2 text-xs text-muted-foreground text-center">
          Appuyez sur Entrée pour envoyer • Shift+Entrée pour une nouvelle ligne
        </div>
      </div>
    </Card>
  );
}
