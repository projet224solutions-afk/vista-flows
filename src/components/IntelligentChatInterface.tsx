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
    <Card className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-7 h-7 animate-pulse" />
          <Sparkles className="w-6 h-6 animate-bounce" />
          Assistant IA - 224Solutions
          <Badge variant="secondary" className="bg-yellow-400 text-black animate-pulse font-bold">
            🤖 Mode ChatGPT
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-2 text-sm opacity-90">
          <Zap className="w-4 h-4" />
          Tapez votre message ci-dessous pour une conversation intelligente
        </div>
      </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
                {/* Actions rapides organisées */}
                <div className="p-4 bg-gradient-to-r from-white to-blue-50 border-b-2 border-blue-100">
                    <div className="text-center mb-3">
                        <h3 className="text-sm font-bold text-blue-800 mb-1">
                            🚀 Actions Rapides Intelligentes
                        </h3>
                        <p className="text-xs text-blue-600">
                            Cliquez pour des analyses instantanées ou tapez vos questions ci-dessous
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {quickActions.map((action, index) => (
                            <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAction(action.command)}
                                className="flex items-center gap-2 text-xs p-3 h-auto whitespace-normal text-left justify-start border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-100 transition-all duration-200 hover:scale-105 rounded-lg shadow-sm"
                                disabled={isLoading}
                            >
                                <action.icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                <span className="flex-1 font-medium">{action.label}</span>
                            </Button>
                        ))}
                    </div>
                    
                    {/* Suggestions de conversation */}
                    <div className="mt-4 pt-3 border-t border-blue-200">
                        <p className="text-xs font-medium text-blue-700 mb-2">💬 Essayez ces phrases :</p>
                        <div className="flex flex-wrap gap-2">
                            {['Bonjour', 'Comment ça va ?', 'Mes ventes augmentent ?', 'Recommandations'].map((suggestion) => (
                                <Button
                                    key={suggestion}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setInputValue(suggestion)}
                                    className="text-xs px-2 py-1 h-auto bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full"
                                >
                                    {suggestion}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'
                                }`}>
                                {message.type === 'assistant' && (
                                    <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500">
                                        <AvatarFallback className="text-white text-xs">
                                            <Brain className="w-4 h-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                )}

                                <div className={`max-w-[80%] rounded-lg p-3 ${message.type === 'user'
                                        ? 'bg-blue-600 text-white ml-8'
                                        : 'bg-white border border-gray-200 shadow-sm'
                                    }`}>
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {message.content}
                                    </div>

                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                        <span className="text-xs opacity-70">
                                            {message.timestamp.toLocaleTimeString()}
                                        </span>

                                        {message.type === 'assistant' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyMessage(message.content)}
                                                className="h-6 px-2"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {message.type === 'user' && (
                                    <Avatar className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500">
                                        <AvatarFallback className="text-white text-xs font-bold">
                                            {profile?.first_name?.[0] || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500">
                                    <AvatarFallback className="text-white text-xs">
                                        <Brain className="w-4 h-4 animate-pulse" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-blue-600">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        <span className="text-sm">L'IA analyse votre demande...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Zone de saisie améliorée */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200">
                    <div className="text-center mb-3">
                        <p className="text-sm font-semibold text-blue-800">
                            💬 Conversation avec votre Assistant IA
                        </p>
                        <p className="text-xs text-blue-600">
                            Tapez votre message comme si vous parliez à ChatGPT
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Tapez ici... Ex: 'Bonjour', 'Comment vont nos ventes ?', 'Analyse mes finances'"
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={isLoading}
                                className="text-lg py-3 px-4 pr-12 border-2 border-blue-300 focus:border-blue-500 rounded-xl shadow-md bg-white"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={startVoiceRecognition}
                                disabled={isLoading}
                                className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-full ${
                                    isListening ? 'text-red-500 animate-pulse bg-red-50' : 'text-blue-400 hover:bg-blue-50'
                                }`}
                                title="Reconnaissance vocale"
                            >
                                <Mic className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        <Button 
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Send className="w-5 h-5 mr-2" />
                                    Envoyer
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Mode IA Avancé
                            </Badge>
                            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                                <Terminal className="w-3 h-3 mr-1" />
                                Commandes: /stats /aide
                            </Badge>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={exportChat} className="h-6 px-2">
                                <Download className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={clearChat} className="h-6 px-2">
                                <RefreshCw className="w-3 h-3" />
                            </Button>
                        </div>
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
