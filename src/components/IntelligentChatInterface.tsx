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
        <Card className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                    <Brain className="w-6 h-6" />
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    Copilote IA Intelligent
                    <Badge variant="secondary" className="bg-yellow-400 text-black animate-pulse">
                        🧠 ChatGPT Mode
                    </Badge>
                </CardTitle>
                <div className="flex items-center gap-2 text-sm opacity-90">
                    <Zap className="w-4 h-4" />
                    Intelligence conversationnelle avancée • Analyse prédictive • Recommandations stratégiques
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
                {/* Actions rapides */}
                <div className="p-4 bg-white border-b">
                    <div className="text-sm font-medium text-gray-700 mb-2">🚀 Actions rapides :</div>
                    <div className="flex flex-wrap gap-2">
                        {quickActions.map((action, index) => (
                            <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAction(action.command)}
                                className="text-xs hover:bg-blue-50 hover:border-blue-300"
                                disabled={isLoading}
                            >
                                <action.icon className="w-3 h-3 mr-1" />
                                {action.label}
                            </Button>
                        ))}
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

                {/* Input */}
                <div className="p-4 bg-white border-t">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Posez-moi une question intelligente... (ex: 'Comment améliorer nos ventes ?')"
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={isLoading}
                                className="pr-12 border-blue-200 focus:border-blue-400"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={startVoiceRecognition}
                                disabled={isLoading}
                                className={`absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400'
                                    }`}
                            >
                                <Mic className="w-4 h-4" />
                            </Button>
                        </div>

                        <Button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Send className="w-4 h-4" />
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
