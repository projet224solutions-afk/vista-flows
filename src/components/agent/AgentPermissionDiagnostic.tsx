/**
 * Composant de Diagnostic des Permissions Agent
 * Affiche les permissions actuelles et aide au debug
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PermissionDiagnosticProps {
  agentId?: string;
}

export function AgentPermissionDiagnostic({ agentId }: PermissionDiagnosticProps) {
  const [loading, setLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    const result: any = {
      timestamp: new Date().toISOString(),
      checks: [],
      agent: null,
      user: null,
      canCreateUsers: false,
      canCreateAgents: false,
    };

    try {
      // 1. VÃ©rifier session utilisateur
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      result.checks.push({
        name: 'Session Utilisateur',
        status: !userError && user ? 'success' : 'error',
        message: user ? `ConnectÃ©: ${user.email}` : 'Non connectÃ©',
        details: userError ? userError.message : null
      });

      result.user = user;

      if (!user) {
        setDiagnosticResult(result);
        setLoading(false);
        return;
      }

      // 2. VÃ©rifier profil agent
      const { data: agentData, error: agentError } = await supabase
        .from('agents_management')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      result.checks.push({
        name: 'Profil Agent',
        status: !agentError && agentData ? 'success' : 'error',
        message: agentData ? `Agent trouvÃ©: ${agentData.name}` : 'Agent non trouvÃ©',
        details: agentError ? agentError.message : null
      });

      result.agent = agentData;

      if (!agentData) {
        // VÃ©rifier si c'est un PDG
        const { data: pdgData, error: pdgError } = await supabase
          .from('pdg_management')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        result.checks.push({
          name: 'Profil PDG',
          status: !pdgError && pdgData ? 'success' : 'warning',
          message: pdgData ? `PDG trouvÃ©: ${pdgData.name}` : 'PDG non trouvÃ©',
          details: pdgError ? pdgError.message : null
        });

        if (pdgData) {
          result.agent = {
            ...pdgData,
            isPdg: true,
            permissions: pdgData.permissions || ['all_modules', 'create_users', 'manage_users']
          };
        }
      }

      // 3. VÃ©rifier permissions
      const permissions = result.agent?.permissions || [];
      const hasCreateUsers = permissions.includes('create_users') || 
                            permissions.includes('all') ||
                            permissions.includes('all_modules');
      
      result.canCreateUsers = hasCreateUsers;

      result.checks.push({
        name: 'Permission create_users',
        status: hasCreateUsers ? 'success' : 'error',
        message: hasCreateUsers ? 'Permission accordÃ©e' : 'Permission manquante',
        details: `Permissions actuelles: ${permissions.join(', ') || 'Aucune'}`
      });

      // 4. VÃ©rifier can_create_sub_agent
      const canCreateSubAgent = result.agent?.can_create_sub_agent || result.agent?.isPdg;
      result.canCreateAgents = canCreateSubAgent;

      result.checks.push({
        name: 'CrÃ©er des agents',
        status: canCreateSubAgent ? 'success' : 'warning',
        message: canCreateSubAgent ? 'Peut crÃ©er des sous-agents' : 'Ne peut pas crÃ©er de sous-agents',
        details: result.agent?.isPdg ? 'PDG - toujours autorisÃ©' : null
      });

      // 5. VÃ©rifier agent actif
      const isActive = result.agent?.is_active !== false;
      result.checks.push({
        name: 'Statut Agent',
        status: isActive ? 'success' : 'error',
        message: isActive ? 'Agent actif' : 'Agent dÃ©sactivÃ©',
        details: null
      });

      // 6. Test appel Edge Function
      result.checks.push({
        name: 'Test Edge Function',
        status: 'success',
        message: 'Test Ã  effectuer manuellement',
        details: 'Essayez de crÃ©er un utilisateur pour tester'
      });

    } catch (error: any) {
      result.checks.push({
        name: 'Erreur Diagnostic',
        status: 'error',
        message: error.message,
        details: JSON.stringify(error)
      });
    }

    setDiagnosticResult(result);
    setLoading(false);
  };

  useEffect(() => {
    if (agentId) {
      runDiagnostic();
    }
  }, [agentId]);

  if (!diagnosticResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic des Permissions</CardTitle>
          <CardDescription>VÃ©rifiez vos permissions agent</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostic} disabled={loading}>
            {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Lancer le diagnostic
          </Button>
        </CardContent>
      </Card>
    );
  }

  const allSuccess = diagnosticResult.checks.every((c: any) => c.status === 'success');
  const hasErrors = diagnosticResult.checks.some((c: any) => c.status === 'error');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Diagnostic des Permissions</CardTitle>
            <CardDescription>
              DerniÃ¨re vÃ©rification: {new Date(diagnosticResult.timestamp).toLocaleTimeString()}
            </CardDescription>
          </div>
          <Button onClick={runDiagnostic} disabled={loading} size="sm">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* RÃ©sumÃ© */}
        <Alert variant={hasErrors ? 'destructive' : allSuccess ? 'default' : 'default'}>
          <AlertDescription>
            {allSuccess && 'âœ… Toutes les vÃ©rifications ont rÃ©ussi'}
            {hasErrors && 'âŒ Des erreurs ont Ã©tÃ© dÃ©tectÃ©es'}
            {!allSuccess && !hasErrors && 'âš ï¸ Certaines permissions sont manquantes'}
          </AlertDescription>
        </Alert>

        {/* Permissions principales */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {diagnosticResult.canCreateUsers ? (
                <CheckCircle2 className="h-5 w-5 text-primary-orange-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">CrÃ©er Utilisateurs</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {diagnosticResult.canCreateUsers ? 'AutorisÃ©' : 'Non autorisÃ©'}
            </p>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {diagnosticResult.canCreateAgents ? (
                <CheckCircle2 className="h-5 w-5 text-primary-orange-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              <span className="font-medium">CrÃ©er Agents</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {diagnosticResult.canCreateAgents ? 'AutorisÃ©' : 'Non autorisÃ©'}
            </p>
          </div>
        </div>

        {/* DÃ©tails des vÃ©rifications */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">VÃ©rifications dÃ©taillÃ©es</h4>
          {diagnosticResult.checks.map((check: any, index: number) => (
            <div key={index} className="flex items-start gap-3 p-2 bg-muted/30 rounded">
              {check.status === 'success' && <CheckCircle2 className="h-4 w-4 text-primary-orange-600 mt-0.5" />}
              {check.status === 'error' && <XCircle className="h-4 w-4 text-red-600 mt-0.5" />}
              {check.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />}
              <div className="flex-1">
                <p className="text-sm font-medium">{check.name}</p>
                <p className="text-xs text-muted-foreground">{check.message}</p>
                {check.details && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{check.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Informations agent */}
        {diagnosticResult.agent && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-sm mb-2">Informations Agent</h4>
            <div className="space-y-1 text-xs">
              <p><strong>ID:</strong> {diagnosticResult.agent.id}</p>
              <p><strong>Email:</strong> {diagnosticResult.agent.email}</p>
              <p><strong>Type:</strong> {diagnosticResult.agent.isPdg ? 'PDG' : 'Agent'}</p>
              <p><strong>Permissions:</strong></p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(diagnosticResult.agent.permissions || []).map((perm: string) => (
                  <Badge key={perm} variant="secondary" className="text-xs">
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Aide au debug */}
        {hasErrors && (
          <Alert>
            <AlertDescription>
              <strong>Solutions possibles:</strong>
              <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                <li>VÃ©rifiez que votre compte agent est actif</li>
                <li>Contactez le PDG pour obtenir les permissions nÃ©cessaires</li>
                <li>Assurez-vous d'Ãªtre connectÃ© avec le bon compte</li>
                <li>Essayez de vous dÃ©connecter puis reconnecter</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
