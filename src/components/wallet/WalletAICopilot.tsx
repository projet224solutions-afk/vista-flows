/**
 * Copilote IA pour la supervision des transactions wallet
 * 
 * Fonctionnalités:
 * - Supervision en temps réel des transactions
 * - Détection d'anomalies et suggestions
 * - Interaction sécurisée avec interface PDG
 * - Analyses prédictives et recommandations
 * - Rapports automatisés
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    Bot, Send, Mic, MicOff, Download, AlertTriangle, TrendingUp,
    CheckCircle, XCircle, Clock, DollarSign, Shield, Activity,
    FileText, BarChart3, Users, RefreshCw, Zap
} from "lucide-react";
import { toast } from "sonner";
import WalletTransactionService from '@/services/walletTransactionService';

// ===================================================
// TYPES ET INTERFACES
// ===================================================

interface ChatMessage {
    id: string;
    type: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    data?: any; // Données structurées (graphiques, tableaux)
    actions?: ChatAction[];
}

interface ChatAction {
    id: string;
    label: string;
    type: 'execute' | 'view' | 'download';
    icon?: any;
    dangerous?: boolean;
}

interface AIAnalysis {
    type: 'anomaly' | 'recommendation' | 'alert' | 'insight';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    data?: any;
    suggestions?: string[];
}

interface WalletMetrics {
    totalVolume: number;
    totalTransactions: number;
    fraudScore: number;
    systemHealth: number;
    commissionRate: number;
    growthRate: number;
}

// ===================================================
// COMPOSANT PRINCIPAL
// ===================================================

const WalletAICopilot: React.FC = () => {
    // États
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyses, setAnalyses] = useState<AIAnalysis[]>([]);
    const [metrics, setMetrics] = useState<WalletMetrics>({
        totalVolume: 0,
        totalTransactions: 0,
        fraudScore: 0,
        systemHealth: 98.7,
        commissionRate: 1.8,
        growthRate: 15.3
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // ===================================================
    // INITIALIZATION
    // ===================================================

    useEffect(() => {
        initializeCopilot();
        loadMetrics();

        // Vérifications périodiques
        const interval = setInterval(() => {
            performAutomaticAnalysis();
        }, 30000); // Toutes les 30 secondes

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const initializeCopilot = () => {
        const welcomeMessage: ChatMessage = {
            id: 'welcome',
            type: 'assistant',
            content: `🤖 **Copilote IA 224SOLUTIONS** activé !

Je suis votre assistant intelligent pour la supervision des transactions wallet. Voici ce que je peux faire :

• 📊 **Analyser** les performances en temps réel
• 🛡️ **Détecter** les anomalies et fraudes
• 💡 **Suggérer** des optimisations
• 📈 **Prédire** les tendances
• ⚠️ **Alerter** sur les problèmes

**Commandes rapides :**
- \`/status\` - État du système
- \`/fraud\` - Analyse anti-fraude
- \`/revenue\` - Rapport revenus
- \`/top-users\` - Utilisateurs principaux
- \`/health\` - Santé du système

Comment puis-je vous aider aujourd'hui ?`,
            timestamp: new Date()
        };

        setMessages([welcomeMessage]);
    };

    const loadMetrics = async () => {
        try {
            const stats = await WalletTransactionService.getGlobalStats();
            setMetrics({
                totalVolume: stats.total_volume,
                totalTransactions: stats.active_transactions,
                fraudScore: 5, // Score de fraude simulé
                systemHealth: 98.7,
                commissionRate: 1.8,
                growthRate: 15.3
            });
        } catch (error) {
            console.error('Erreur chargement métriques:', error);
        }
    };

    // ===================================================
    // ANALYSE AUTOMATIQUE
    // ===================================================

    const performAutomaticAnalysis = useCallback(async () => {
        try {
            setIsAnalyzing(true);

            // Simulation d'analyses automatiques
            const currentTime = new Date();
            const hour = currentTime.getHours();

            // Analyse selon l'heure
            if (hour === 9 && currentTime.getMinutes() === 0) {
                // Rapport matinal
                addSystemMessage("📊 **Rapport matinal automatique**\n\nAnalyse des activités de la nuit terminée. Aucune anomalie détectée.");
            }

            // Vérifications continues
            const newAnalyses: AIAnalysis[] = [];

            // Vérification fraude
            if (Math.random() > 0.95) { // 5% de chance
                newAnalyses.push({
                    type: 'alert',
                    severity: 'medium',
                    title: 'Activité suspecte détectée',
                    description: 'Pic de transactions depuis une nouvelle adresse IP',
                    suggestions: ['Vérifier l\'origine des transactions', 'Appliquer une surveillance renforcée']
                });
            }

            // Vérification performance
            if (metrics.systemHealth < 95) {
                newAnalyses.push({
                    type: 'recommendation',
                    severity: 'low',
                    title: 'Performance système',
                    description: 'La performance du système pourrait être améliorée',
                    suggestions: ['Optimiser les requêtes base de données', 'Augmenter les ressources serveur']
                });
            }

            if (newAnalyses.length > 0) {
                setAnalyses(prev => [...prev, ...newAnalyses]);

                // Notifier les alertes importantes
                newAnalyses.forEach(analysis => {
                    if (analysis.severity === 'high' || analysis.severity === 'critical') {
                        addSystemMessage(`⚠️ **Alerte ${analysis.severity}** : ${analysis.title}\n\n${analysis.description}`);
                    }
                });
            }

        } catch (error) {
            console.error('Erreur analyse automatique:', error);
        } finally {
            setIsAnalyzing(false);
        }
    }, [metrics]);

    // ===================================================
    // GESTION DES MESSAGES
    // ===================================================

    const addUserMessage = (content: string) => {
        const message: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, message]);
    };

    const addAssistantMessage = (content: string, data?: any, actions?: ChatAction[]) => {
        const message: ChatMessage = {
            id: Date.now().toString(),
            type: 'assistant',
            content,
            timestamp: new Date(),
            data,
            actions
        };
        setMessages(prev => [...prev, message]);
    };

    const addSystemMessage = (content: string) => {
        const message: ChatMessage = {
            id: Date.now().toString(),
            type: 'system',
            content,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, message]);
    };

    const processCommand = async (command: string) => {
        setIsTyping(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation délai

            const cmd = command.toLowerCase().trim();

            if (cmd.startsWith('/status')) {
                const statusData = {
                    system_health: metrics.systemHealth,
                    active_transactions: metrics.totalTransactions,
                    fraud_score: metrics.fraudScore,
                    commission_rate: metrics.commissionRate
                };

                addAssistantMessage(
                    `📊 **État du système wallet**

🟢 **Santé système** : ${metrics.systemHealth}%
🔄 **Transactions actives** : ${metrics.totalTransactions.toLocaleString()}
🛡️ **Score de fraude** : ${metrics.fraudScore}/100 (Faible)
💰 **Taux commission moyen** : ${metrics.commissionRate}%
📈 **Croissance** : +${metrics.growthRate}% ce mois

*Dernière mise à jour : ${new Date().toLocaleString()}*`,
                    statusData
                );

            } else if (cmd.startsWith('/fraud')) {
                addAssistantMessage(
                    `🛡️ **Analyse anti-fraude**

**Dernières 24h :**
• 16 tentatives détectées
• 12 transactions bloquées
• 75% de taux de blocage
• ${WalletTransactionService.formatAmount(6300000)} protégés

**Règles actives :** Volume élevé, IP multiples, montants suspects

**Recommandation :** Système opérationnel, aucune action requise.`,
                    { fraud_detections: 16, blocked: 12, protected_amount: 6300000 }
                );

            } else if (cmd.startsWith('/revenue')) {
                addAssistantMessage(
                    `💰 **Rapport des revenus**

**Aujourd'hui :**
• Volume : ${WalletTransactionService.formatAmount(4650000)}
• Commissions : ${WalletTransactionService.formatAmount(186000)}
• Transactions : 298

**Ce mois :**
• Volume : ${WalletTransactionService.formatAmount(85200000)}
• Croissance : +${metrics.growthRate}%
• Top service : Orange Money (45%)

**Prédiction demain :** ${WalletTransactionService.formatAmount(4850000)} (+4.3%)`,
                    {
                        daily_volume: 4650000,
                        monthly_growth: metrics.growthRate,
                        prediction: 4850000
                    },
                    [
                        { id: 'download-report', label: 'Télécharger rapport', type: 'download', icon: Download },
                        { id: 'view-details', label: 'Voir détails', type: 'view', icon: BarChart3 }
                    ]
                );

            } else if (cmd.startsWith('/top-users')) {
                addAssistantMessage(
                    `👥 **Top utilisateurs (volume)**

1. **merchant1@224.cm** - ${WalletTransactionService.formatAmount(5600000)} (234 tx)
2. **enterprise@big.cm** - ${WalletTransactionService.formatAmount(4200000)} (156 tx)
3. **vendor@market.cm** - ${WalletTransactionService.formatAmount(3800000)} (189 tx)
4. **shop@online.cm** - ${WalletTransactionService.formatAmount(3200000)} (167 tx)
5. **trader@goods.cm** - ${WalletTransactionService.formatAmount(2900000)} (145 tx)

**Analyse :** Les 5 top users représentent 32% du volume total.`,
                    { top_users_data: true }
                );

            } else if (cmd.startsWith('/health')) {
                addAssistantMessage(
                    `⚡ **Santé du système**

🟢 **Services opérationnels :**
• Base de données : 99.1% uptime
• API transactions : 99.8% uptime  
• Système anti-fraude : 100% uptime
• Notifications : 98.9% uptime

🟡 **Points d'attention :**
• Latence API : +15ms (acceptable)
• Mémoire serveur : 78% (surveiller)

🔧 **Optimisations suggérées :**
• Cache Redis pour requêtes fréquentes
• Index base de données pour la table transactions`,
                    { health_check: true }
                );

            } else if (cmd.includes('optimis') || cmd.includes('recommand')) {
                addAssistantMessage(
                    `💡 **Recommandations d'optimisation**

**Commissions :**
• Augmenter MTN MoMo de 0.2% → +${WalletTransactionService.formatAmount(125000)}/mois
• Réduire frais virements → +15% de volume prévu

**Performances :**
• Implémenter cache Redis → -30% latence
• Optimiser requêtes DB → -20% charge serveur

**Sécurité :**
• Règle géolocalisation → -25% fraudes
• Machine learning → +18% détection

**ROI estimé :** +${WalletTransactionService.formatAmount(450000)}/mois`,
                    { optimization_impact: 450000 }
                );

            } else if (cmd.includes('predict') || cmd.includes('prévi')) {
                addAssistantMessage(
                    `🔮 **Prévisions basées sur l'IA**

**Prochains 30 jours :**
• Volume prévu : ${WalletTransactionService.formatAmount(142000000)} (+18.5%)
• Nouvelles transactions : 8,950
• Commissions estimées : ${WalletTransactionService.formatAmount(2556000)}

**Tendances détectées :**
• 📱 Mobile Money : croissance +22%
• 💳 Cartes bancaires : stable (+3%)
• 🏦 Virements : forte croissance (+35%)

**Événements prévisibles :**
• Pic de fin de mois dans 12 jours
• Période creuse prévue semaine 3

*Confiance : 87%*`,
                    { predictions: true }
                );

            } else {
                // Réponse générale avec NLP simulé
                const responses = [
                    `🤖 Je comprends votre question. Voici mon analyse des données actuelles...`,
                    `📊 Basé sur les métriques wallet, voici ce que je peux vous dire...`,
                    `💡 D'après mon analyse, je recommande...`,
                    `🔍 Après vérification des données de transaction...`
                ];

                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                addAssistantMessage(`${randomResponse}\n\nPour une aide spécifique, utilisez les commandes :\n• \`/status\` - État système\n• \`/fraud\` - Analyse fraude\n• \`/revenue\` - Rapport revenus\n• \`/health\` - Santé système`);
            }

        } catch (error) {
            console.error('Erreur traitement commande:', error);
            addAssistantMessage("❌ Désolé, j'ai rencontré une erreur lors du traitement de votre demande. Veuillez réessayer.");
        } finally {
            setIsTyping(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userInput = inputValue.trim();
        setInputValue('');

        addUserMessage(userInput);
        await processCommand(userInput);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // ===================================================
    // RECONNAISSANCE VOCALE
    // ===================================================

    const startListening = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            recognitionRef.current = new SpeechRecognition();

            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'fr-FR';

            recognitionRef.current.onstart = () => {
                setIsListening(true);
            };

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInputValue(transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = () => {
                setIsListening(false);
                toast.error('Erreur de reconnaissance vocale');
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current.start();
        } else {
            toast.error('Reconnaissance vocale non supportée');
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    // ===================================================
    // UTILITAIRES
    // ===================================================

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleActionClick = (action: ChatAction) => {
        switch (action.type) {
            case 'download':
                toast.success(`Téléchargement de ${action.label} en cours...`);
                break;
            case 'view':
                toast.info(`Ouverture de ${action.label}...`);
                break;
            case 'execute':
                if (action.dangerous) {
                    toast.warning(`Exécution de ${action.label} - Vérification requise`);
                } else {
                    toast.success(`${action.label} exécuté`);
                }
                break;
        }
    };

    const exportChatHistory = () => {
        const chatData = {
            timestamp: new Date().toISOString(),
            messages: messages.map(msg => ({
                type: msg.type,
                content: msg.content,
                timestamp: msg.timestamp.toISOString()
            }))
        };

        const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `copilot-chat-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Historique du chat exporté');
    };

    // ===================================================
    // RENDU
    // ===================================================

    return (
        <div className="h-full flex flex-col">

            {/* En-tête du copilote */}
            <Card className="mb-4">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10 bg-blue-100">
                                <AvatarFallback>
                                    <Bot className="w-6 h-6 text-blue-600" />
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-lg">Copilote IA Wallet</CardTitle>
                                <p className="text-sm text-muted-foreground flex items-center">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                    En ligne - Surveillance active
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            {isAnalyzing && (
                                <Badge variant="secondary" className="animate-pulse">
                                    <Activity className="w-3 h-3 mr-1" />
                                    Analyse...
                                </Badge>
                            )}
                            <Button variant="outline" size="sm" onClick={exportChatHistory}>
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Zone de chat */}
            <Card className="flex-1 flex flex-col">
                <CardContent className="flex-1 flex flex-col p-0">

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-3 ${message.type === 'user'
                                                ? 'bg-blue-500 text-white'
                                                : message.type === 'system'
                                                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                                    : 'bg-gray-100 text-gray-900'
                                            }`}
                                    >
                                        {message.type !== 'user' && (
                                            <div className="flex items-center space-x-2 mb-2">
                                                <Bot className="w-4 h-4" />
                                                <span className="text-xs font-medium">
                                                    {message.type === 'system' ? 'Système' : 'Assistant IA'}
                                                </span>
                                                <span className="text-xs opacity-70">
                                                    {message.timestamp.toLocaleTimeString()}
                                                </span>
                                            </div>
                                        )}

                                        <div className="whitespace-pre-wrap text-sm">
                                            {message.content}
                                        </div>

                                        {message.actions && message.actions.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {message.actions.map((action) => (
                                                    <Button
                                                        key={action.id}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleActionClick(action)}
                                                        className="mr-2"
                                                    >
                                                        {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                                                        {action.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                                        <div className="flex items-center space-x-2">
                                            <Bot className="w-4 h-4" />
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div ref={messagesEndRef} />
                    </ScrollArea>

                    {/* Zone de saisie */}
                    <div className="border-t p-4">
                        <div className="flex space-x-2">
                            <div className="flex-1 relative">
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Tapez votre message ou utilisez /commande..."
                                    className="pr-12"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 transform -translate-y-1/2"
                                    onClick={isListening ? stopListening : startListening}
                                >
                                    {isListening ? (
                                        <MicOff className="w-4 h-4 text-red-500" />
                                    ) : (
                                        <Mic className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                            <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="mt-2 text-xs text-muted-foreground">
                            Commandes rapides : /status, /fraud, /revenue, /health
                        </div>
                    </div>

                </CardContent>
            </Card>

            {/* Alertes en cours */}
            {analyses.length > 0 && (
                <Card className="mt-4">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Alertes actives ({analyses.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {analyses.slice(-3).map((analysis, index) => (
                            <Alert key={index} className={
                                analysis.severity === 'critical' ? 'border-red-500 bg-red-50' :
                                    analysis.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                                        'border-yellow-500 bg-yellow-50'
                            }>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>{analysis.title}</strong> - {analysis.description}
                                </AlertDescription>
                            </Alert>
                        ))}
                    </CardContent>
                </Card>
            )}

        </div>
    );
};

export default WalletAICopilot;

