/**
 * Monitoring & Error Tracking
 * Centralise la gestion des erreurs et le monitoring de performance
 */

export async function initMonitoring(): Promise<void> {
  console.log('📊 [Monitoring] Initialisation...');
  
  // Capturer les erreurs non gérées
  window.addEventListener('error', (event) => {
    console.error('[Monitoring] Erreur globale:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });
  
  // Capturer les rejections de promesses non gérées
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Monitoring] Promise rejetée:', event.reason);
  });
  
  // Performance monitoring basique
  if (typeof window !== 'undefined' && 'performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (timing) {
          console.log('📊 [Performance]', {
            domContentLoaded: Math.round(timing.domContentLoadedEventEnd - timing.startTime),
            loadComplete: Math.round(timing.loadEventEnd - timing.startTime),
            ttfb: Math.round(timing.responseStart - timing.startTime)
          });
        }
      }, 0);
    });
  }
  
  console.log('✅ [Monitoring] Initialisé');
}

export function logError(error: Error, context?: Record<string, unknown>): void {
  console.error('[Monitoring] Error:', error.message, { error, context });
}

export function logEvent(name: string, data?: Record<string, unknown>): void {
  console.log(`[Monitoring] Event: ${name}`, data);
}
