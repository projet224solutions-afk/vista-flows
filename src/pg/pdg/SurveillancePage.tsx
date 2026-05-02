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

  // Vérifier que l'utilisateur est PDG
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
              Accès Refusé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300">
              Seuls les utilisateurs avec le rôle PDG peuvent accéder à la surveillance logique.
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
          <h1 className="text-4xl font-bold text-white mb-2">🔍 Surveillance Logique Globale</h1>
          <p className="text-slate-400">
            Système de monitoring en temps réel de toutes les fonctionnalités Vista-Flows
          </p>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto mb-6 bg-slate-800 border border-slate-700">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600">
              📈 Dashboard
            </TabsTrigger>
            <TabsTrigger value="documentation" className="data-[state=active]:bg-blue-600">
              📚 Documentation
            </TabsTrigger>
            <TabsTrigger value="integration" className="data-[state=active]:bg-blue-600">
              🔌 Intégration
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-blue-600">
              💬 Support
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
                <CardTitle className="text-blue-400">📚 Guide d'Utilisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-300">
                <div>
                  <h3 className="font-semibold text-white mb-2">Qu'est-ce que le système de surveillance?</h3>
                  <p>
                    Le système de surveillance logique est un outil de monitoring avancé qui détecte et corrige automatiquement
                    les anomalies logiques dans 100% des fonctionnalités de Vista-Flows.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">120 Règles Métier Surveillées</h3>
                  <p>
                    Réparties sur 8 domaines:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li><strong>POS_SALES</strong> - Ventes et points de vente (8 règles)</li>
                    <li><strong>INVENTORY</strong> - Gestion des stocks (4 règles)</li>
                    <li><strong>PAYMENTS</strong> - Paiements et transactions (5 règles)</li>
                    <li><strong>ORDERS</strong> - Commandes et confirmations (4 règles)</li>
                    <li><strong>DELIVERIES</strong> - Livraisons et tracking (4 règles)</li>
                    <li><strong>COMMISSIONS</strong> - Calculs de commissions (3 règles)</li>
                    <li><strong>SECURITY</strong> - Sécurité et permissions (3 règles)</li>
                    <li><strong>WALLETS</strong> - Portefeuilles et soldes (3 règles)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">Sévérités des Anomalies</h3>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-red-900/30 border border-red-500 rounded">
                      <span className="font-semibold text-red-400">🔴 CRITICAL</span>
                      <p className="text-sm mt-1">Impact immédiat sur les données</p>
                    </div>
                    <div className="p-3 bg-orange-900/30 border border-orange-500 rounded">
                      <span className="font-semibold text-orange-400">🟠 HIGH</span>
                      <p className="text-sm mt-1">Impact important à court terme</p>
                    </div>
                    <div className="p-3 bg-yellow-900/30 border border-yellow-500 rounded">
                      <span className="font-semibold text-yellow-400">🟡 MEDIUM</span>
                      <p className="text-sm mt-1">Impact modéré, notification</p>
                    </div>
                    <div className="p-3 bg-green-900/30 border border-green-500 rounded">
                      <span className="font-semibold text-green-400">🟢 LOW</span>
                      <p className="text-sm mt-1">Impact minimal, information</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">Actions Disponibles</h3>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <span className="text-blue-400">🔍</span>
                      <span><strong>Détecter</strong> - Lancer une détection complète des anomalies</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-400">✓</span>
                      <span><strong>Correction Auto</strong> - Appliquer automatiquement la correction</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-purple-400">🔧</span>
                      <span><strong>Correction Manuelle</strong> - Approuver et corriger manuellement</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-yellow-400">📈</span>
                      <span><strong>Exporter</strong> - Télécharger l'analyse en JSON</span>
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
                <CardTitle className="text-blue-400">🔌 Détails de l'Intégration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-300">
                <div>
                  <h3 className="font-semibold text-white mb-2">Architecture</h3>
                  <p className="mb-3">Le système utilise une architecture 4-couches:</p>
                  <div className="bg-slate-900 p-4 rounded border border-slate-700 text-sm space-y-2 font-mono">
                    <div><span className="text-blue-400">Layer 1:</span> PostgreSQL + RLS</div>
                    <div><span className="text-green-400">Layer 2:</span> RPC Functions (SECURITY DEFINER)</div>
                    <div><span className="text-purple-400">Layer 3:</span> Edge Functions + Cron</div>
                    <div><span className="text-yellow-400">Layer 4:</span> React + Real-time Subscriptions</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">Détection Automatique</h3>
                  <p className="mb-3">
                    La détection des anomalies s'exécute automatiquement toutes les <strong>5 minutes</strong> via un Cron Job Supabase.
                  </p>
                  <div className="bg-slate-900 p-4 rounded border border-slate-700 text-sm">
                    <p><strong>Prochaine exécution:</strong> Dans ~5 minutes</p>
                    <p><strong>Nombre de règles exécutées:</strong> 120</p>
                    <p><strong>Temps d'exécution cible:</strong> &lt; 500ms</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">Permissions</h3>
                  <p className="mb-3">Seuls les utilisateurs avec le rôle <strong>PDG</strong> peuvent:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Voir les anomalies détectées</li>
                    <li>Approuver les corrections</li>
                    <li>Accéder aux audit trails</li>
                    <li>Exporter les analyses</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">Audit Trail</h3>
                  <p>
                    Tous les événements (détection, correction, approbation) sont enregistrés de façon <strong>immuable</strong> dans
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
                <CardTitle className="text-blue-400">💬 Support et FAQ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-slate-300">
                <div>
                  <h3 className="font-semibold text-white mb-2 text-lg">❔ Questions Fréquentes</h3>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Qu'est-ce qu'une anomalie?</h4>
                    <p>
                      Une anomalie est une violation d'une règle métier. Par exemple, si une vente est complétée mais le stock
                      n'a pas diminué, c'est une anomalie (règle POS_001).
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Qu'est-ce qu'une correction automatique?</h4>
                    <p>
                      Certaines anomalies peuvent être corrigées automatiquement sans intervention manuelle. Par exemple,
                      corriger un stock négatif à zéro. Les autres anomalies nécessitent l'approbation du PDG.
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Comment exporter les données?</h4>
                    <p>
                      Cliquez sur le bouton "Exporter analyse" pour télécharger un fichier JSON contenant toutes les anomalies
                      détectées, les corrections appliquées et l'audit trail.
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Quelle est la fréquence des détections?</h4>
                    <p>
                      La détection automatique s'exécute toutes les 5 minutes. Vous pouvez aussi déclencher une détection
                      manuelle à tout moment en cliquant sur "Détecter anomalies".
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Les données sont-elles sécurisées?</h4>
                    <p>
                      Oui. Le système utilise:
                    </p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>RLS (Row-Level Security) pour le contrôle d'accès</li>
                      <li>SECURITY DEFINER pour les RPC functions</li>
                      <li>Audit trail immuable pour la traçabilité</li>
                      <li>Accès PDG-only via les policies</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-700">
                  <h3 className="font-semibold text-white mb-3">☎️ Contacter le Support</h3>
                  <p className="mb-3">En cas de problème:</p>
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
