/**
 * 🏛️ DASHBOARD BUREAU SYNDICAL - Interface Complète
 * Gestion complète du bureau syndical avec données réelles Supabase
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users,
  CreditCard,
  TrendingUp,
  Shield,
  DollarSign,
  UserPlus,
  Calendar,
  Settings,
  Award,
  FileText,
  MessageSquare,
  LogOut,
  Activity
} from "lucide-react";
import SimpleCommunicationInterface from "@/components/communication/SimpleCommunicationInterface";

interface BureauData {
  id: string;
  bureau_code: string;
  prefecture: string;
  commune: string;
  president_name: string | null;
  president_phone: string | null;
  president_email: string | null;
  total_members: number;
  total_vehicles: number;
  total_cotisations: number;
  status: string;
  created_at: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  vehicle_type: string;
  vehicle_serial: string;
  status: string;
  cotisation_status: string;
  join_date: string;
  last_cotisation_date: string;
  total_cotisations: number;
  bureau_id: string;
  created_at: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  date: string;
  member_id: string | null;
}

interface WalletData {
  balance: number;
  currency: string;
  wallet_status: string;
}

export default function BureauDashboard() {
  const { user, profile, signOut } = useAuth();
  useRoleRedirect();

  const [loading, setLoading] = useState(true);
  const [bureauData, setBureauData] = useState<BureauData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Form states
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    license_number: '',
    vehicle_type: 'moto',
    vehicle_serial: ''
  });

  const [newTransaction, setNewTransaction] = useState({
    type: 'cotisation',
    amount: 0,
    description: '',
    member_id: ''
  });

  useEffect(() => {
    if (user) {
      loadBureauData();
      loadMembers();
      loadTransactions();
      loadWallet();
    }
  }, [user]);

  const loadBureauData = async () => {
    try {
      const { data, error } = await supabase
        .from('bureaus')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setBureauData(data);
    } catch (error) {
      console.error('Erreur chargement bureau:', error);
      toast.error('Erreur lors du chargement des données du bureau');
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Erreur chargement membres:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('bureau_transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Erreur chargement transactions:', error);
    }
  };

  const loadWallet = async () => {
    try {
      if (!bureauData?.id) return;

      const { data, error } = await supabase
        .from('bureau_wallets')
        .select('balance, currency, wallet_status')
        .eq('bureau_id', bureauData.id)
        .single();

      if (error) throw error;
      setWallet(data);
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.phone) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('members')
        .insert({
          ...newMember,
          bureau_id: bureauData?.id,
          status: 'active',
          cotisation_status: 'pending',
          join_date: new Date().toISOString(),
          total_cotisations: 0
        })
        .select()
        .single();

      if (error) throw error;

      setMembers([data, ...members]);
      setNewMember({
        name: '',
        email: '',
        phone: '',
        license_number: '',
        vehicle_type: 'moto',
        vehicle_serial: ''
      });
      toast.success('Membre ajouté avec succès');
    } catch (error) {
      console.error('Erreur ajout membre:', error);
      toast.error('Erreur lors de l\'ajout du membre');
    }
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.amount || newTransaction.amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bureau_transactions')
        .insert({
          ...newTransaction,
          bureau_id: bureauData?.id,
          date: new Date().toISOString(),
          status: 'completed'
        })
        .select()
        .single();

      if (error) throw error;

      setTransactions([data, ...transactions]);
      setNewTransaction({
        type: 'cotisation',
        amount: 0,
        description: '',
        member_id: ''
      });
      toast.success('Transaction enregistrée');
      loadWallet(); // Refresh wallet balance
    } catch (error) {
      console.error('Erreur ajout transaction:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const stats = [
    {
      label: 'Membres Actifs',
      value: members.filter(m => m.status === 'active').length,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      label: 'Véhicules',
      value: bureauData?.total_vehicles || members.filter(m => m.vehicle_serial).length,
      icon: Shield,
      color: 'text-green-600'
    },
    {
      label: 'Cotisations Mensuelles',
      value: `${transactions.filter(t => t.type === 'cotisation').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} GNF`,
      icon: DollarSign,
      color: 'text-purple-600'
    },
    {
      label: 'Solde Bureau',
      value: `${(wallet?.balance || 0).toLocaleString()} ${wallet?.currency || 'GNF'}`,
      icon: CreditCard,
      color: 'text-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p>Chargement des données du bureau...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Bureau Syndical</h1>
            <p className="text-white/80 text-lg">
              {bureauData?.prefecture} - {bureauData?.commune}
            </p>
            <p className="text-sm text-white/60">Code: {bureauData?.bureau_code}</p>
          </div>
          <Button variant="outline" onClick={signOut} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-6 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <Icon className={`w-10 h-10 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard">
              <Activity className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              Membres
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <DollarSign className="w-4 h-4 mr-2" />
              Finances
            </TabsTrigger>
            <TabsTrigger value="communication">
              <MessageSquare className="w-4 h-4 mr-2" />
              Communication
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Membres Récents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {members.slice(0, 5).map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.phone}</p>
                        </div>
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Transactions Récentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{transaction.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-bold text-green-600">
                          +{transaction.amount.toLocaleString()} GNF
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Ajouter un Membre
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom Complet *</Label>
                    <Input
                      value={newMember.name}
                      onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                      placeholder="Nom complet"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label>Téléphone *</Label>
                    <Input
                      value={newMember.phone}
                      onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                      placeholder="+224 XXX XXX XXX"
                    />
                  </div>
                  <div>
                    <Label>N° Permis</Label>
                    <Input
                      value={newMember.license_number}
                      onChange={(e) => setNewMember({...newMember, license_number: e.target.value})}
                      placeholder="A12345"
                    />
                  </div>
                  <div>
                    <Label>Type Véhicule</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={newMember.vehicle_type}
                      onChange={(e) => setNewMember({...newMember, vehicle_type: e.target.value})}
                    >
                      <option value="moto">Moto</option>
                      <option value="tricycle">Tricycle</option>
                      <option value="voiture">Voiture</option>
                    </select>
                  </div>
                  <div>
                    <Label>Série Véhicule</Label>
                    <Input
                      value={newMember.vehicle_serial}
                      onChange={(e) => setNewMember({...newMember, vehicle_serial: e.target.value})}
                      placeholder="CN-1234-AB"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={handleAddMember} className="w-full">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Ajouter le Membre
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Liste des Membres ({members.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.phone}</p>
                        {member.license_number && (
                          <p className="text-xs text-muted-foreground">Permis: {member.license_number}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {member.vehicle_serial && (
                          <Badge variant="outline">{member.vehicle_serial}</Badge>
                        )}
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Nouvelle Transaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={newTransaction.type}
                      onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                    >
                      <option value="cotisation">Cotisation</option>
                      <option value="amende">Amende</option>
                      <option value="inscription">Inscription</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <Label>Montant (GNF) *</Label>
                    <Input
                      type="number"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value)})}
                      placeholder="0"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                      placeholder="Description de la transaction"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={handleAddTransaction} className="w-full">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Enregistrer la Transaction
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historique des Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium capitalize">{transaction.type}</p>
                        <p className="text-sm text-muted-foreground">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-600">
                          +{transaction.amount.toLocaleString()} GNF
                        </p>
                        <Badge variant="outline" className="mt-1">{transaction.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication">
            <SimpleCommunicationInterface />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
