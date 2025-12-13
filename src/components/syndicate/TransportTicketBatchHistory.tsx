/**
 * Historique des Lots de Tickets de Transport
 * Traçabilité complète des générations
 */

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Download, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TransportTicketPreview from './TransportTicketPreview';

interface TicketConfig {
  syndicateName: string;
  commune: string;
  ticketType: string;
  amount: number;
  date: string;
  optionalMention: string;
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
}

export default function TransportTicketBatchHistory({ bureauId }: { bureauId: string }) {
  const [batches, setBatches] = useState<TicketBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<TicketBatch | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadBatches();
  }, [bureauId]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('transport_ticket_batches')
        .select('*')
        .eq('bureau_id', bureauId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBatches((data as TicketBatch[]) || []);
    } catch (error: any) {
      console.error('Erreur chargement historique:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBatch = (batch: TicketBatch) => {
    setSelectedBatch(batch);
    setShowPreview(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-GN').format(amount);
  };

  const ticketTypeLabels: Record<string, string> = {
    stationnement: 'Stationnement',
    journalier: 'Journalier',
    hebdomadaire: 'Hebdomadaire',
    mensuel: 'Mensuel',
    cotisation: 'Cotisation',
    special: 'Spécial',
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">Aucun lot de tickets généré</p>
        <p className="text-sm text-gray-400 mt-2">
          Utilisez le formulaire pour générer votre premier lot
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-amber-800">
          <strong>{batches.length}</strong> lot(s) de tickets générés au total • 
          <strong> {batches.reduce((acc, b) => acc + b.tickets_count, 0)}</strong> tickets
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Lot</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Commune</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Tickets</TableHead>
            <TableHead>Date création</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell className="font-mono font-bold">
                {batch.batch_number}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {ticketTypeLabels[batch.ticket_config.ticketType] || batch.ticket_config.ticketType}
                </Badge>
              </TableCell>
              <TableCell>{batch.ticket_config.commune}</TableCell>
              <TableCell className="font-semibold">
                {formatAmount(batch.ticket_config.amount)} GNF
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {batch.start_number} → {batch.end_number}
                </span>
                <Badge className="ml-2 bg-green-100 text-green-800">
                  {batch.tickets_count}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {formatDate(batch.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewBatch(batch)}
                  className="border-amber-300 hover:bg-amber-50"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Voir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Dialog de prévisualisation */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Lot {selectedBatch?.batch_number} - {selectedBatch?.ticket_config.commune}
            </DialogTitle>
          </DialogHeader>
          {selectedBatch && (
            <TransportTicketPreview
              config={selectedBatch.ticket_config}
              ticketNumbers={Array.from(
                { length: selectedBatch.tickets_count },
                (_, i) => selectedBatch.start_number + i
              )}
              batchId={selectedBatch.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
