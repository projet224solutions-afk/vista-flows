/**
 * BOUTON DE DÉCLARATION DE VOL DE MOTO
 * Permet de signaler une moto comme volée
 * 224SOLUTIONS - Bureau Syndicat
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useBureauOfflineSync } from '@/hooks/useBureauOfflineSync';

interface Props {
  moto: {
    id: string;
    plate_number: string;
    serial_number: string;
    brand: string;
    model: string;
    owner_name: string;
    owner_phone: string;
    bureau_id: string;
  };
  bureauName: string;
  bureauLocation: string;
}

export default function StolenMotoReportButton({ moto, bureauName, bureauLocation }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { storeOfflineEvent, isOnline } = useBureauOfflineSync(moto.bureau_id);

  const handleReport = async () => {
    if (!description.trim()) {
      toast.error('Veuillez décrire les circonstances du vol');
      return;
    }

    setSubmitting(true);

    try {
      const alertData = {
        id: crypto.randomUUID(),
        plate_number: moto.plate_number,
        serial_number: moto.serial_number,
        brand: moto.brand,
        model: moto.model,
        owner_name: moto.owner_name,
        owner_phone: moto.owner_phone,
        reported_bureau_id: moto.bureau_id,
        reported_bureau_name: bureauName,
        reported_location: bureauLocation,
        description: description,
        status: 'active',
        created_at: new Date().toISOString()
      };

      if (isOnline) {
        // Insertion directe si en ligne
        const { error } = await (supabase as any)
          .from('moto_security_alerts')
          .insert(alertData);

        if (error) throw error;

        // Marquer la moto comme volée
        await supabase
          .from('registered_motos')
          .update({ status: 'stolen', stolen_reported_at: new Date().toISOString() })
          .eq('id', moto.id);

        // Créer une notification pour le PDG
        await supabase
          .from('notifications')
          .insert({
            user_id: 'pdg', // À ajuster selon votre système
            type: 'MOTO_STOLEN',
            title: '🚨 ALERTE VOL DE MOTO',
            message: `Une moto ${moto.brand} ${moto.model} (${moto.plate_number}) a été déclarée volée à ${bureauLocation}`,
            data: { moto_id: moto.id, alert_id: alertData.id },
            priority: 'high'
          });

        toast.success('🚨 Alerte de vol enregistrée', {
          description: 'Tous les bureaux ont été notifiés'
        });
      } else {
        // Stockage hors ligne
        await storeOfflineEvent('security_alert', alertData);
        
        toast.success('📴 Alerte enregistrée localement', {
          description: 'Elle sera synchronisée à la reconnexion'
        });
      }

      setOpen(false);
      setDescription('');
    } catch (error: any) {
      console.error('Erreur déclaration vol:', error);
      toast.error(error.message || 'Erreur lors de la déclaration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Déclarer vol
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Shield className="w-5 h-5" />
            Déclaration de vol de moto
          </DialogTitle>
          <DialogDescription>
            Cette action créera une alerte de sécurité visible par tous les bureaux du réseau
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations de la moto */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2">Moto concernée</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-red-700 font-medium">Plaque:</span> {moto.plate_number}
              </div>
              <div>
                <span className="text-red-700 font-medium">Châssis:</span> {moto.serial_number}
              </div>
              <div>
                <span className="text-red-700 font-medium">Marque:</span> {moto.brand} {moto.model}
              </div>
              <div>
                <span className="text-red-700 font-medium">Propriétaire:</span> {moto.owner_name}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Circonstances du vol *
            </Label>
            <Textarea
              id="description"
              placeholder="Décrivez les circonstances du vol: date, heure, lieu, témoins, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Avertissement */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Cette déclaration sera visible par tous les bureaux. 
              Assurez-vous que les informations sont exactes.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReport}
              disabled={submitting || !description.trim()}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Déclarer le vol
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
