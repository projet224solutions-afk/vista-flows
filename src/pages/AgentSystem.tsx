import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePDGManagement, useAgentManagement, useAgentCreatedUsers, useCommissionManagement } from '@/hooks/useAgentSystem';
import { toast } from 'sonner';

export default function AgentSystem() {
  // Placeholder: PDG context would normally come from auth/profile
  const [pdgId, setPdgId] = useState<string>('demo-pdg-id');

  const { pdgData, createPDG } = usePDGManagement();
  const { agents, createAgent } = useAgentManagement(pdgId);
  const { users, createUser } = useAgentCreatedUsers(agents[0]?.id);
  const { processTransaction } = useCommissionManagement();

  const [agentForm, setAgentForm] = useState({ name: '', email: '', phone: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '' });
  const [txForm, setTxForm] = useState({ userId: '', amount: 0 });

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold">🤝 Système de Gestion d'Agents</h1>
        <p className="text-muted-foreground">Version React + Supabase</p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-6">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🎯 Aperçu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded bg-blue-50">
                  <div className="text-2xl">👑</div>
                  <div className="font-bold">PDG</div>
                  <div className="text-sm text-blue-700">Contrôle et commissions</div>
                </div>
                <div className="p-4 rounded bg-green-50">
                  <div className="text-2xl">🤝</div>
                  <div className="font-bold">Agents</div>
                  <div className="text-sm text-green-700">Création d'utilisateurs</div>
                </div>
                <div className="p-4 rounded bg-purple-50">
                  <div className="text-2xl">👥</div>
                  <div className="font-bold">Sous-Agents</div>
                  <div className="text-sm text-purple-700">Création limitée</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Créer un Agent</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Nom</Label>
                <Input value={agentForm.name} onChange={e => setAgentForm({ ...agentForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={agentForm.email} onChange={e => setAgentForm({ ...agentForm, email: e.target.value })} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={agentForm.phone} onChange={e => setAgentForm({ ...agentForm, phone: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <Button onClick={async () => {
                  try {
                    await createAgent({ ...agentForm, can_create_sub_agent: true });
                    toast.success('Agent créé');
                  } catch (e) { toast.error('Erreur création agent'); }
                }}>Créer</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agents existants ({agents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {agents.map(a => (
                  <li key={a.id} className="p-3 rounded border flex items-center justify-between">
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-sm text-muted-foreground">{a.email} • {a.phone}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{a.agent_code}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Créer un Utilisateur (par l'agent sélectionné)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Nom</Label>
                <Input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <Button onClick={async () => {
                  try {
                    if (!agents[0]) { toast.error('Aucun agent'); return; }
                    await createUser({ creator_type: 'agent', name: userForm.name, email: userForm.email });
                    toast.success('Utilisateur créé');
                  } catch { toast.error('Erreur création utilisateur'); }
                }}>Créer</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs créés ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {users.map(u => (
                  <li key={u.id} className="p-3 rounded border">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-sm text-muted-foreground">{u.email}</div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enregistrer une Transaction</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>User ID</Label>
                <Input value={txForm.userId} onChange={e => setTxForm({ ...txForm, userId: e.target.value })} />
              </div>
              <div>
                <Label>Montant</Label>
                <Input type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: Number(e.target.value) })} />
              </div>
              <div className="md:col-span-3">
                <Button onClick={async () => {
                  try {
                    await processTransaction({ userId: txForm.userId, transactionAmount: txForm.amount, netRevenue: txForm.amount, transactionType: 'sale' });
                    toast.success('Transaction enregistrée');
                  } catch { toast.error('Erreur transaction'); }
                }}>Enregistrer</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>💰 Commissions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Calcul et affichage automatiques après transactions.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>PDG ID (démo)</Label>
                <Input value={pdgId} onChange={e => setPdgId(e.target.value)} />
              </div>
              <div>
                <Label>Créer PDG (si manquant)</Label>
                <Button className="mt-2" onClick={async () => {
                  try {
                    await createPDG({ name: 'PDG Démo', email: 'pdg@example.com' });
                    toast.success('PDG créé');
                  } catch { toast.error('Erreur création PDG'); }
                }}>Créer PDG</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


