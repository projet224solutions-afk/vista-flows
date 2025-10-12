import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DebtRow {
  id: string;
  customer_name: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
}

export default function DebtManagement() {
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');

  const addDebt = () => {
    const amt = parseFloat(amount);
    if (!customerName || !amt || amt <= 0) {
      toast.error('Nom client et montant valides requis');
      return;
    }

    const newDebt: DebtRow = {
      id: `debt-${Date.now()}`,
      customer_name: customerName,
      amount: amt,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    setDebts(prev => [newDebt, ...prev]);
    setCustomerName('');
    setAmount('');
    toast.success('Dette ajoutée (données locales)');
  };

  const markPaid = (id: string) => {
    setDebts(prev => prev.map(d => d.id === id ? { ...d, status: 'paid' as const } : d));
    toast.success('Dette marquée comme payée');
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Module en développement - Les données sont stockées localement et ne sont pas persistantes.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des Dettes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Client</Label>
              <Input 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                placeholder="Nom du client" 
              />
            </div>
            <div>
              <Label>Montant</Label>
              <Input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                placeholder="0" 
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={addDebt} 
                disabled={!customerName || !amount}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Dettes</CardTitle>
        </CardHeader>
        <CardContent>
          {debts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune dette enregistrée
            </p>
          ) : (
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
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        d.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {d.status === 'paid' ? 'Payé' : 'En attente'}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(d.created_at).toLocaleString('fr-FR')}</TableCell>
                    <TableCell className="text-right">
                      {d.status !== 'paid' && (
                        <Button size="sm" onClick={() => markPaid(d.id)}>
                          Marquer payé
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
