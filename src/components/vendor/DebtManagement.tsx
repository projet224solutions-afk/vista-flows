import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DebtRow {
  id: string;
  vendor_id: string;
  customer_name: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
}

export default function DebtManagement() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadDebts();
  }, [user]);

  const loadDebts = async () => {
    try {
      setLoading(true);
      const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user?.id).single();
      if (!vendor) return;
      const { data } = await supabase.from('debts').select('*').eq('vendor_id', vendor.id).order('created_at', { ascending: false });
      setDebts(data || []);
    } finally {
      setLoading(false);
    }
  };

  const addDebt = async () => {
    const amt = parseFloat(amount);
    if (!customerName || !amt || amt <= 0) {
      toast.error('Nom client et montant valides requis');
      return;
    }
    try {
      setLoading(true);
      const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user?.id).single();
      if (!vendor) throw new Error('Vendeur introuvable');
      const { error } = await supabase.from('debts').insert({
        vendor_id: vendor.id,
        customer_name: customerName,
        amount: amt,
        status: 'pending'
      });
      if (error) throw error;
      setCustomerName('');
      setAmount('');
      toast.success('Dette ajoutée');
      await loadDebts();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur ajout dette');
    } finally {
      setLoading(false);
    }
  };

  const markPaid = async (id: string) => {
    try {
      const { error } = await supabase.from('debts').update({ status: 'paid' }).eq('id', id);
      if (error) throw error;
      toast.success('Dette réglée');
      await loadDebts();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Dettes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Client</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nom du client" />
            </div>
            <div>
              <Label>Montant</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="flex items-end">
              <Button onClick={addDebt} disabled={loading || !customerName || !amount}>Ajouter</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Dettes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.customer_name}</TableCell>
                  <TableCell>{d.amount.toLocaleString()} GNF</TableCell>
                  <TableCell>{d.status}</TableCell>
                  <TableCell>{new Date(d.created_at).toLocaleString('fr-FR')}</TableCell>
                  <TableCell className="text-right">
                    {d.status !== 'paid' && (
                      <Button size="sm" onClick={() => markPaid(d.id)}>Marquer payé</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


