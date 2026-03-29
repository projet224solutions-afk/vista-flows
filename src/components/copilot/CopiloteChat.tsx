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
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVendorCopilot } from '@/hooks/useVendorCopilot';
import ReactMarkdown from 'react-markdown';

const sanitizeMarkdownUrl = (url: string): string => {
  const trimmed = url.trim();

  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:') {
      return trimmed;
    }
  } catch {
    return '#';
  }

  return '#';
};

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

// Générer un ID de session unique pour la conversation
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export default function CopiloteChat({ className = '', height = '600px', userRole = 'client' }: CopiloteChatProps) {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
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

  // Initialiser ou récupérer le session ID
  useEffect(() => {
    const storageKey = `copilote-session-${userRole}-${user?.id || 'anonymous'}`;
    let existingSession = localStorage.getItem(storageKey);
    
    if (!existingSession) {
      existingSession = generateSessionId();
      localStorage.setItem(storageKey, existingSession);
    }
    
    setSessionId(existingSession);
    console.log(`📍 Copilote session: ${existingSession}`);
  }, [userRole, user?.id]);

  // Synchroniser les messages du vendorCopilot avec l'état local en mode Enterprise
  useEffect(() => {
    if (useEnterpriseMode && vendorCopilot.messages.length > 0) {
      setMessages(vendorCopilot.messages.map(msg => ({
        id: msg.id,
        role: msg.role === 'system' ? 'assistant' : msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      })));
    }
  }, [useEnterpriseMode, vendorCopilot.messages]);

  // Initialiser le message de bienvenue au chargement
  useEffect(() => {
    if (messages.length === 0 && userRole === 'vendeur' && !useEnterpriseMode) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: t('copilot.welcome.vendor'),
        timestamp: new Date().toISOString(),
      }]);
    } else if (messages.length === 0 && userRole === 'client') {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: t('copilot.welcome.client'),
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [userRole, useEnterpriseMode, messages.length, t]);

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
    if (!input.trim() || isLoading || vendorCopilot.loading) return;

    // NOUVEAU: Mode Enterprise pour vendeur avec analyse complète
    if (userRole === 'vendeur' && useEnterpriseMode && vendorId) {
      const messageToSend = input.trim();
      setInput('');
      setIsLoading(true);
      setIsTyping(true);

      try {
        await vendorCopilot.processQuery(messageToSend, vendorId);
        // La synchronisation est gérée par le useEffect
      } catch (err: any) {
        console.error('❌ Erreur Copilote Enterprise:', err);
        toast.error(err.message || t('copilot.errors.analysisError'));
      } finally {
        setIsLoading(false);
        setIsTyping(false);
      }
      return;
    }

    // Mode standard (edge function)
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      toast.error(t('copilot.errors.loginRequired'));
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
      const functionsBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Préparer l'historique (15 derniers messages max pour le contexte)
      // Exclure le message de bienvenue initial (id='welcome')
      const historyMessages = messages
        .filter(m => m.id !== 'welcome')
        .slice(-15)
        .map(m => ({ role: m.role, content: m.content }));
      
      // Ajouter le nouveau message utilisateur
      const conversationMessages = [
        ...historyMessages,
        { role: 'user', content: userMessage.content }
      ];

      console.log(`📜 Sending ${conversationMessages.length} messages to AI (history: ${historyMessages.length}, session: ${sessionId})`);

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
            messages: conversationMessages,
            sessionId: sessionId, // Pour la traçabilité côté serveur
            userRole: userRole
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
            throw new Error(t('copilot.errors.vendorNotLinked'));
          }
          throw new Error(errMsg || t('copilot.errors.unauthorized'));
        }
        if (response.status === 403) {
          throw new Error(errMsg || t('copilot.errors.forbidden'));
        }
        if (response.status === 429) {
          throw new Error(errMsg || t('copilot.errors.rateLimited'));
        }
        if (response.status === 402) {
          throw new Error(errMsg || t('copilot.errors.insufficientCredits'));
        }

        throw new Error(errMsg || t('copilot.errors.communication'));
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
        content: error instanceof Error ? error.message : t('copilot.errors.technical'),
        timestamp: new Date().toISOString()
      };

      setMessages(prev => {
        // Si le dernier message est un assistant vide du streaming, le remplacer
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === '') {
          return [...prev.slice(0, -1), errorMessage];
        }
        return [...prev, errorMessage];
      });
      toast.error(error instanceof Error ? error.message : t('copilot.errors.communication'));
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
      
      // Générer une nouvelle session après effacement
      const sessionKey = `copilote-session-${userRole}-${user?.id || 'anonymous'}`;
      const newSession = generateSessionId();
      localStorage.setItem(sessionKey, newSession);
      setSessionId(newSession);
      console.log(`🔄 Nouvelle session créée: ${newSession}`);
      
      toast.success(t('copilot.toast.historyReset'));
    } catch (error) {
      console.error('Erreur lors de l\'effacement:', error);
      toast.error(t('copilot.toast.historyResetError'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const locale = language === 'ar' ? 'ar' : language === 'en' ? 'en-US' : 'fr-FR';
    return new Date(timestamp).toLocaleTimeString(locale, {
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
      return t('copilot.dates.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('copilot.dates.yesterday');
    } else {
      const locale = language === 'ar' ? 'ar' : language === 'en' ? 'en-US' : 'fr-FR';
      return date.toLocaleDateString(locale);
    }
  };

  const roleLabel = userRole === 'vendeur' ? t('copilot.role.vendor') : t('copilot.role.client');
  const roleColor = userRole === 'vendeur' ? 'from-primary to-brand-blue-deep' : 'from-vendeur-secondary to-brand-orange-dark';

  return (
    <Card className={`flex flex-col ${className}`} style={{ height }}>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <Avatar className={`h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-br ${roleColor}`}>
                <AvatarImage src="/copilote-avatar.png" alt="Copilote 224" />
                <AvatarFallback>
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-primary-blue-600 rounded-full border-2 border-background"></div>
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm sm:text-lg flex items-center gap-1 flex-wrap">
                <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="truncate">Copilote 224</span>
                <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">{roleLabel}</Badge>
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {t('copilot.subtitle', { role: roleLabel.toLowerCase() })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              className="h-8 w-8 text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {userContext && (
          <div className="mt-2 p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
              <Badge variant="secondary" className="text-[10px] sm:text-xs">{userContext.role}</Badge>
              <span className="text-muted-foreground truncate">
                {userContext.name} • {userContext.balance} {userContext.currency}
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-0 overflow-hidden min-h-0">
        <ScrollArea className="h-full px-2 py-3 sm:p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('copilot.empty.title')}</h3>
                <p className="text-muted-foreground mb-4">
                  {userRole === 'vendeur' 
                    ? useEnterpriseMode 
                      ? t('copilot.empty.vendorEnterpriseDesc')
                      : t('copilot.empty.vendorStandardDesc')
                    : t('copilot.empty.clientDesc')}
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                  {userRole === 'vendeur' ? (
                    useEnterpriseMode ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <span>📊</span>
                          <span>{t('copilot.features.vendorEnterprise.analysis')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>💡</span>
                          <span>{t('copilot.features.vendorEnterprise.recommendations')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>📈</span>
                          <span>{t('copilot.features.vendorEnterprise.dashboards')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>🎯</span>
                          <span>{t('copilot.features.vendorEnterprise.alerts')}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <span>📦</span>
                          <span>{t('copilot.features.vendorStandard.products')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>📊</span>
                          <span>{t('copilot.features.vendorStandard.sales')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>👥</span>
                          <span>{t('copilot.features.vendorStandard.customers')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>💰</span>
                          <span>{t('copilot.features.vendorStandard.finances')}</span>
                        </div>
                      </>
                    )
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <span>💬</span>
                        <span>{t('copilot.features.client.chat')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>💰</span>
                        <span>{t('copilot.features.client.wallet')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>📦</span>
                        <span>{t('copilot.features.client.orders')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>🔧</span>
                        <span>{t('copilot.features.client.support')}</span>
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

                  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
                    <div className={`flex items-start gap-1.5 sm:gap-2 max-w-[90%] sm:max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
                      <Avatar className={`h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 ${isUser ? 'bg-primary' : 'bg-gradient-to-br from-primary to-secondary'}`}>
                        {isUser ? (
                          <AvatarFallback>
                            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                          </AvatarFallback>
                        ) : (
                          <AvatarFallback>
                            <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                          </AvatarFallback>
                        )}
                      </Avatar>

                      <div className={`rounded-xl px-3 py-2 sm:p-3 min-w-0 overflow-hidden ${
                        isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        {/* NOUVEAU: Support Markdown pour mode Enterprise */}
                        {!isUser && useEnterpriseMode ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm [&_p]:mb-1.5 [&_ul]:my-1 [&_li]:my-0.5 [&_a]:break-all [&_*]:max-w-full overflow-hidden">
                            <ReactMarkdown
                              skipHtml
                              urlTransform={(url) => sanitizeMarkdownUrl(url)}
                              components={{
                                a: ({ node: _node, ...props }) => (
                                  <a
                                    {...props}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                  />
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
                        )}
                        <p className="text-[10px] sm:text-xs mt-1 opacity-70">
                          {formatTime(message.timestamp)}
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
                      <span className="text-sm text-muted-foreground">{t('copilot.typing')}</span>
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

      <div className="p-2 sm:p-4">
        {userRole === 'vendeur' && vendorAccess.hasVendor === false && (
          <div className="mb-2 rounded-lg border border-border bg-muted/50 p-2 text-xs sm:text-sm">
            <div className="font-medium">{t('copilot.vendorAccess.requiredTitle')}</div>
            <div className="text-muted-foreground">
              {t('copilot.vendorAccess.requiredDescription')}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('copilot.input.placeholder')}
            disabled={
              isLoading ||
              (userRole === 'vendeur' && (vendorAccess.loading || vendorAccess.hasVendor === false))
            }
            className="flex-1 h-10 sm:h-11 text-sm"
          />
          <Button
            onClick={sendMessage}
            disabled={
              !input.trim() ||
              isLoading ||
              (userRole === 'vendeur' && (vendorAccess.loading || vendorAccess.hasVendor === false))
            }
            size="icon"
            className={`h-10 w-10 sm:h-11 sm:w-11 bg-gradient-to-r ${roleColor} hover:opacity-90 rounded-lg`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="mt-1.5 text-[10px] sm:text-xs text-muted-foreground text-center hidden sm:block">
          {t('copilot.input.hint')}
        </div>
      </div>
    </Card>
  );
}
