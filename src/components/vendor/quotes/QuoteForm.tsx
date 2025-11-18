/**
 * FORMULAIRE CRÉATION DEVIS - INTERFACE VENDEUR
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVendorId } from '@/hooks/useVendorId';

interface QuoteItem {
  name: string;
  qty: number;
  price: number;
}

export default function QuoteForm({ onSuccess }: { onSuccess?: () => void }) {
  const { vendorId } = useVendorId();
  const [loading, setLoading] = useState(false);
  
  // Client info
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  
  // Items
  const [items, setItems] = useState<QuoteItem[]>([
    { name: '', qty: 1, price: 0 }
  ]);
  
  // Montants
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState('');

  const addItem = () => {
    setItems([...items, { name: '', qty: 1, price: 0 }]);
  };

  const updateItem = (idx: number, field: keyof QuoteItem, value: string | number) => {
    const copy = [...items];
    copy[idx][field] = value as never;
    setItems(copy);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const total = subtotal - Number(discount) + Number(tax);

  const handleGenerate = async () => {
    if (!vendorId) {
      toast.error('Erreur: Vendeur non identifié');
      return;
    }

    if (!clientName || items.some(i => !i.name || !i.qty || !i.price)) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      setLoading(true);
      
      // Générer référence unique
      const ref = `DEV-${Date.now().toString().slice(-8)}`;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7); // Valide 7 jours

      // Créer le devis en base
      const { data: quote, error } = await supabase
        .from('quotes')
        .insert({
          ref,
          vendor_id: vendorId,
          client_name: clientName,
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
          client_address: clientAddress || null,
          items: items as any,
          subtotal,
          tax,
          discount,
          total,
          status: 'pending',
          valid_until: validUntil.toISOString().split('T')[0],
          notes
        })
        .select()
        .single();

      if (error) throw error;

      // Appeler l'edge function pour générer le PDF
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-quote-pdf', {
        body: {
          quote_id: quote.id,
          ref: quote.ref,
          vendor_id: vendorId,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          client_address: clientAddress,
          items,
          subtotal,
          discount,
          tax,
          total,
          valid_until: validUntil.toLocaleDateString('fr-FR'),
          notes
        }
      });

      if (pdfError) {
        console.error('Erreur génération PDF:', pdfError);
        toast.error('Devis créé mais erreur génération PDF');
      } else {
        toast.success('Devis créé avec succès!');
      }

      // Reset form
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setClientAddress('');
      setItems([{ name: '', qty: 1, price: 0 }]);
      setDiscount(0);
      setTax(0);
      setNotes('');
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la création du devis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Créer un Devis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Infos Client */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nom Client *</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nom complet du client"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientEmail">Email</Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientPhone">Téléphone</Label>
            <Input
              id="clientPhone"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+224..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientAddress">Adresse</Label>
            <Input
              id="clientAddress"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="Adresse complète"
            />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Articles / Services</Label>
            <Button onClick={addItem} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une ligne
            </Button>
          </div>
          
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5 space-y-2">
                <Label className="text-xs">Produit/Service</Label>
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(idx, 'name', e.target.value)}
                  placeholder="Nom du produit"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs">Qté</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                />
              </div>
              <div className="col-span-3 space-y-2">
                <Label className="text-xs">Prix unitaire (GNF)</Label>
                <Input
                  type="number"
                  min="0"
                  value={item.price}
                  onChange={(e) => updateItem(idx, 'price', Number(e.target.value))}
                />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="font-semibold">
                  {((item.qty || 0) * (item.price || 0)).toLocaleString()} GNF
                </span>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(idx)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totaux */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span>Sous-total:</span>
            <span className="font-semibold">{subtotal.toLocaleString()} GNF</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Remise (GNF)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax">Taxe (GNF)</Label>
              <Input
                id="tax"
                type="number"
                min="0"
                value={tax}
                onChange={(e) => setTax(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>TOTAL:</span>
            <span className="text-primary">{total.toLocaleString()} GNF</span>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes / Conditions (optionnel)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Conditions de paiement, garanties, etc."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            {loading ? 'Génération...' : 'Générer le Devis (PDF)'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}