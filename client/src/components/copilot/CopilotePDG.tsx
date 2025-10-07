/**
 * 🤖 COPILOTE PDG - INTERFACE AVANCÉE
 * Interface complète pour le PDG avec audit, Cursor et Git
 * Mode additif uniquement
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Clock,
  Shield,
  GitBranch,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Edit,
  Trash,
  Plus,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Activity,
  Zap,
  Brain,
  Code,
  Database,
  Server,
  Globe,
  Lock,
  Unlock,
  Key,
  Settings2,
  Wrench,
  Hammer,
  Target,
  Star,
  Award,
  Trophy,
  Crown
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
  kyc_verified: boolean;
  is_active: boolean;
}

interface Capabilities {
  audit: boolean;
  cursor: boolean;
  finance: boolean;
  users: boolean;
}

interface AuditReport {
  id: string;
  summary: string;
  status: string;
  created_at: string;
  total_issues: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
}

interface CopilotePDGProps {
  className?: string;
  height?: string;
}

export default function CopilotePDG({ className = '', height = '800px' }: CopilotePDGProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities>({
    audit: false,
    cursor: false,
    finance: false,
    users: false
  });
  const [auditReports, setAuditReports] = useState<AuditReport[]>([]);
  const [isAuditRunning, setIsAuditRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
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
      loadAuditReports();
    }
  }, [user?.id]);

  const loadHistory = async () => {
    try {
      const savedHistory = localStorage.getItem('copilote-pdg-history');
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        setMessages(history);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  };

  const loadAuditReports = async () => {
    try {
      // Simuler le chargement des rapports d'audit
      const mockReports: AuditReport[] = [
        {
          id: '1',
          summary: 'Audit complet: 7 anomalies détectées',
          status: 'completed',
          created_at: '2024-01-01T10:00:00Z',
          total_issues: 7,
          high_severity: 2,
          medium_severity: 3,
          low_severity: 2
        },
        {
          id: '2',
          summary: 'Audit de sécurité: 3 vulnérabilités trouvées',
          status: 'completed',
          created_at: '2024-01-01T08:00:00Z',
          total_issues: 3,
          high_severity: 1,
          medium_severity: 2,
          low_severity: 0
        }
      ];
      setAuditReports(mockReports);
    } catch (error) {
      console.error('Erreur lors du chargement des rapports:', error);
    }
  };

  const sendMessage = async () => {
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
      // Simulation de réponse du Copilote PDG
      const mockResponse = await simulatePDGResponse(userMessage.content);
      
      const data = {
        reply: mockResponse,
        timestamp: new Date().toISOString(),
        user_context: {
          name: "PDG 224Solutions",
          role: "PDG",
          balance: 1000000,
          currency: "GNF",
          kyc_verified: true,
          is_active: true
        },
        capabilities: {
          audit: true,
          cursor: true,
          finance: true,
          users: true
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
        localStorage.setItem('copilote-pdg-history', JSON.stringify(newMessages));
        return newMessages;
      });
      setUserContext(data.user_context);
      setCapabilities(data.capabilities);
      
      toast.success('Réponse reçue du Copilote PDG');

    } catch (error) {
      console.error('Erreur:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('Erreur de communication avec le Copilote PDG');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const simulatePDGResponse = async (message: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('audit') || lowerMessage.includes('scan')) {
      return `🔍 **Audit Système**\n\nJe peux lancer un audit complet du système 224Solutions ! 🚀\n\n**Capacités d'audit :**\n- Scan de sécurité (tokens hardcodés, CORS)\n- Analyse de code (ESLint, vulnérabilités)\n- Vérification des dépendances\n- Contrôle des schémas Supabase\n- Vérifications personnalisées\n\n**Actions disponibles :**\n- \`/audit run\` → Lancer un audit complet\n- \`/audit report\` → Consulter les rapports\n- \`/cursor analyze\` → Analyser avec Cursor\n\nVoulez-vous que je lance un audit maintenant ? 🔧`;
    }
    
    if (lowerMessage.includes('cursor') || lowerMessage.includes('analyse')) {
      return `🤖 **Intégration Cursor**\n\nJe suis connecté à Cursor pour l'analyse et la correction automatique ! ✨\n\n**Fonctionnalités Cursor :**\n- Analyse de code en temps réel\n- Détection d'erreurs automatique\n- Génération de correctifs\n- Application de patches\n- Communication bidirectionnelle\n\n**Actions disponibles :**\n- \`/cursor analyze\` → Analyser du code\n- \`/cursor patch\` → Appliquer des correctifs\n- \`/cursor status\` → Vérifier le statut\n\nJe peux automatiquement corriger les problèmes détectés ! 🛠️`;
    }
    
    if (lowerMessage.includes('git') || lowerMessage.includes('push') || lowerMessage.includes('pr')) {
      return `🚀 **Git Auto-Push**\n\nSystème de push automatique sécurisé activé ! 🔐\n\n**Fonctionnalités Git :**\n- Création automatique de branches\n- Commits intelligents\n- Pull Requests automatiques\n- Notifications PDG\n- Gestion des conflits\n\n**Workflow automatique :**\n1. Détection d'anomalie → Audit\n2. Analyse Cursor → Correctifs\n3. Application patch → Commit\n4. Push branche → PR\n5. Notification PDG → Validation\n\n**Sécurité :** Toutes les actions sont tracées et sécurisées ! 🛡️`;
    }
    
    if (lowerMessage.includes('finance') || lowerMessage.includes('taux') || lowerMessage.includes('devise')) {
      return `💰 **Gestion Financière PDG**\n\nContrôle complet des finances et taux de change ! 💎\n\n**Capacités financières :**\n- Gestion des taux de change\n- Simulation de conversions\n- Calcul des commissions\n- Suivi des transactions\n- Rapports financiers\n\n**Actions disponibles :**\n- \`/rate show\` → Afficher les taux\n- \`/rate edit\` → Modifier les taux\n- \`/finance simulation\` → Simuler conversions\n- \`/users manage\` → Gestion utilisateurs\n\nJe peux gérer toute la finance de 224Solutions ! 📊`;
    }
    
    if (lowerMessage.includes('aide') || lowerMessage.includes('help') || lowerMessage.includes('commandes')) {
      return `🆘 **Aide Copilote PDG**\n\nJe suis votre assistant IA complet pour 224Solutions ! 🤖\n\n**🎯 Capacités Principales :**\n- **Audit Système** : Scan complet et sécurisé\n- **Cursor IA** : Analyse et correction automatique\n- **Git Auto-Push** : Push automatique sécurisé\n- **Gestion Financière** : Contrôle des taux et transactions\n- **Gestion Utilisateurs** : Administration complète\n\n**🔧 Commandes Disponibles :**\n- \`/audit run\` → Audit système complet\n- \`/cursor analyze\` → Analyse Cursor\n- \`/rate edit\` → Modifier les taux\n- \`/users manage\` → Gestion utilisateurs\n- \`/system status\` → Statut système\n\n**🚀 Actions Rapides :**\n- Bouton "Lancer Audit" → Scan immédiat\n- Bouton "Analyser Code" → Cursor\n- Bouton "Push Auto" → Git automatique\n\nJe suis là pour vous aider à gérer 224Solutions ! 💪`;
    }
    
    // Réponse par défaut intelligente
    const responses = [
      `Je comprends votre demande : "${message}"\n\nEn tant que Copilote PDG, je peux vous aider avec :\n\n🔍 **Audit Système** : Scan complet et sécurisé\n🤖 **Cursor IA** : Analyse et correction automatique\n🚀 **Git Auto-Push** : Push automatique sécurisé\n💰 **Gestion Financière** : Contrôle des taux et transactions\n👥 **Gestion Utilisateurs** : Administration complète\n\nQue souhaitez-vous faire exactement ? 🎯`,
      `Excellente question ! 🤔\n\nPour vous aider au mieux, je peux :\n- Lancer des audits système complets\n- Analyser du code avec Cursor\n- Appliquer des correctifs automatiques\n- Gérer les finances et taux de change\n- Administrer les utilisateurs\n\nPouvez-vous me donner plus de détails sur ce que vous souhaitez accomplir ? 💡`,
      `Parfait ! 🎯\n\nJe suis le Copilote PDG de 224Solutions, votre assistant IA complet. Je peux gérer l'audit, Cursor, Git, les finances et bien plus encore !\n\nDites-moi simplement ce que vous voulez faire et je vous guiderai étape par étape. 🚀`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const runAudit = async () => {
    setIsAuditRunning(true);
    toast.info('Audit système en cours...');
    
    try {
      // Simuler l'audit
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const newReport: AuditReport = {
        id: Date.now().toString(),
        summary: 'Audit automatique: 5 anomalies détectées',
        status: 'completed',
        created_at: new Date().toISOString(),
        total_issues: 5,
        high_severity: 1,
        medium_severity: 2,
        low_severity: 2
      };
      
      setAuditReports(prev => [newReport, ...prev]);
      toast.success('Audit terminé avec succès');
      
    } catch (error) {
      toast.error('Erreur lors de l\'audit');
    } finally {
      setIsAuditRunning(false);
    }
  };

  const clearHistory = async () => {
    setMessages([]);
    setUserContext(null);
    localStorage.removeItem('copilote-pdg-history');
    toast.success('Historique effacé');
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

  return (
    <Card className={`flex flex-col ${className}`} style={{ height }}>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-600">
                <AvatarImage src="/copilote-pdg-avatar.png" alt="Copilote PDG" />
                <AvatarFallback>
                  <Crown className="h-6 w-6 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <CardTitle className="text-xl flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-purple-500" />
                <span>Copilote PDG</span>
                <Badge variant="secondary" className="ml-2">
                  <Crown className="h-3 w-3 mr-1" />
                  PDG
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Assistant IA complet avec audit, Cursor et Git
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('audit')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Shield className="h-4 w-4 mr-2" />
              Audit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('cursor')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Code className="h-4 w-4 mr-2" />
              Cursor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('git')}
              className="text-muted-foreground hover:text-foreground"
            >
              <GitBranch className="h-4 w-4 mr-2" />
              Git
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
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary">{userContext.role}</Badge>
                <span className="text-muted-foreground">
                  {userContext.name} • {userContext.balance.toLocaleString()} {userContext.currency}
                </span>
                {userContext.kyc_verified && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    KYC Vérifié
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {capabilities.audit && (
                  <Badge variant="outline" className="text-blue-600">
                    <Shield className="h-3 w-3 mr-1" />
                    Audit
                  </Badge>
                )}
                {capabilities.cursor && (
                  <Badge variant="outline" className="text-purple-600">
                    <Code className="h-3 w-3 mr-1" />
                    Cursor
                  </Badge>
                )}
                {capabilities.finance && (
                  <Badge variant="outline" className="text-green-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Finance
                  </Badge>
                )}
                {capabilities.users && (
                  <Badge variant="outline" className="text-orange-600">
                    <User className="h-3 w-3 mr-1" />
                    Users
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <Separator />

      {/* Interface à onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="cursor">Cursor</TabsTrigger>
          <TabsTrigger value="git">Git</TabsTrigger>
        </TabsList>

        {/* Chat */}
        <TabsContent value="chat" className="flex-1 p-0">
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Crown className="h-16 w-16 text-purple-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Copilote PDG</h3>
                    <p className="text-muted-foreground mb-4">
                      Votre assistant IA complet pour 224Solutions
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4" />
                        <span>Audit système</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Code className="h-4 w-4" />
                        <span>Analyse Cursor</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <GitBranch className="h-4 w-4" />
                        <span>Git automatique</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>Gestion financière</span>
                      </div>
                    </div>
                  </div>
                )}

                {messages.map((message, index) => {
                  const isUser = message.role === 'user';
                  const showDate = index === 0 || 
                    new Date(messages[index - 1].timestamp).toDateString() !== new Date(message.timestamp).toDateString();

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="flex items-center justify-center my-4">
                          <Badge variant="outline" className="text-xs">
                            {new Date(message.timestamp).toLocaleDateString('fr-FR')}
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
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                                <Crown className="h-4 w-4" />
                              </AvatarFallback>
                            )}
                          </Avatar>

                          <div className={`rounded-2xl px-4 py-3 ${
                            isUser 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-muted text-foreground'
                          }`}>
                            <div className="whitespace-pre-wrap text-sm">
                              {message.content}
                            </div>
                            <div className={`text-xs mt-1 ${
                              isUser ? 'text-blue-100' : 'text-muted-foreground'
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
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                          <Crown className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <div className="flex items-center space-x-1">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Copilote PDG réfléchit...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit" className="flex-1 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Audit Système</h3>
              <Button
                onClick={runAudit}
                disabled={isAuditRunning}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isAuditRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Audit en cours...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Lancer Audit
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Rapports Totaux</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{auditReports.length}</div>
                  <p className="text-xs text-muted-foreground">Rapports d'audit</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Anomalies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {auditReports.reduce((sum, r) => sum + r.total_issues, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Issues détectées</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Sécurité</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {auditReports.reduce((sum, r) => sum + r.high_severity, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Critiques</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Rapports d'Audit</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Résumé</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.summary}</TableCell>
                        <TableCell>
                          <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Badge variant="destructive" className="text-xs">
                              {report.high_severity}H
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {report.medium_severity}M
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {report.low_severity}L
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(report.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cursor */}
        <TabsContent value="cursor" className="flex-1 p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Intégration Cursor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Code className="h-5 w-5" />
                    <span>Analyse de Code</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Analyser du code avec Cursor pour détecter les problèmes et générer des correctifs.
                  </p>
                  <Button className="w-full">
                    <Brain className="h-4 w-4 mr-2" />
                    Analyser Code
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wrench className="h-5 w-5" />
                    <span>Application de Patches</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Appliquer automatiquement les correctifs générés par Cursor.
                  </p>
                  <Button className="w-full">
                    <Hammer className="h-4 w-4 mr-2" />
                    Appliquer Patch
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Git */}
        <TabsContent value="git" className="flex-1 p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Git Auto-Push</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <GitBranch className="h-5 w-5" />
                    <span>Branches Automatiques</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Création automatique de branches pour les corrections.
                  </p>
                  <Button className="w-full">
                    <GitBranch className="h-4 w-4 mr-2" />
                    Créer Branche
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Pull Requests</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Création automatique de PRs pour les corrections.
                  </p>
                  <Button className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Créer PR
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Input */}
      <div className="p-4">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tapez votre message au Copilote PDG..."
            disabled={false}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-purple-500 hover:bg-purple-600"
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
