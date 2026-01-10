/**
 * 🤖 COPILOTE 224 - INTERFACE CHATGPT STYLE
 * Interface de chat avec le Copilote IA intégral
 * Connecté à la vraie IA avec contexte spécifique client/vendeur
 * NOUVEAU: Support Copilote Vendeur Enterprise avec analyse complète
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
  Loader2,
  Sparkles,
  MessageSquare,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVendorCopilot } from '@/hooks/useVendorCopilot';
import ReactMarkdown from 'react-markdown';

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
  userRole?: 'client' | 'vendeur';
}

export default function CopiloteChat({ className = '', height = '600px', userRole = 'client' }: CopiloteChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [vendorAccess, setVendorAccess] = useState<{ loading: boolean; hasVendor: boolean | null }>({
    loading: userRole === 'vendeur',
    hasVendor: userRole === 'vendeur' ? null : true,
  });
  
  // NOUVEAU: Hook Copilote Vendeur Enterprise
  const vendorCopilot = useVendorCopilot();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [useEnterpriseMode, setUseEnterpriseMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadHistory();
    }
  }, [user?.id, userRole]);

  // Vérifie si l'utilisateur connecté est bien associé à un vendeur (table vendors)
  useEffect(() => {
    let cancelled = false;

    const checkVendorAccess = async () => {
      if (userRole !== 'vendeur') {
        if (!cancelled) setVendorAccess({ loading: false, hasVendor: true });
        return;
      }

      if (!user?.id) {
        if (!cancelled) setVendorAccess({ loading: false, hasVendor: false });
        return;
      }

      try {
        const baseQuery = supabase.from('vendors').select('id').eq('user_id', user.id);
        const res = (baseQuery as any).maybeSingle
          ? await (baseQuery as any).maybeSingle()
          : await baseQuery.single();

        if (!cancelled) {
          const hasVendor = !!res?.data;
          setVendorAccess({ loading: false, hasVendor });
          
          // NOUVEAU: Si vendeur trouvé, activer mode Enterprise et stocker l'ID
          if (hasVendor && res.data?.id) {
            setVendorId(res.data.id);
            setUseEnterpriseMode(true);
          }
        }
      } catch {
        if (!cancelled) setVendorAccess({ loading: false, hasVendor: false });
      }
    };

    setVendorAccess({ loading: userRole === 'vendeur', hasVendor: userRole === 'vendeur' ? null : true });
    checkVendorAccess();

    return () => {
      cancelled = true;
    };
  }, [userRole, user?.id]);

  const loadHistory = async () => {
    try {
      const storageKey = `copilote-history-${userRole}`;
      const savedHistory = localStorage.getItem(storageKey);
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

    // NOUVEAU: Mode Enterprise pour vendeur avec analyse complète
    if (userRole === 'vendeur' && useEnterpriseMode && vendorId) {
      setIsLoading(true);
      await vendorCopilot.processQuery(input.trim(), vendorId);
      
      // Synchroniser les messages
      setMessages(vendorCopilot.messages.map(msg => ({
        id: msg.id,
        role: msg.role === 'system' ? 'assistant' : msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      })));
      
      setInput('');
      setIsLoading(false);
      return;
    }

    // Mode standard (edge function)
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      toast.error('Veuillez vous connecter pour utiliser le Copilote');
      return;
    }

    // 🔐 Copilote vendeur: on laisse l'edge function décider (permet auto-association si boutique existante)
    // (La vérification locale sert surtout à l'UX, mais ne doit pas bloquer un compte qui vient d'être lié)


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
      // Déterminer quelle edge function appeler selon le rôle
      const functionName = userRole === 'vendeur' ? 'vendor-ai-assistant' : 'client-ai-assistant';

      console.log(`🤖 Calling ${functionName} for ${userRole}...`);

      // Appel à l'edge function avec streaming
      const functionsBaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1';
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

      const response = await fetch(
        `${functionsBaseUrl}/${functionName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: userMessage.content,
            messages: messages
              .map(m => ({ role: m.role, content: m.content }))
              .concat([{ role: 'user', content: userMessage.content }])
          }),
        }
      );

      if (!response.ok) {
        // Essayer de remonter un message précis renvoyé par l'edge function
        const errJson = await response.json().catch(() => null);
        const errMsg = (errJson as any)?.error;

        if (response.status === 401) {
          if (
            userRole === 'vendeur' &&
            typeof errMsg === 'string' &&
            errMsg.toLowerCase().includes('vendeur non trouvé')
          ) {
            setVendorAccess({ loading: false, hasVendor: false });
            throw new Error("Votre compte n'est pas associé à une boutique (vendeur introuvable). Connectez-vous avec un compte vendeur ou créez votre boutique.");
          }
          throw new Error(errMsg || 'Non autorisé. Vérifiez que vous êtes connecté et que votre compte est bien un vendeur.');
        }
        if (response.status === 403) {
          throw new Error(errMsg || 'Accès refusé.');
        }
        if (response.status === 429) {
          throw new Error(errMsg || 'Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.');
        }
        if (response.status === 402) {
          throw new Error(errMsg || 'Crédits insuffisants pour l\'IA.');
        }

        throw new Error(errMsg || 'Erreur de communication avec l\'IA');
      }

      // Parser le stream SSE
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      };

      // Ajouter le message assistant vide pour le streaming
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);

      if (reader) {
        let textBuffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          textBuffer += decoder.decode(value, { stream: true });
          
          // Traiter ligne par ligne
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
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                assistantContent += content;
                // Mettre à jour le dernier message assistant
                setMessages(prev => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                    updated[lastIndex] = { ...updated[lastIndex], content: assistantContent };
                  }
                  return updated;
                });
              }
            } catch {
              // JSON incomplet, attendre plus de données
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }
      }

      // Sauvegarder l'historique
      const storageKey = `copilote-history-${userRole}`;
      setMessages(prev => {
        localStorage.setItem(storageKey, JSON.stringify(prev));
        return prev;
      });

      setUserContext({
        name: user?.email?.split('@')[0] || 'Utilisateur',
        role: userRole === 'vendeur' ? 'Vendeur' : 'Client',
        balance: 0,
        currency: 'GNF'
      });

    } catch (error) {
      console.error('Erreur:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Désolé, je rencontre une difficulté technique. Veuillez réessayer.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => {
        // Si le dernier message est un assistant vide du streaming, le remplacer
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === '') {
          return [...prev.slice(0, -1), errorMessage];
        }
        return [...prev, errorMessage];
      });
      toast.error(error instanceof Error ? error.message : 'Erreur de communication avec le Copilote');
    } finally {
      console.log('🔄 Copilote: Fin du traitement');
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const clearHistory = async () => {
    try {
      if (userRole === 'vendeur' && useEnterpriseMode) {
        // Mode Enterprise: utiliser le hook vendeur
        vendorCopilot.clearMessages();
        setMessages([]);
      } else {
        // Mode standard
        setMessages([]);
        setUserContext(null);
        const storageKey = `copilote-history-${userRole}`;
        localStorage.removeItem(storageKey);
      }
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

  const roleLabel = userRole === 'vendeur' ? 'Vendeur' : 'Client';
  const roleColor = userRole === 'vendeur' ? 'from-green-500 to-emerald-600' : 'from-blue-500 to-purple-600';

  return (
    <Card className={`flex flex-col ${className}`} style={{ height }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className={`h-10 w-10 bg-gradient-to-br ${roleColor}`}>
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
                <Badge variant="outline" className="ml-2 text-xs">{roleLabel}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Assistant IA dédié {roleLabel.toLowerCase()}
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

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Bienvenue chez Copilote 224</h3>
                <p className="text-muted-foreground mb-4">
                  {userRole === 'vendeur' 
                    ? useEnterpriseMode 
                      ? '🚀 Je suis votre IA ENTERPRISE de 224Solutions. Je peux analyser en profondeur TOUTE votre interface vendeur.'
                      : 'Je suis votre assistant pour gérer votre boutique, produits et ventes.'
                    : 'Je suis votre assistant pour vos achats, commandes et wallet.'}
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                  {userRole === 'vendeur' ? (
                    useEnterpriseMode ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <span>📊</span>
                          <span>Analyse complète de l'interface (produits, ventes, clients, finances...)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>💡</span>
                          <span>Recommandations intelligentes basées sur vos données</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>📈</span>
                          <span>Tableaux de bord et insights professionnels</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>🎯</span>
                          <span>Scores de santé et alertes prioritaires</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <span>📦</span>
                          <span>Gestion des produits</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>📊</span>
                          <span>Analyse des ventes</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>👥</span>
                          <span>Gestion des clients</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>💰</span>
                          <span>Finances et paiements</span>
                        </div>
                      </>
                    )
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <span>💬</span>
                        <span>Chat en temps réel</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>💰</span>
                        <span>Gestion de votre wallet</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>📦</span>
                        <span>Suivi des commandes</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>🔧</span>
                        <span>Aide technique</span>
                      </div>
                    </>
                  )}
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
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(message.timestamp)}
                      </Badge>
                    </div>
                  )}

                  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
                    <div className={`flex items-start space-x-2 max-w-[85%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <Avatar className={`h-8 w-8 ${isUser ? 'bg-primary' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
                        {isUser ? (
                          <AvatarFallback>
                            <User className="h-4 w-4 text-white" />
                          </AvatarFallback>
                        ) : (
                          <AvatarFallback>
                            <Bot className="h-4 w-4 text-white" />
                          </AvatarFallback>
                        )}
                      </Avatar>

                      <div className={`rounded-lg p-3 ${
                        isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        {/* NOUVEAU: Support Markdown pour mode Enterprise */}
                        {!isUser && useEnterpriseMode ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
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
                    <AvatarFallback className={`bg-gradient-to-br ${roleColor} text-white`}>
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

      <div className="p-4">
        {userRole === 'vendeur' && vendorAccess.hasVendor === false && (
          <div className="mb-3 rounded-lg border border-border bg-muted/50 p-3 text-sm">
            <div className="font-medium">Accès vendeur requis</div>
            <div className="text-muted-foreground">
              Votre compte n'est pas associé à une boutique. Connectez-vous avec un compte vendeur ou créez votre boutique.
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tapez votre message..."
            disabled={
              isLoading ||
              (userRole === 'vendeur' && (vendorAccess.loading || vendorAccess.hasVendor === false))
            }
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={
              !input.trim() ||
              isLoading ||
              (userRole === 'vendeur' && (vendorAccess.loading || vendorAccess.hasVendor === false))
            }
            size="icon"
            className={`bg-gradient-to-r ${roleColor} hover:opacity-90`}
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
