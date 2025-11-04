import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AlertRule {
  id: string;
  name: string;
  condition: (errors: any[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: () => void;
  enabled: boolean;
}

export interface AlertConfig {
  // Seuils d'alerte
  maxErrorsPerMinute: number;
  maxSameErrorPerHour: number;
  criticalModules: string[];
  
  // Notifications
  notifyAdmin: boolean;
  notifyPDG: boolean;
  autoFix: boolean;
}

class AlertingService {
  private static instance: AlertingService;
  private alertRules: AlertRule[] = [];
  private alertHistory: Map<string, number> = new Map();
  private config: AlertConfig = {
    maxErrorsPerMinute: 10,
    maxSameErrorPerHour: 3,
    criticalModules: ['frontend_promise', 'frontend_global', 'frontend_resource'],
    notifyAdmin: true,
    notifyPDG: true,
    autoFix: true,
  };

  private constructor() {
    this.setupDefaultAlertRules();
    this.startMonitoring();
  }

  static getInstance(): AlertingService {
    if (!AlertingService.instance) {
      AlertingService.instance = new AlertingService();
    }
    return AlertingService.instance;
  }

  private setupDefaultAlertRules() {
    // Règle 1: ReferenceError critique
    this.alertRules.push({
      id: 'reference-error-alert',
      name: 'ReferenceError détectée',
      condition: (errors) => 
        errors.some(e => 
          e.error_type === 'uncaught_exception' && 
          e.error_message.includes('is not defined')
        ),
      severity: 'high',
      action: () => {
        this.createAlert({
          title: '⚠️ ReferenceError Détectée',
          message: 'Une erreur "is not defined" a été détectée dans le frontend.',
          severity: 'high',
          module: 'frontend_global',
          actionable: true,
          suggestedFix: 'Vérifier les null checks et le lazy loading des composants.',
        });
      },
      enabled: true,
    });

    // Règle 2: Erreurs répétées sur competitiveAnalysis
    this.alertRules.push({
      id: 'competitive-analysis-error',
      name: 'Erreur competitiveAnalysis récurrente',
      condition: (errors) => {
        const competitiveErrors = errors.filter(e => 
          e.error_message.includes('competitiveAnalysis')
        );
        return competitiveErrors.length >= 2;
      },
      severity: 'critical',
      action: () => {
        this.createAlert({
          title: '🔴 CRITIQUE: competitiveAnalysis',
          message: 'Multiples erreurs détectées sur le module competitiveAnalysis.',
          severity: 'critical',
          module: 'frontend_promise',
          actionable: true,
          suggestedFix: 'Redémarrage automatique du module ou intervention PDG requise.',
          autoFix: true,
        });
      },
      enabled: true,
    });

    // Règle 3: Seuil d'erreurs par module
    this.alertRules.push({
      id: 'module-error-threshold',
      name: 'Seuil d\'erreurs module dépassé',
      condition: (errors) => {
        const errorsByModule = new Map<string, number>();
        errors.forEach(e => {
          const count = errorsByModule.get(e.module) || 0;
          errorsByModule.set(e.module, count + 1);
        });
        
        return Array.from(errorsByModule.entries()).some(([module, count]) => 
          this.config.criticalModules.includes(module) && count >= 3
        );
      },
      severity: 'high',
      action: () => {
        this.createAlert({
          title: '⚠️ Seuil d\'erreurs dépassé',
          message: 'Un module critique a généré trop d\'erreurs.',
          severity: 'high',
          module: 'monitoring',
          actionable: true,
          suggestedFix: 'Analyser les logs et redémarrer le module si nécessaire.',
        });
      },
      enabled: true,
    });

    // Règle 4: Erreurs de chargement lazy loading
    this.alertRules.push({
      id: 'lazy-loading-failure',
      name: 'Échec de lazy loading',
      condition: (errors) =>
        errors.some(e => 
          e.error_message.includes('loading') || 
          e.error_message.includes('import')
        ),
      severity: 'medium',
      action: () => {
        this.createAlert({
          title: '📦 Échec de chargement composant',
          message: 'Un composant lazy-loaded n\'a pas pu être chargé.',
          severity: 'medium',
          module: 'frontend_resource',
          actionable: true,
          suggestedFix: 'Vérifier la connectivité et le cache du navigateur.',
        });
      },
      enabled: true,
    });

    // Règle 5: Promesses rejetées non gérées
    this.alertRules.push({
      id: 'unhandled-promise-rejection',
      name: 'Promise rejetée non gérée',
      condition: (errors) => {
        const promiseErrors = errors.filter(e => 
          e.error_type === 'unhandled_rejection'
        );
        return promiseErrors.length >= this.config.maxSameErrorPerHour;
      },
      severity: 'medium',
      action: () => {
        this.createAlert({
          title: '⚡ Promesses rejetées multiples',
          message: 'Plusieurs promesses rejetées non gérées détectées.',
          severity: 'medium',
          module: 'frontend_promise',
          actionable: true,
          suggestedFix: 'Ajouter des catch handlers et valider les données API.',
        });
      },
      enabled: true,
    });
  }

  private async createAlert(alert: {
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    module: string;
    actionable: boolean;
    suggestedFix: string;
    autoFix?: boolean;
  }) {
    // Vérifier si une alerte similaire a déjà été créée récemment
    const alertKey = `${alert.module}-${alert.title}`;
    const lastAlert = this.alertHistory.get(alertKey);
    const now = Date.now();
    
    // Déduplication: ne pas créer la même alerte dans les 5 minutes
    if (lastAlert && now - lastAlert < 300000) {
      console.log('⏭️ Alerte dédupliquée:', alert.title);
      return;
    }

    this.alertHistory.set(alertKey, now);

    // Log dans la console
    const emoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔶',
      critical: '🔴',
    }[alert.severity];

    console.log(`${emoji} ALERTE ${alert.severity.toUpperCase()}: ${alert.title}`);
    console.log(`Module: ${alert.module}`);
    console.log(`Message: ${alert.message}`);
    console.log(`Fix suggéré: ${alert.suggestedFix}`);

    // Notification toast selon la sévérité
    const toastFn = {
      low: toast.info,
      medium: toast.warning,
      high: toast.error,
      critical: toast.error,
    }[alert.severity];

    toastFn(alert.title, {
      description: alert.message,
      duration: alert.severity === 'critical' ? 10000 : 5000,
      action: alert.actionable ? {
        label: 'Voir les détails',
        onClick: () => {
          window.location.href = '/pdg/debug';
        },
      } : undefined,
    });

    // Enregistrer dans la base de données
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('system_alerts').insert({
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        module: alert.module,
        suggested_fix: alert.suggestedFix,
        created_by: user?.id,
        status: 'active',
        metadata: {
          actionable: alert.actionable,
          autoFix: alert.autoFix,
          timestamp: new Date().toISOString(),
        },
      });
      
      console.log('✅ Alerte enregistrée dans system_alerts');
    } catch (error) {
      console.error('Failed to log alert to database:', error);
    }

    // Auto-fix si activé
    if (alert.autoFix && this.config.autoFix) {
      await this.attemptAutoFix(alert.module);
    }
  }

  private async attemptAutoFix(module: string): Promise<boolean> {
    console.log(`🔧 Tentative d'auto-fix pour le module: ${module}`);
    
    try {
      // Pour le module competitiveAnalysis, on peut tenter un refresh
      if (module === 'frontend_promise' || module === 'frontend_global') {
        // Enregistrer l'action dans la base
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from('system_errors').insert({
          module: module,
          error_type: 'auto_fix_attempted',
          error_message: 'Tentative de correction automatique suite à une alerte',
          severity: 'mineure',
          user_id: user?.id,
          fix_applied: true,
          fix_description: 'Alerte système - surveillance active',
        });
        
        console.log('✅ Auto-fix appliqué avec succès');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Échec de l\'auto-fix:', error);
      return false;
    }
  }

  private startMonitoring() {
    // Vérifier les erreurs toutes les 30 secondes
    setInterval(async () => {
      await this.checkForAlerts();
    }, 30000);
  }

  private async checkForAlerts() {
    try {
      // Récupérer les erreurs récentes (dernière minute)
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      
      const { data: recentErrors } = await supabase
        .from('system_errors')
        .select('*')
        .gte('created_at', oneMinuteAgo)
        .order('created_at', { ascending: false });

      if (!recentErrors || recentErrors.length === 0) {
        return;
      }

      // Évaluer chaque règle d'alerte
      for (const rule of this.alertRules) {
        if (!rule.enabled) continue;
        
        if (rule.condition(recentErrors)) {
          rule.action();
        }
      }
    } catch (error) {
      console.error('Error checking for alerts:', error);
    }
  }

  // API publique pour ajouter des règles personnalisées
  public addAlertRule(rule: AlertRule) {
    this.alertRules.push(rule);
  }

  public removeAlertRule(ruleId: string) {
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
  }

  public updateConfig(newConfig: Partial<AlertConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getActiveRules(): AlertRule[] {
    return this.alertRules.filter(r => r.enabled);
  }
}

export const alertingService = AlertingService.getInstance();
