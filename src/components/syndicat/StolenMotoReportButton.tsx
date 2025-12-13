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
      if (isOnline) {
        // CENTRALISÉ: Utiliser le RPC declare_vehicle_stolen
        console.log('📝 Déclaration vol via RPC centralisé:', moto.id);
        
        const { data, error } = await supabase.rpc('declare_vehicle_stolen', {
          p_vehicle_id: moto.id,
          p_bureau_id: moto.bureau_id,
          p_declared_by: moto.bureau_id,
          p_reason: description,
          p_location: bureauLocation,
          p_ip_address: null,
          p_user_agent: navigator.userAgent
        });

        if (error) {
          console.error('❌ Erreur RPC declare_vehicle_stolen:', error);
          throw error;
        }

        const result = data as { success: boolean; error?: string; message?: string };
        
        if (!result.success) {
          throw new Error(result.error || 'Erreur lors de la déclaration');
        }
        
        console.log('✅ Véhicule déclaré volé via RPC:', result);

        toast.success('🚨 Alerte de vol enregistrée', {
          description: 'Tous les bureaux ont été notifiés. Le véhicule est bloqué.'
        });
      } else {
        // Stockage hors ligne - garder la structure pour sync ultérieure
        const alertData = {
          id: crypto.randomUUID(),
          vehicle_id: moto.id,
          bureau_id: moto.bureau_id,
          reason: description,
          location: bureauLocation,
          created_at: new Date().toISOString()
        };
        
        await storeOfflineEvent('security_alert', alertData);
        
        toast.success('📴 Alerte enregistrée localement', {
          description: 'Elle sera synchronisée à la reconnexion'
        });
      }

      setOpen(false);
      setDescription('');
    } catch (error: any) {
      console.error('❌ Erreur déclaration vol:', error);
      toast.error('Erreur lors de la déclaration', {
        description: error.message || 'Impossible d\'enregistrer l\'alerte de vol'
      });
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
