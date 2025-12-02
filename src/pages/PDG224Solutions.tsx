// @ts-nocheck
import { useEffect, useState, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { resendEmailService } from '@/services/resendEmailService';
import { Shield, LogOut, Lock, Brain, Bell, Mail, UserCog, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useAdminUnifiedData } from '@/hooks/useAdminUnifiedData';
import { usePDGAIAssistant } from '@/hooks/usePDGAIAssistant';
import { usePDGErrorBoundary } from '@/hooks/usePDGErrorBoundary';
import PDGNavigation from '@/components/pdg/PDGNavigation';
import { PDGDashboardHome } from '@/components/pdg/PDGDashboardHome';
import { UserIdDisplay } from '@/components/UserIdDisplay';
import CommunicationWidget from '@/components/communication/CommunicationWidget';

// ✅ Pré-chargement paresseux des onglets pour meilleure perf perçue
const PDGFinance = lazy(() => import('@/components/pdg/PDGFinance'));
const PDGUsers = lazy(() => import('@/components/pdg/PDGUsers'));
const SecurityOpsPanel = lazy(() => import('@/components/pdg/SecurityOpsPanel'));
const PDGConfig = lazy(() => import('@/components/pdg/PDGConfig'));
const PDGCopilot = lazy(() => import('@/components/pdg/PDGCopilot'));
const PDGSystemMaintenance = lazy(() => import('@/components/pdg/PDGSystemMaintenance'));
const PDGProductsManagement = lazy(() => import('@/components/pdg/PDGProductsManagement'));
const PDGReportsAnalytics = lazy(() => import('@/components/pdg/PDGReportsAnalytics'));
const PDGAgentsManagement = lazy(() => import('@/components/pdg/PDGAgentsManagement'));
const PDGSyndicatManagement = lazy(() => import('@/components/pdg/PDGSyndicatManagement'));
const PDGAIAssistant = lazy(() => import('@/components/pdg/PDGAIAssistant'));
const UniversalCommunicationHub = lazy(() => import('@/components/communication/UniversalCommunicationHub'));
const GoogleCloudMonitoring = lazy(() => import('@/components/pdg/GoogleCloudMonitoring'));
const SystemConfiguration = lazy(() => import('@/components/pdg/SystemConfiguration'));
const TransferFeeSettings = lazy(() => import('@/components/admin/TransferFeeSettings'));
const PDGOrders = lazy(() => import('@/components/pdg/PDGOrders'));
const PDGVendors = lazy(() => import('@/components/pdg/PDGVendors'));
const PDGDrivers = lazy(() => import('@/components/pdg/PDGDrivers'));
const BugBountyDashboard = lazy(() => import('@/components/bug-bounty/BugBountyDashboard'));
const QuotesInvoicesPDG = lazy(() => import('@/components/pdg/QuotesInvoicesPDG'));
const AgentWalletAudit = lazy(() => import('@/components/pdg/AgentWalletAudit'));
const CopilotAuditTrail = lazy(() => import('@/components/pdg/CopilotAuditTrail'));
const PDGKYCManagement = lazy(() => import('@/components/pdg/PDGKYCManagement'));

export default function PDG224Solutions() {
  const { user, profile, profileLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const envOk = Boolean(import.meta.env.VITE_SUPABASE_URL && (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY));
  const [mfaVerified, setMfaVerified] = useState<boolean>(() => {
    // Persistance courte dans la session du navigateur
    return sessionStorage.getItem('mfa_verified_admin') === 'true';
  });
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const [showMfaDialog, setShowMfaDialog] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [generatedMfaCode, setGeneratedMfaCode] = useState<string | null>(null);
  const [mfaCodeExpiry, setMfaCodeExpiry] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const adminData = useAdminUnifiedData(!!profile && profile.role === 'admin');
  const { error, captureError, clearError } = usePDGErrorBoundary();

  // Hook IA Assistant
  const { aiActive, insights } = usePDGAIAssistant();

  const handleTabChange = useCallback((tab: string) => {
    // Redirection vers le centre de commande
    if (tab === 'command-center') {
      navigate('/pdg/command-center');
      return;
    }
    // Redirection vers la page de debug si c'est l'onglet debug
    if (tab === 'debug') {
      navigate('/pdg/debug');
      return;
    }
    // Redirection vers la page API Supervision si c'est l'onglet API
    if (tab === 'api') {
      navigate('/pdg/api-supervision');
      return;
    }
    setActiveTab(tab);
  }, [navigate]);

  useEffect(() => {
    // Si pas d'utilisateur, rediriger vers auth
    if (!user && !profileLoading) {
      navigate('/auth');
      return;
    }

    // Si le profil est chargé et que le rôle n'est pas admin
    if (profile && profile.role !== 'admin') {
      toast.error('Accès refusé - Réservé au PDG');
      navigate('/');
      return;
    }

    // Exiger MFA avant toute action PDG
    if (profile && profile.role === 'admin' && !mfaVerified) {
      setShowMfaDialog(true);
    }

    // Log de l'accès PDG une fois le profil chargé (après MFA si possible)
    if (profile && profile.role === 'admin') {
      const logAccess = async () => {
        try {
          await supabase.from('audit_logs').insert({
            actor_id: user!.id,
            action: 'PDG_ACCESS',
            target_type: 'dashboard',
            data_json: { timestamp: new Date().toISOString() }
          });
        } catch (error) {
          console.warn('Audit log indisponible:', error);
        }
      };
      logAccess();
    }
  }, [user, profile, profileLoading, navigate]);

  const handleSendMfaCode = useCallback(async () => {
    if (!user?.email) {
      toast.error('Email introuvable pour MFA');
      return;
    }
    try {
      // Générer un code à 6 chiffres
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedMfaCode(code);
      
      // Définir l'expiration à 10 minutes
      const expiryTime = Date.now() + 10 * 60 * 1000;
      setMfaCodeExpiry(expiryTime);
      
      // Envoyer le code par email via Resend
      const success = await resendEmailService.sendMfaCode(user.email, code);
      
      if (success) {
        toast.success('Code MFA à 6 chiffres envoyé à votre email');
      } else {
        toast.error('Erreur lors de l\'envoi du code');
      }
    } catch (e: any) {
      console.error('Erreur envoi code MFA:', e);
      toast.error(e.message || 'Échec envoi code MFA');
    }
  }, [user]);

  const handleVerifyMfa = useCallback(async () => {
    if (!user?.email) return;
    if (!mfaCode || mfaCode.length !== 6) {
      toast.error('Entrez le code à 6 chiffres reçu par email');
      return;
    }
    
    setVerifyingMfa(true);
    try {
      // Vérifier si le code a expiré
      if (!mfaCodeExpiry || Date.now() > mfaCodeExpiry) {
        toast.error('Code expiré. Demandez un nouveau code.');
        setGeneratedMfaCode(null);
        setMfaCodeExpiry(null);
        setMfaCode('');
        return;
      }
      
      // Vérifier si le code correspond
      if (mfaCode !== generatedMfaCode) {
        toast.error('Code MFA invalide');
        return;
      }
      
      // Code valide
      setMfaVerified(true);
      sessionStorage.setItem('mfa_verified_admin', 'true');
      setShowMfaDialog(false);
      setGeneratedMfaCode(null);
      setMfaCodeExpiry(null);
      toast.success('✅ MFA vérifié, accès PDG autorisé');
    } catch (e: any) {
      console.error('Erreur vérification MFA:', e);
      toast.error(e.message || 'Erreur lors de la vérification');
    } finally {
      setVerifyingMfa(false);
    }
  }, [user, mfaCode, generatedMfaCode, mfaCodeExpiry]);

  const handleUpdateEmail = useCallback(async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Veuillez entrer une adresse email valide');
      return;
    }

    setUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      
      if (error) throw error;

      toast.success('Email mis à jour avec succès. Vérifiez votre nouvelle adresse pour confirmer.');
      setShowEmailDialog(false);
      setNewEmail('');
    } catch (error: any) {
      console.error('Erreur mise à jour email:', error);
      toast.error(error.message || 'Échec de la mise à jour de l\'email');
    } finally {
      setUpdatingEmail(false);
    }
  }, [newEmail]);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <p className="text-destructive">Impossible de charger le profil</p>
          <Button onClick={() => navigate('/auth')}>Retour à la connexion</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Bandeau diagnostic pour éviter page blanche en cas d'env manquant */}
      {!envOk && (
        <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800">
          Clés Supabase manquantes: définissez `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`).
        </div>
      )}
      {/* Dialog MFA obligatoire pour PDG */}
      {profile?.role === 'admin' && !mfaVerified && (
        <Dialog open={showMfaDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Vérification MFA requise
              </DialogTitle>
              <DialogDescription>
                Un code de sécurité à 6 chiffres est nécessaire pour accéder à l'interface PDG.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Button 
                variant="secondary" 
                onClick={handleSendMfaCode} 
                disabled={verifyingMfa}
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Envoyer le code à 6 chiffres par email
              </Button>
              <div className="space-y-2">
                <label className="text-sm font-medium">Code de vérification</label>
                <Input
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest"
                />
              </div>
              <Button 
                onClick={handleVerifyMfa} 
                disabled={verifyingMfa || mfaCode.length !== 6}
                className="w-full"
              >
                {verifyingMfa ? 'Vérification...' : 'Vérifier le code'}
              </Button>
            </div>
            <DialogFooter>
              <p className="text-xs text-muted-foreground">
                🔐 Le code expire après 10 minutes. Ne le partagez avec personne.
              </p>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl">
          <div className="max-w-[1600px] mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/60 blur-xl opacity-50" />
                  <div className="relative bg-gradient-to-br from-primary to-primary/80 p-3 rounded-2xl shadow-2xl">
                    <Shield className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Interface PDG 224SOLUTIONS
                    </h1>
                    <UserIdDisplay layout="horizontal" showBadge={true} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                    <Lock className="w-3 h-3 text-green-500" />
                    Contrôle total et sécurisé de la plateforme
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/pdg/command-center')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  <Activity className="w-4 h-4" />
                  Centre de Commande
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/pdg/security')}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  <Shield className="w-4 h-4" />
                  Défense & Riposte
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/pdg/competitive-analysis')}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  <Activity className="w-4 h-4" />
                  Analyse Concurrentielle IA
                </Button>
                {!mfaVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyMfa}
                    disabled={verifyingMfa}
                    className="border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
                  >
                    {verifyingMfa ? 'Vérification…' : 'Vérifier MFA'}
                  </Button>
                )}
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20 gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Système Actif
                </Badge>
                {!envOk && (
                  <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 hover:bg-yellow-500/20">
                    Variables Env Manquantes
                  </Badge>
                )}
                {aiActive && (
                  <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20 gap-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    IA Active
                  </Badge>
                )}
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmailDialog(true)}
                  className="gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Modifier Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </Button>
              </div>
            </div>
            {!mfaVerified && (
              <div className="mt-4 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-sm text-orange-500 flex-1">
                    MFA non vérifié - Certaines actions critiques nécessiteront une vérification supplémentaire
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="max-w-[1600px] mx-auto px-6 pt-4">
            <ErrorBanner
              type={error.type}
              message={error.message}
              onDismiss={clearError}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Navigation */}
          <PDGNavigation 
            activeTab={activeTab}
            onTabChange={handleTabChange}
            aiActive={aiActive}
          />

          {/* Content */}
          <div className="mt-8 animate-fade-in">
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="text-muted-foreground">Chargement...</span>
                    </div>
                  </div>
                }>
                  {activeTab === 'dashboard' && (
                    <ErrorBoundary>
                      <PDGDashboardHome onNavigate={setActiveTab} />
                    </ErrorBoundary>
                  )}

                  {activeTab === 'finance' && (
                <ErrorBoundary>
                  <PDGFinance />
                </ErrorBoundary>
              )}

              {activeTab === 'users' && (
                <ErrorBoundary>
                  <PDGUsers />
                </ErrorBoundary>
              )}

              {activeTab === 'security' && (
                <ErrorBoundary>
                  <SecurityOpsPanel />
                </ErrorBoundary>
              )}

              {activeTab === 'config' && (
                <ErrorBoundary>
                  <SystemConfiguration />
                </ErrorBoundary>
              )}

              {activeTab === 'products' && (
                <ErrorBoundary>
                  <PDGProductsManagement />
                </ErrorBoundary>
              )}

              {activeTab === 'maintenance' && (
                <ErrorBoundary>
                  <PDGSystemMaintenance />
                </ErrorBoundary>
              )}

              {activeTab === 'agents' && (
                <ErrorBoundary>
                  <PDGAgentsManagement />
                </ErrorBoundary>
              )}

              {activeTab === 'syndicat' && (
                <ErrorBoundary>
                  <PDGSyndicatManagement />
                </ErrorBoundary>
              )}

              {activeTab === 'reports' && (
                <ErrorBoundary>
                  <PDGReportsAnalytics />
                </ErrorBoundary>
              )}

              {activeTab === 'ai-assistant' && (
                <ErrorBoundary>
                  <PDGAIAssistant mfaVerified={mfaVerified} />
                </ErrorBoundary>
              )}

              {activeTab === 'copilot' && (
                <ErrorBoundary>
                  <PDGCopilot mfaVerified={mfaVerified} />
                </ErrorBoundary>
              )}

              {activeTab === 'communication' && (
                <ErrorBoundary>
                  <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                    <UniversalCommunicationHub />
                  </Suspense>
                </ErrorBoundary>
              )}

              {activeTab === 'api' && (
                <ErrorBoundary>
                  <GoogleCloudMonitoring />
                </ErrorBoundary>
              )}

              {activeTab === 'transfer-fees' && (
                <ErrorBoundary>
                  <TransferFeeSettings />
                </ErrorBoundary>
              )}

              {activeTab === 'kyc' && (
                <ErrorBoundary>
                  <PDGKYCManagement />
                </ErrorBoundary>
              )}

              {activeTab === 'orders' && (
                <ErrorBoundary>
                  <PDGOrders />
                </ErrorBoundary>
              )}

              {activeTab === 'vendors' && (
                <ErrorBoundary>
                  <PDGVendors />
                </ErrorBoundary>
              )}

              {activeTab === 'drivers' && (
                <ErrorBoundary>
                  <PDGDrivers />
                </ErrorBoundary>
              )}

              {activeTab === 'quotes-invoices' && (
                <ErrorBoundary>
                  <QuotesInvoicesPDG />
                </ErrorBoundary>
              )}

              {activeTab === 'bug-bounty' && (
                <ErrorBoundary>
                  <BugBountyDashboard />
                </ErrorBoundary>
              )}

              {activeTab === 'agent-wallet-audit' && (
                <ErrorBoundary>
                  <AgentWalletAudit />
                </ErrorBoundary>
              )}

              {activeTab === 'copilot-audit' && (
                <ErrorBoundary>
                  <CopilotAuditTrail />
                </ErrorBoundary>
              )}

              {activeTab === 'transfer-fees' && (
                <ErrorBoundary>
                  <TransferFeeSettings />
                </ErrorBoundary>
              )}
            </Suspense>
          </div>
        </div>
      </div>

      {/* Dialog Modification Email */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Modifier l'adresse email
            </DialogTitle>
            <DialogDescription>
              Entrez votre nouvelle adresse email. Un email de confirmation sera envoyé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email actuel</label>
              <Input 
                value={user?.email || ''} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nouvel email</label>
              <Input
                type="email"
                placeholder="nouveau@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={updatingEmail}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailDialog(false);
                setNewEmail('');
              }}
              disabled={updatingEmail}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpdateEmail}
              disabled={updatingEmail || !newEmail}
            >
              {updatingEmail ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Widget de communication flottant */}
      <CommunicationWidget position="bottom-right" showNotifications={true} />
    </div>
  );
}
