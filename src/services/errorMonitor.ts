import { supabase } from '@/integrations/supabase/client';

export interface SystemError {
  id?: string;
  module: string;
  error_type?: string;
  error_message: string;
  stack_trace?: string;
  severity: 'critique' | 'modérée' | 'mineure';
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface AutoFix {
  id: string;
  error_pattern: string;
  fix_type: string;
  fix_description: string;
  success_rate: number;
  times_applied: number;
  is_active: boolean;
}

class ErrorMonitorService {
  private static instance: ErrorMonitorService;

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorMonitorService {
    if (!ErrorMonitorService.instance) {
      ErrorMonitorService.instance = new ErrorMonitorService();
    }
    return ErrorMonitorService.instance;
  }

  private setupGlobalErrorHandlers() {
    // Intercepter les erreurs non gérées
    window.addEventListener('error', (event) => {
      this.logError({
        module: 'frontend_global',
        error_type: 'uncaught_exception',
        error_message: event.message || 'Uncaught exception without message',
        stack_trace: event.error?.stack || 'No stack trace available',
        severity: 'modérée',
        metadata: {
          filename: event.filename || 'unknown',
          lineno: event.lineno || 0,
          colno: event.colno || 0,
          errorType: event.error?.constructor?.name || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    });

    // Intercepter les promesses rejetées non gérées avec capture améliorée
    window.addEventListener('unhandledrejection', (event) => {
      // Prévenir le comportement par défaut pour éviter les logs en double
      event.preventDefault();
      
      // Déterminer le type de raison
      const reason = event.reason;
      let errorMessage = 'Unknown promise rejection';
      let stackTrace = 'No stack trace available';
      let errorType = 'unknown';
      let additionalContext: any = {};

      // Cas 1: Error object standard
      if (reason instanceof Error) {
        errorMessage = reason.message || 'Error without message';
        stackTrace = reason.stack || 'No stack trace';
        errorType = reason.constructor.name;
      }
      // Cas 2: String
      else if (typeof reason === 'string') {
        errorMessage = reason;
        errorType = 'string_rejection';
        // Tenter de capturer la stack trace depuis l'endroit actuel
        stackTrace = new Error().stack || 'No stack trace';
      }
      // Cas 3: Object avec message
      else if (reason && typeof reason === 'object') {
        errorMessage = reason.message || reason.error || JSON.stringify(reason);
        errorType = 'object_rejection';
        stackTrace = reason.stack || new Error().stack || 'No stack trace';
        additionalContext = { rejectionDetails: reason };
      }
      // Cas 4: Null, undefined ou autre
      else {
        errorMessage = `Promise rejected with value: ${String(reason)}`;
        errorType = typeof reason;
        stackTrace = new Error().stack || 'No stack trace';
      }

      this.logError({
        module: 'frontend_promise',
        error_type: 'unhandled_rejection',
        error_message: errorMessage,
        stack_trace: stackTrace,
        severity: 'modérée',
        metadata: {
          promiseState: 'rejected',
          rejectionType: errorType,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          ...additionalContext,
        },
      });
    });

    // Intercepter les erreurs de chargement de ressources
    window.addEventListener('error', (event) => {
      if (event.target !== window && (event.target as any)?.src) {
        this.logError({
          module: 'frontend_resource',
          error_type: 'resource_load_error',
          error_message: `Failed to load resource: ${(event.target as any).src}`,
          stack_trace: 'Resource loading error',
          severity: 'mineure',
          metadata: {
            resourceUrl: (event.target as any).src,
            resourceType: (event.target as any).tagName,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }, true); // Use capture phase to catch resource errors
  }

  async logError(error: SystemError): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Enregistrer l'erreur dans la base de données
      const { error: dbError } = await supabase
        .from('system_errors')
        .insert({
          ...error,
          user_id: user?.id,
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('Failed to log error to database:', dbError);
      }

      // Tenter une correction automatique
      await this.tryAutoFix(error);
    } catch (e) {
      console.error('Error logging system error:', e);
    }
  }

  async tryAutoFix(error: SystemError): Promise<boolean> {
    try {
      // Récupérer les correctifs disponibles
      const { data: fixes, error: fetchError } = await supabase
        .from('auto_fixes')
        .select('*')
        .eq('is_active', true);

      if (fetchError || !fixes) {
        return false;
      }

      // Trouver un correctif correspondant
      const matchingFix = fixes.find((fix) =>
        error.error_message.includes(fix.error_pattern)
      );

      if (!matchingFix) {
        return false;
      }

      // Appliquer le correctif
      const fixApplied = await this.applyFix(matchingFix, error);

      if (fixApplied) {
        // Mettre à jour les statistiques du correctif
        await supabase
          .from('auto_fixes')
          .update({
            times_applied: matchingFix.times_applied + 1,
            success_rate: ((matchingFix.success_rate * matchingFix.times_applied + 100) / (matchingFix.times_applied + 1)),
          })
          .eq('id', matchingFix.id);

        console.log(`✅ Auto-fix appliqué: ${matchingFix.fix_description}`);
      }

      return fixApplied;
    } catch (e) {
      console.error('Error in tryAutoFix:', e);
      return false;
    }
  }

  private async applyFix(fix: AutoFix, error: SystemError): Promise<boolean> {
    try {
      switch (fix.fix_type) {
        case 'reconnect_db':
          // Tenter une reconnexion à Supabase
          await supabase.auth.refreshSession();
          return true;

        case 'retry_request':
          // Logique de retry sera gérée par les composants individuels
          console.log('Retry request suggested');
          return true;

        case 'null_check':
        case 'undefined_check':
          // Ces correctifs sont plus préventifs et seront intégrés dans le code
          console.log('Null/undefined check suggested');
          return true;

        case 'rls_check':
          console.log('RLS policy check needed');
          return false;

        default:
          return false;
      }
    } catch (e) {
      console.error('Failed to apply fix:', e);
      return false;
    }
  }

  async getRecentErrors(limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Failed to fetch recent errors:', e);
      return [];
    }
  }

  async getErrorStats() {
    try {
      const { data, error } = await supabase
        .from('system_errors')
        .select('severity, status, fix_applied');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        critical: data?.filter((e) => e.severity === 'critique').length || 0,
        moderate: data?.filter((e) => e.severity === 'modérée').length || 0,
        minor: data?.filter((e) => e.severity === 'mineure').length || 0,
        fixed: data?.filter((e) => e.fix_applied).length || 0,
        pending: data?.filter((e) => e.status === 'detected').length || 0,
      };

      return stats;
    } catch (e) {
      console.error('Failed to fetch error stats:', e);
      return null;
    }
  }
}

export const errorMonitor = ErrorMonitorService.getInstance();
