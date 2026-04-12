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

  // V├®rifier que l'utilisateur est PDG
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
              Acc├¿s Refus├®
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300">
              Seuls les utilisateurs avec le r├┤le PDG peuvent acc├®der ├á la surveillance logique.
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
          <h1 className="text-4xl font-bold text-white mb-2">­ƒöì Surveillance Logique Globale</h1>
          <p className="text-slate-400">
            Syst├¿me de monitoring en temps r├®el de toutes les fonctionnalit├®s Vista-Flows
          </p>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto mb-6 bg-slate-800 border border-slate-700">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600">
              ­ƒôè Dashboard
            </TabsTrigger>
            <TabsTrigger value="documentation" className="data-[state=active]:bg-blue-600">
              ­ƒôÜ Documentation
            </TabsTrigger>
            <TabsTrigger value="integration" className="data-[state=active]:bg-blue-600">
              ­ƒöî Int├®gration
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-blue-600">
              ­ƒÆ¼ Support
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
                <CardTitle className="text-blue-400">­ƒôÜ Guide d'Utilisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-300">
                <div>
                  <h3 className="font-semibold text-white mb-2">Qu'est-ce que le syst├¿me de surveillance?</h3>
                  <p>
                    Le syst├¿me de surveillance logique est un outil de monitoring avanc├® qui d├®tecte et corrige automatiquement
                    les anomalies logiques dans 100% des fonctionnalit├®s de Vista-Flows.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">120 R├¿gles M├®tier Surveill├®es</h3>
                  <p>
                    R├®parties sur 8 domaines:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li><strong>POS_SALES</strong> - Ventes et points de vente (8 r├¿gles)</li>
                    <li><strong>INVENTORY</strong> - Gestion des stocks (4 r├¿gles)</li>
                    <li><strong>PAYMENTS</strong> - Paiements et transactions (5 r├¿gles)</li>
                    <li><strong>ORDERS</strong> - Commandes et confirmations (4 r├¿gles)</li>
                    <li><strong>DELIVERIES</strong> - Livraisons et tracking (4 r├¿gles)</li>
                    <li><strong>COMMISSIONS</strong> - Calculs de commissions (3 r├¿gles)</li>
                    <li><strong>SECURITY</strong> - S├®curit├® et permissions (3 r├¿gles)</li>
                    <li><strong>WALLETS</strong> - Portefeuilles et soldes (3 r├¿gles)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">S├®v├®rit├®s des Anomalies</h3>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-red-900/30 border border-red-500 rounded">
                      <span className="font-semibold text-red-400">­ƒö┤ CRITICAL</span>
                      <p className="text-sm mt-1">Impact imm├®diat sur les donn├®es</p>
                    </div>
                    <div className="p-3 bg-orange-900/30 border border-orange-500 rounded">
                      <span className="font-semibold text-orange-400">­ƒƒá HIGH</span>
                      <p className="text-sm mt-1">Impact important ├á court terme</p>
                    </div>
                    <div className="p-3 bg-yellow-900/30 border border-yellow-500 rounded">
                      <span className="font-semibold text-yellow-400">­ƒƒí MEDIUM</span>
                      <p className="text-sm mt-1">Impact mod├®r├®, notification</p>
                    </div>
                    <div className="p-3 bg-green-900/30 border border-green-500 rounded">
                      <span className="font-semibold text-green-400">­ƒƒó LOW</span>
                      <p className="text-sm mt-1">Impact minimal, information</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">Actions Disponibles</h3>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <span className="text-blue-400">­ƒöì</span>
                      <span><strong>D├®tecter</strong> - Lancer une d├®tection compl├¿te des anomalies</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-400">Ô£à</span>
                      <span><strong>Correction Auto</strong> - Appliquer automatiquement la correction</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-purple-400">­ƒöº</span>
                      <span><strong>Correction Manuelle</strong> - Approuver et corriger manuellement</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-yellow-400">­ƒôè</span>
                      <span><strong>Exporter</strong> - T├®l├®charger l'analyse en JSON</span>
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
                <CardTitle className="text-blue-400">­ƒöî D├®tails de l'Int├®gration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-300">
                <div>
                  <h3 className="font-semibold text-white mb-2">Architecture</h3>
                  <p className="mb-3">Le syst├¿me utilise une architecture 4-couches:</p>
                  <div className="bg-slate-900 p-4 rounded border border-slate-700 text-sm space-y-2 font-mono">
                    <div><span className="text-blue-400">Layer 1:</span> PostgreSQL + RLS</div>
                    <div><span className="text-green-400">Layer 2:</span> RPC Functions (SECURITY DEFINER)</div>
                    <div><span className="text-purple-400">Layer 3:</span> Edge Functions + Cron</div>
                    <div><span className="text-yellow-400">Layer 4:</span> React + Real-time Subscriptions</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">D├®tection Automatique</h3>
                  <p className="mb-3">
                    La d├®tection des anomalies s'ex├®cute automatiquement toutes les <strong>5 minutes</strong> via un Cron Job Supabase.
                  </p>
                  <div className="bg-slate-900 p-4 rounded border border-slate-700 text-sm">
                    <p><strong>Prochaine ex├®cution:</strong> Dans ~5 minutes</p>
                    <p><strong>Nombre de r├¿gles ex├®cut├®es:</strong> 120</p>
                    <p><strong>Temps d'ex├®cution cible:</strong> &lt; 500ms</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">Permissions</h3>
                  <p className="mb-3">Seuls les utilisateurs avec le r├┤le <strong>PDG</strong> peuvent:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Voir les anomalies d├®tect├®es</li>
                    <li>Approuver les corrections</li>
                    <li>Acc├®der aux audit trails</li>
                    <li>Exporter les analyses</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">Audit Trail</h3>
                  <p>
                    Tous les ├®v├®nements (d├®tection, correction, approbation) sont enregistr├®s de fa├ºon <strong>immuable</strong> dans
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
                <CardTitle className="text-blue-400">­ƒÆ¼ Support et FAQ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-slate-300">
                <div>
                  <h3 className="font-semibold text-white mb-2 text-lg">ÔØô Questions Fr├®quentes</h3>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Qu'est-ce qu'une anomalie?</h4>
                    <p>
                      Une anomalie est une violation d'une r├¿gle m├®tier. Par exemple, si une vente est compl├®t├®e mais le stock
                      n'a pas diminu├®, c'est une anomalie (r├¿gle POS_001).
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Qu'est-ce qu'une correction automatique?</h4>
                    <p>
                      Certaines anomalies peuvent ├¬tre corrig├®es automatiquement sans intervention manuelle. Par exemple,
                      corriger un stock n├®gatif ├á z├®ro. Les autres anomalies n├®cessitent l'approbation du PDG.
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Comment exporter les donn├®es?</h4>
                    <p>
                      Cliquez sur le bouton "Exporter analyse" pour t├®l├®charger un fichier JSON contenant toutes les anomalies
                      d├®tect├®es, les corrections appliqu├®es et l'audit trail.
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Quelle est la fr├®quence des d├®tections?</h4>
                    <p>
                      La d├®tection automatique s'ex├®cute toutes les 5 minutes. Vous pouvez aussi d├®clencher une d├®tection
                      manuelle ├á tout moment en cliquant sur "D├®tecter anomalies".
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-4">
                    <h4 className="font-semibold text-white mb-2">Q: Les donn├®es sont-elles s├®curis├®es?</h4>
                    <p>
                      Oui. Le syst├¿me utilise:
                    </p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>RLS (Row-Level Security) pour le contr├┤le d'acc├¿s</li>
                      <li>SECURITY DEFINER pour les RPC functions</li>
                      <li>Audit trail immuable pour la tra├ºabilit├®</li>
                      <li>Acc├¿s PDG-only via les policies</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-700">
                  <h3 className="font-semibold text-white mb-3">­ƒô× Contacter le Support</h3>
                  <p className="mb-3">En cas de probl├¿me:</p>
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
