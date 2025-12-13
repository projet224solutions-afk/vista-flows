/**
 * Générateur de Tickets de Transport - Bureau Syndicat
 * Design fidèle au modèle officiel guinéen (orientation PAYSAGE)
 * 30 tickets par page A4 (5 colonnes x 6 lignes)
 */

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Download, FileText, Eye, History, Loader2, Upload, Stamp, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import TransportTicketPreview from './TransportTicketPreview';
import TransportTicketBatchHistory from './TransportTicketBatchHistory';

interface TicketConfig {
  syndicateName: string;
  commune: string;
  ticketType: string;
  amount: number;
  date: string;
  optionalMention: string;
  bureauStampUrl?: string;
}

interface TicketBatch {
  id: string;
  batch_number: string;
  bureau_id: string;
  ticket_config: TicketConfig;
  start_number: number;
  end_number: number;
  tickets_count: number;
  created_at: string;
  created_by: string;
}

export default function TransportTicketGenerator({ bureauId, bureauName }: { bureauId: string; bureauName?: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [generatedTickets, setGeneratedTickets] = useState<number[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);
  const stampInputRef = useRef<HTMLInputElement>(null);
  
  const [config, setConfig] = useState<TicketConfig>({
    syndicateName: bureauName || 'Syndicat de Transports Moto-Taxi',
    commune: '',
    ticketType: 'stationnement',
    amount: 2000,
    date: new Date().toISOString().split('T')[0],
    optionalMention: '',
  });

  const ticketTypes = [
    { value: 'stationnement', label: 'Ticket de stationnement' },
    { value: 'journalier', label: 'Ticket journalier' },
    { value: 'hebdomadaire', label: 'Ticket hebdomadaire' },
    { value: 'mensuel', label: 'Ticket mensuel' },
    { value: 'cotisation', label: 'Ticket de cotisation' },
    { value: 'special', label: 'Ticket spécial' },
  ];

  const generateBatchNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const time = String(date.getHours()).padStart(2, '0') + String(date.getMinutes()).padStart(2, '0');
    return `LOT-${year}${month}${day}-${time}`;
  };

  // Upload du cachet via Edge Function (bypass RLS)
  const handleStampUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2MB');
      return;
    }

    setIsUploadingStamp(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bureauId', bureauId);

      const response = await fetch(
        'https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/upload-bureau-stamp',
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur upload');
      }

      setStampUrl(result.url);
      toast.success('Cachet téléchargé avec succès');
    } catch (error: any) {
      console.error('Erreur upload cachet:', error);
      toast.error(`Erreur: ${error?.message || 'Téléchargement échoué'}`);
    } finally {
      setIsUploadingStamp(false);
    }
  };

  const handleRemoveStamp = () => {
    setStampUrl(null);
    if (stampInputRef.current) {
      stampInputRef.current.value = '';
    }
  };

  const handleGenerateTickets = async () => {
    if (!config.commune) {
      toast.error('Veuillez saisir la commune');
      return;
    }
    if (config.amount <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Récupérer le dernier numéro de ticket pour ce bureau
      const { data: lastBatch, error: fetchError } = await (supabase as any)
        .from('transport_ticket_batches')
        .select('end_number')
        .eq('bureau_id', bureauId)
        .order('end_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Erreur récupération dernier lot:', fetchError);
      }

      const startNumber = (lastBatch?.end_number || 0) + 1;
      const endNumber = startNumber + 29; // 30 tickets
      const batchNumber = generateBatchNumber();

      // Config avec cachet
      const configWithStamp = {
        ...config,
        bureauStampUrl: stampUrl || undefined,
      };

      // Créer le lot dans la base de données
      const { data: newBatch, error: insertError } = await (supabase as any)
        .from('transport_ticket_batches')
        .insert({
          batch_number: batchNumber,
          bureau_id: bureauId,
          ticket_config: configWithStamp,
          start_number: startNumber,
          end_number: endNumber,
          tickets_count: 30,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error('Erreur création du lot: ' + insertError.message);
      }

      // Générer les numéros de tickets
      const ticketNumbers = Array.from({ length: 30 }, (_, i) => startNumber + i);
      
      setGeneratedTickets(ticketNumbers);
      setBatchId(newBatch?.id || null);
      setConfig(configWithStamp);
      setShowPreview(true);
      
      toast.success(`Lot ${batchNumber} généré avec succès (tickets ${startNumber} à ${endNumber})`);
    } catch (error: any) {
      console.error('Erreur génération tickets:', error);
      toast.error(error.message || 'Erreur lors de la génération des tickets');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulaire de configuration */}
      <Card className="border-0 shadow-xl rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Générateur de Tickets de Transport
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => setShowHistory(true)}
              className="border-amber-300 hover:bg-amber-50"
            >
              <History className="w-4 h-4 mr-2" />
              Historique
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Nom du Syndicat */}
            <div className="space-y-2">
              <Label htmlFor="syndicateName">Nom du Syndicat</Label>
              <Input
                id="syndicateName"
                value={config.syndicateName}
                onChange={(e) => setConfig({ ...config, syndicateName: e.target.value })}
                placeholder="Syndicat de Transports Moto-Taxi"
              />
            </div>

            {/* Commune */}
            <div className="space-y-2">
              <Label htmlFor="commune">Commune / Zone *</Label>
              <Input
                id="commune"
                value={config.commune}
                onChange={(e) => setConfig({ ...config, commune: e.target.value })}
                placeholder="Ex: Coyah"
                required
              />
            </div>

            {/* Type de ticket */}
            <div className="space-y-2">
              <Label htmlFor="ticketType">Type de Ticket</Label>
              <Select
                value={config.ticketType}
                onValueChange={(value) => setConfig({ ...config, ticketType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Montant */}
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (GNF)</Label>
              <Input
                id="amount"
                type="number"
                value={config.amount}
                onChange={(e) => setConfig({ ...config, amount: parseInt(e.target.value) || 0 })}
                min="0"
                step="500"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={config.date}
                onChange={(e) => setConfig({ ...config, date: e.target.value })}
              />
            </div>

            {/* Mention optionnelle */}
            <div className="space-y-2">
              <Label htmlFor="optionalMention">Mention optionnelle</Label>
              <Input
                id="optionalMention"
                value={config.optionalMention}
                onChange={(e) => setConfig({ ...config, optionalMention: e.target.value })}
                placeholder="Ex: Valable 24h"
              />
            </div>
          </div>

          {/* Upload du cachet */}
          <div className="mt-6 p-4 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50/50">
            <Label className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-3">
              <Stamp className="w-4 h-4" />
              Cachet du Bureau Syndicat (optionnel)
            </Label>
            
            {stampUrl ? (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 border-2 border-amber-400 rounded-full overflow-hidden bg-white flex items-center justify-center">
                  <img 
                    src={stampUrl} 
                    alt="Cachet" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-green-600 font-medium">✓ Cachet téléchargé</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveStamp}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Supprimer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <input
                  ref={stampInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleStampUpload}
                  className="hidden"
                  id="stamp-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => stampInputRef.current?.click()}
                  disabled={isUploadingStamp}
                  className="border-amber-400 hover:bg-amber-100"
                >
                  {isUploadingStamp ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Télécharger le cachet
                </Button>
                <span className="text-xs text-gray-500">
                  Format: PNG, JPG (max 2MB)
                </span>
              </div>
            )}
          </div>

          {/* Bouton de génération */}
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleGenerateTickets}
              disabled={isGenerating}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8 py-3 text-lg font-bold shadow-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Générer 30 Tickets
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prévisualisation Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Prévisualisation des Tickets - Lot #{batchId?.slice(-8)}
            </DialogTitle>
          </DialogHeader>
          <TransportTicketPreview
            config={config}
            ticketNumbers={generatedTickets}
            batchId={batchId}
          />
        </DialogContent>
      </Dialog>

      {/* Historique Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historique des Lots de Tickets
            </DialogTitle>
          </DialogHeader>
          <TransportTicketBatchHistory bureauId={bureauId} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
