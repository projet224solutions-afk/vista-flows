import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import SurveillanceLogiqueDashboard from '@/components/pdg/SurveillanceLogiqueDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';

export default function SurveillancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // VÃ©rifier que l'utilisateur est PDG
  useEffect(() => {
    if (user && user.role !== 'pdg') {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'pdg') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Card className="w-full max-w-md bg-red-900/20 border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              AccÃ¨s RefusÃ©
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300">
              Seuls les utilisateurs avec le rÃ´le PDG peuvent accÃ©der Ã  la surveillance logique.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">ðŸ” Surveillance Logique Globale</h1>
          <p className="text-slate-400">
            SystÃ¨me de monitoring en temps rÃ©el de toutes les fonctionnalitÃ©s Vista-Flows
          </p>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto mb-6 bg-slate-800 border border-slate-700">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600">
              ðŸ“Š Dashboard
            </TabsTrigger>
            <TabsTrigger value="documentation" className="data-[state=active]:bg-blue-600">
              ðŸ“š Documentation
            </TabsTrigger>
            <TabsTrigger value="integration" className="data-[state=active]:bg-blue-600">
              ðŸ”Œ IntÃ©gration
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-blue-600">
              ðŸ’¬ Support
            </TabsTrigger>
          </TabsList>

          {/* Tab: Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <SurveillanceLogiqueDashboard />
          </TabsContent>

          {/* Tab: Documentation */}
          <TabsContent value="documentation" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-blue-400">ðŸ“š Guide d'Utilisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-300">
                <div>
                  <h3 className="font-semibold text-white mb-2">Qu'est-ce que le systÃ¨me de surveillance?</h3>
                  <p>
                    Le systÃ¨me de surveillance logique est un outil de monitoring avancÃ© qui dÃ©tecte et corrige automatiquement
                    les anomalies logiques dans 100% des fonctionnalitÃ©s de Vista-Flows.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">120 RÃ¨gles MÃ©tier SurveillÃ©es</h3>
                  <p>
                    RÃ©parties sur 8 domaines:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li><strong>POS_SALES</strong> - Ventes et points de vente (8 rÃ¨gles)</li>
                    <li><strong>INVENTORY</strong> - Gestion des stocks (4 rÃ¨gles)</li>
                    <li><strong>PAYMENTS</strong> - Paiements et transactions (5 rÃ¨gles)</li>
                    <li><strong>ORDERS</strong> - Commandes et confirmations (4 rÃ¨gles)</li>
                    <li><strong>DELIVERIES</strong> - Livraisons et tracking (4 rÃ¨gles)</li>
                    <li><strong>COMMISSIONS</strong> - Calculs de commissions (3 rÃ¨gles)</li>
                    <li><strong>SECURITY</strong> - SÃ©curitÃ© et permissions (3 rÃ¨gles)</li>
                    <li><strong>WALLETS</strong> - Portefeuilles et soldes (3 rÃ¨gles)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">SÃ©vÃ©ritÃ©s des Anomalies</h3>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-red-900/30 border border-red-500 rounded">
                      <span className="font-semibold text-red-400">ðŸ”´ CRITICAL</span>
                      <p className="text-sm mt-1">Impact immÃ©diat sur les donnÃ©es</p>
                    </div>
                    <div className="p-3 bg-orange-900/30 border border-orange-500 rounded">
                      <span className="font-semibold text-orange-400">ðŸŸ  HIGH</span>
                      <p className="text-sm mt-1">Impact important Ã  court terme</p>
                    </div>
                    <div className="p-3 bg-yellow-900/30 border border-yellow-500 rounded">
                      <span className="font-semibold text-yellow-400">ðŸŸ¡ MEDIUM</span>
                      <p className="text-sm mt-1">Impact modÃ©rÃ©, notification</p>
                    </div>
                    <div className="p-3 bg-primary-orange-900/30 border border-primary-orange-500 rounded">
                      <span className="font-semibold text-primary-orange-400">ðŸŸ¢ LOW</span>
                      <p className="text-sm mt-1">Impact minimal, information</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">Actions Disponibles</h3>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <span className="text-blue-400">ðŸ”</span>
                      <span><strong>DÃ©tecter</strong> - Lancer une dÃ©tection complÃ¨te des anomalies</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary-orange-400">âœ…</span>
                      <span><strong>Correction Auto</strong> - Appliquer automatiquement la correction</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-purple-400">ðŸ”§</span>
                      <span><strong>Correction Manuelle</strong> - Approuver et corriger manuellement</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-yellow-400">ðŸ“Š</span>
                      <span><strong>Exporter</strong> - TÃ©lÃ©charger l'analyse en JSON</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Integration */}
          <TabsContent value="integration" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-blue-400">ðŸ”Œ DÃ©tails de l'IntÃ©gration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-300">
                <div>
                  <h3 className="font-semibold text-white mb-2">Architecture</h3>
                  <p className="mb-3">Le systÃ¨me utilise une architecture 4-couches:</p>
                  <div className="bg-slate-900 p-4 rounded border border-slate-700 text-sm space-y-2 font-mono">
                    <div><span className="text-blue-400">Layer 1:</span> PostgreSQL + RLS</div>
                    <div><span className="text-primary-orange-400">Layer 2:</span> RPC Functions (SECURITY DEFINER)</div>
                    <div><span className="text-purple-400">Layer 3:</span> Edge Functions + Cron</div>
                    <div><span className="text-yellow-400">Layer 4:</span> React + Real-time Subscriptions</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">DÃ©tection Automatique</h3>
                  <p className="mb-3">
                    La dÃ©tection des anomalies s'exÃ©cute automatiquement toutes les <strong>5 minutes</strong> via un Cron Job Supabase.
                  </p>
                  <div className="bg-slate-900 p-4 rounded border border-slate-700 text-sm">
                    <p><strong>Prochaine exÃ©cution:</strong> Dans ~5 minutes</p>
                    <p><strong>Nombre de rÃ¨gles exÃ©cutÃ©es:</strong> 120</p>
                    <p><strong>Temps d'exÃ©cution cible:</strong> &lt; 500ms</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">Permissions</h3>
                  <p className="mb-3">Seuls les utilisateurs avec le rÃ´le <strong>PDG</strong> peuvent:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Voir les anomalies dÃ©tectÃ©es</li>
                    <li>Approuver les corrections</li>
                    <li>AccÃ©der aux audit trails</li>
                    <li>Exporter les analyses</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">Audit Trail</h3>
                  <p>
                    Tous les Ã©vÃ©nements (dÃ©tection, correction, approbation) sont enregistrÃ©s de faÃ§on <strong>immuable</strong> dans
                    la table <code className="bg-slate-900 px-2 py-1 rounded">logic_audit</code>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Support */}
          <TabsContent value="support" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-blue-400">ðŸ’¬ Support et FAQ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-slate-300">
                <div>
                  <h3 className="font-semibold text-white mb-2 text-lg">â“ Questions FrÃ©quentes</h3>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Qu'est-ce qu'une anomalie?</h4>
                    <p>
                      Une anomalie est une violation d'une rÃ¨gle mÃ©tier. Par exemple, si une vente est complÃ©tÃ©e mais le stock
                      n'a pas diminuÃ©, c'est une anomalie (rÃ¨gle POS_001).
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Qu'est-ce qu'une correction automatique?</h4>
                    <p>
                      Certaines anomalies peuvent Ãªtre corrigÃ©es automatiquement sans intervention manuelle. Par exemple,
                      corriger un stock nÃ©gatif Ã  zÃ©ro. Les autres anomalies nÃ©cessitent l'approbation du PDG.
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Comment exporter les donnÃ©es?</h4>
                    <p>
                      Cliquez sur le bouton "Exporter analyse" pour tÃ©lÃ©charger un fichier JSON contenant toutes les anomalies
                      dÃ©tectÃ©es, les corrections appliquÃ©es et l'audit trail.
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Quelle est la frÃ©quence des dÃ©tections?</h4>
                    <p>
                      La dÃ©tection automatique s'exÃ©cute toutes les 5 minutes. Vous pouvez aussi dÃ©clencher une dÃ©tection
                      manuelle Ã  tout moment en cliquant sur "DÃ©tecter anomalies".
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Les donnÃ©es sont-elles sÃ©curisÃ©es?</h4>
                    <p>
                      Oui. Le systÃ¨me utilise:
                    </p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>RLS (Row-Level Security) pour le contrÃ´le d'accÃ¨s</li>
                      <li>SECURITY DEFINER pour les RPC functions</li>
                      <li>Audit trail immuable pour la traÃ§abilitÃ©</li>
                      <li>AccÃ¨s PDG-only via les policies</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-700">
                  <h3 className="font-semibold text-white mb-3">ðŸ“ž Contacter le Support</h3>
                  <p className="mb-3">En cas de problÃ¨me:</p>
                  <ul className="space-y-2">
                    <li><strong>Email:</strong> support@vista-flows.com</li>
                    <li><strong>Documentation:</strong> docs.vista-flows.com/surveillance</li>
                    <li><strong>GitHub Issues:</strong> github.com/vista-flows/issues</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
