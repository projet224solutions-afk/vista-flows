import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Send, Mic, Brain, Download, Copy, RefreshCw,
    Sparkles, Zap, TrendingUp, BarChart3, Users,
    DollarSign, Package, Settings, HelpCircle, Terminal
} from "lucide-react";
import { AICopilotService, Message, AIContext } from "@/services/aiCopilotService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface IntelligentChatInterfaceProps {
    context?: AIContext;
    onActionRequest?: (action: string, data?: any) => void;
}

export default function IntelligentChatInterface({
    context,
    onActionRequest
}: IntelligentChatInterfaceProps) {
    const { user, profile } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const aiService = useRef(new AICopilotService());

    // Auto-scroll vers le bas quand de nouveaux messages arrivent
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Suggestions intelligentes
    const quickActions = [
        { icon: BarChart3, label: "Analyse des ventes", command: "/stats" },
        { icon: Users, label: "Gestion utilisateurs", command: "/utilisateurs" },
        { icon: DollarSign, label: "Rapport financier", command: "/finances" },
        { icon: Package, label: "État du stock", command: "/produits" },
        { icon: TrendingUp, label: "Prédictions IA", command: "Prédis les tendances du prochain trimestre" },
        { icon: Settings, label: "Optimisation", command: "Comment améliorer nos performances ?" },
    ];

    useEffect(() => {
        if (context) {
            aiService.current.setContext(context);
        }

        // Message de bienvenue intelligente
        const welcomeMessage: Message = {
            id: 'welcome',
            type: 'assistant',
            content: `🤖 **Copilote IA 224Solutions activé !**

Bonjour ${profile?.first_name || 'PDG'} ! Je suis votre assistant intelligent personnel, dopé à l'IA conversationnelle avancée. 

**🧠 Mes capacités:**
• Analyse prédictive en temps réel
• Recommandations stratégiques personnalisées  
• Génération de rapports exécutifs automatiques
• Détection d'anomalies et alertes intelligentes
• Conversation naturelle comme avec ChatGPT

**💡 Pour commencer, vous pouvez:**
• Me poser des questions naturelles: "Comment vont nos ventes ?"
• Utiliser des commandes: \`/stats\`, \`/finances\`, \`/aide\`
• Cliquer sur les suggestions rapides ci-dessous
• Me demander des analyses: "Analyse-moi la performance des vendeurs"

Je suis là pour vous aider à prendre les meilleures décisions ! Que souhaitez-vous explorer ?`,
            timestamp: new Date()
        };

        setMessages([welcomeMessage]);
    }, [context, profile]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = inputValue.trim();
        setInputValue('');
        setIsLoading(true);

        try {
            // Ajouter le message utilisateur à l'interface
            const userMsg: Message = {
                id: Date.now().toString(),
                type: 'user',
                content: userMessage,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, userMsg]);

            // Obtenir la réponse de l'IA
            const response = await aiService.current.sendMessage(userMessage);

            // Ajouter la réponse à l'interface
            setMessages(prev => [...prev, response]);

            // Si l'IA suggère une action, l'exécuter
            if (response.metadata?.actions && onActionRequest) {
                response.metadata.actions.forEach((action: string) => {
                    onActionRequest(action, response.metadata?.data);
                });
            }

        } catch (error) {
            toast.error("Erreur lors de la communication avec l'IA");
            console.error("Erreur IA:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAction = (command: string) => {
        setInputValue(command);
        setTimeout(() => handleSendMessage(), 100);
    };

    const startVoiceRecognition = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            toast.error("Reconnaissance vocale non supportée dans ce navigateur");
            return;
        }

        setIsListening(true);

        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'fr-FR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(transcript);
            setIsListening(false);
            toast.success("Message vocal capturé !");
        };

        recognition.onerror = () => {
            setIsListening(false);
            toast.error("Erreur de reconnaissance vocale");
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content);
        toast.success("Message copié !");
    };

    const exportChat = () => {
        const chatContent = messages.map(msg =>
            `[${msg.timestamp.toLocaleTimeString()}] ${msg.type.toUpperCase()}: ${msg.content}`
        ).join('\n\n');

        const blob = new Blob([chatContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-copilote-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success("Chat exporté !");
    };

    const clearChat = () => {
        setMessages([]);
        aiService.current.clearHistory();
        toast.info("Conversation effacée");
    };

  return (
    <Card className="h-full flex flex-col bg-background border shadow-sm">
      <CardHeader className="border-b bg-card py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Brain className="w-5 h-5 text-primary" />
            Copilote IA
            <Badge variant="secondary" className="text-xs font-normal">
              <Sparkles className="w-3 h-3 mr-1" />
              Intelligent
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={exportChat} 
              className="h-7 px-2"
              title="Exporter"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearChat} 
              className="h-7 px-2"
              title="Nouvelle conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Actions rapides compactes */}
        <div className="p-3 bg-muted/30 border-b">
          <div className="grid grid-cols-3 gap-2 mb-2">
            {quickActions.slice(0, 6).map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action.command)}
                className="h-8 text-xs justify-start gap-1.5 px-2"
                disabled={isLoading}
              >
                <action.icon className="w-3.5 h-3.5" />
                <span className="truncate">{action.label}</span>
              </Button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['Bonjour', 'Statistiques', 'Aide'].map((suggestion) => (
              <Button
                key={suggestion}
                variant="ghost"
                size="sm"
                onClick={() => setInputValue(suggestion)}
                className="h-6 text-xs px-2 rounded-full"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        {/* Messages - Zone optimisée */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.type === 'assistant' && (
                  <Avatar className="w-7 h-7 bg-primary flex-shrink-0">
                    <AvatarFallback className="text-primary-foreground">
                      <Brain className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className={`max-w-[80%] rounded-lg p-3 shadow-sm ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border'
                }`}>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                  <div className={`flex items-center justify-between mt-2 pt-2 border-t ${
                    message.type === 'user' ? 'border-primary-foreground/20' : 'border-border'
                  }`}>
                    <span className={`text-xs ${message.type === 'user' ? 'opacity-70' : 'text-muted-foreground'}`}>
                      {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.type === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(message.content)}
                        className="h-5 px-1.5 -mr-1.5"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {message.type === 'user' && (
                  <Avatar className="w-7 h-7 bg-accent flex-shrink-0">
                    <AvatarFallback className="text-accent-foreground text-xs font-semibold">
                      {profile?.first_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <Avatar className="w-7 h-7 bg-primary flex-shrink-0">
                  <AvatarFallback className="text-primary-foreground">
                    <Brain className="w-4 h-4 animate-pulse" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card border rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground/20 border-t-muted-foreground"></div>
                    <span className="text-sm">Réflexion...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Zone de saisie compacte */}
        <div className="p-3 bg-card border-t">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Posez votre question..."
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                disabled={isLoading}
                className="h-9 text-sm pr-10"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={startVoiceRecognition}
                disabled={isLoading}
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 ${
                  isListening ? 'text-destructive animate-pulse' : ''
                }`}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
            
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="sm"
              className="h-9 px-4"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground/20 border-t-primary-foreground"></div>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" />
                  Envoyer
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs h-5">
              <Zap className="w-3 h-3 mr-1" />
              IA Avancée
            </Badge>
            <Badge variant="outline" className="text-xs h-5">
              <Terminal className="w-3 h-3 mr-1" />
              /stats /finances /aide
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Déclaration pour TypeScript (reconnaissance vocale)
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}
