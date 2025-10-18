/**
 * 🧪 TESTS E2E - DASHBOARD PDG - 224SOLUTIONS
 * Tests end-to-end pour le dashboard PDG
 */

import { test, expect } from '@playwright/test';

test.describe('PDG Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Naviguer vers le dashboard PDG
    await page.goto('/pdg');
    
    // Attendre que la page se charge
    await page.waitForLoadState('networkidle');
  });

  test('should display PDG authentication form', async ({ page }) => {
    // Vérifier que le formulaire d'authentification PDG est visible
    await expect(page.locator('[data-testid="pdg-auth-form"]')).toBeVisible();
    
    // Vérifier les champs requis
    await expect(page.locator('input[name="userCode"]')).toBeVisible();
    await expect(page.locator('input[name="accessCode"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should authenticate with valid PDG credentials', async ({ page }) => {
    // Remplir le formulaire d'authentification
    await page.fill('input[name="userCode"]', 'PDG001');
    await page.fill('input[name="accessCode"]', 'SECRET_MANAGER://pdg/access_code');
    
    // Soumettre le formulaire
    await page.click('button[type="submit"]');
    
    // Attendre la redirection vers le dashboard
    await page.waitForURL('/pdg/dashboard');
    
    // Vérifier que le dashboard est affiché
    await expect(page.locator('[data-testid="pdg-dashboard"]')).toBeVisible();
  });

  test('should display financial overview widget', async ({ page }) => {
    // Authentifier d'abord
    await page.fill('input[name="userCode"]', 'PDG001');
    await page.fill('input[name="accessCode"]', 'SECRET_MANAGER://pdg/access_code');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/pdg/dashboard');
    
    // Vérifier le widget financier
    await expect(page.locator('[data-testid="finance-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="transactions-stats"]')).toBeVisible();
  });

  test('should display AI insights widget when enabled', async ({ page }) => {
    // Authentifier
    await page.fill('input[name="userCode"]', 'PDG001');
    await page.fill('input[name="accessCode"]', 'SECRET_MANAGER://pdg/access_code');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/pdg/dashboard');
    
    // Activer les insights AI via feature flag
    await page.evaluate(() => {
      localStorage.setItem('feature_flags', JSON.stringify({ ai_insights: true }));
    });
    
    // Recharger la page
    await page.reload();
    
    // Vérifier que le widget AI insights est visible
    await expect(page.locator('[data-testid="ai-insights-widget"]')).toBeVisible();
  });

  test('should display financial alerts for pending payments', async ({ page }) => {
    // Authentifier
    await page.fill('input[name="userCode"]', 'PDG001');
    await page.fill('input[name="accessCode"]', 'SECRET_MANAGER://pdg/access_code');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/pdg/dashboard');
    
    // Vérifier les alertes financières
    await expect(page.locator('[data-testid="financial-alerts"]')).toBeVisible();
    
    // Vérifier qu'il y a des alertes si des paiements sont en attente
    const alertsCount = await page.locator('[data-testid="alert-item"]').count();
    if (alertsCount > 0) {
      await expect(page.locator('[data-testid="alert-item"]').first()).toBeVisible();
    }
  });

  test('should allow temporal filtering', async ({ page }) => {
    // Authentifier
    await page.fill('input[name="userCode"]', 'PDG001');
    await page.fill('input[name="accessCode"]', 'SECRET_MANAGER://pdg/access_code');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/pdg/dashboard');
    
    // Ouvrir les filtres temporels
    await page.click('[data-testid="temporal-filters-toggle"]');
    
    // Sélectionner une période
    await page.click('[data-testid="period-last-7-days"]');
    
    // Vérifier que les données sont filtrées
    await expect(page.locator('[data-testid="filtered-data"]')).toBeVisible();
  });

  test('should allow widget customization', async ({ page }) => {
    // Authentifier
    await page.fill('input[name="userCode"]', 'PDG001');
    await page.fill('input[name="accessCode"]', 'SECRET_MANAGER://pdg/access_code');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/pdg/dashboard');
    
    // Ouvrir le customizer de widgets
    await page.click('[data-testid="widget-customizer-toggle"]');
    
    // Désactiver un widget
    await page.click('[data-testid="toggle-widget-finance"]');
    
    // Vérifier que le widget est masqué
    await expect(page.locator('[data-testid="finance-overview"]')).not.toBeVisible();
    
    // Sauvegarder les préférences
    await page.click('[data-testid="save-widget-layout"]');
    
    // Vérifier la notification de sauvegarde
    await expect(page.locator('[data-testid="save-success-notification"]')).toBeVisible();
  });

  test('should require double confirmation for destructive actions', async ({ page }) => {
    // Authentifier
    await page.fill('input[name="userCode"]', 'PDG001');
    await page.fill('input[name="accessCode"]', 'SECRET_MANAGER://pdg/access_code');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/pdg/dashboard');
    
    // Naviguer vers la gestion des utilisateurs
    await page.click('[data-testid="users-management-tab"]');
    
    // Tenter de suspendre un utilisateur
    await page.click('[data-testid="suspend-user-button"]');
    
    // Vérifier que la modal de confirmation apparaît
    await expect(page.locator('[data-testid="confirmation-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-checkbox"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-input"]')).toBeVisible();
    
    // Remplir la confirmation
    await page.check('[data-testid="confirmation-checkbox"]');
    await page.fill('[data-testid="confirmation-input"]', 'DELETE');
    
    // Confirmer l'action
    await page.click('[data-testid="confirm-action-button"]');
    
    // Vérifier que l'action a été exécutée
    await expect(page.locator('[data-testid="action-success-notification"]')).toBeVisible();
  });

  test('should support dark mode toggle', async ({ page }) => {
    // Authentifier
    await page.fill('input[name="userCode"]', 'PDG001');
    await page.fill('input[name="accessCode"]', 'SECRET_MANAGER://pdg/access_code');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/pdg/dashboard');
    
    // Basculer vers le mode sombre
    await page.click('[data-testid="theme-toggle"]');
    
    // Vérifier que le mode sombre est activé
    await expect(page.locator('html')).toHaveClass(/dark/);
    
    // Basculer vers le mode clair
    await page.click('[data-testid="theme-toggle"]');
    
    // Vérifier que le mode clair est activé
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('should display audit logs for security actions', async ({ page }) => {
    // Authentifier
    await page.fill('input[name="userCode"]', 'PDG001');
    await page.fill('input[name="accessCode"]', 'SECRET_MANAGER://pdg/access_code');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/pdg/dashboard');
    
    // Naviguer vers les logs de sécurité
    await page.click('[data-testid="security-logs-tab"]');
    
    // Vérifier que les logs sont affichés
    await expect(page.locator('[data-testid="audit-logs"]')).toBeVisible();
    await expect(page.locator('[data-testid="log-entry"]')).toHaveCount.greaterThan(0);
  });
});
