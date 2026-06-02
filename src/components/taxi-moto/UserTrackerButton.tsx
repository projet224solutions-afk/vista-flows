/**
 * USER TRACKER BUTTON - 224SOLUTIONS
 * Bouton pour ouvrir le tracker d'utilisateur (suivre un client par ID / lien)
 */

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPinned } from "lucide-react";
import { UserTracker } from "./UserTracker";

interface UserTrackerButtonProps {
  /** Variante visible et libellée (ex: dans le dashboard chauffeur). */
  prominent?: boolean;
  className?: string;
  /** Nom du chauffeur, transmis au client dans la notification "taxi en route". */
  driverName?: string;
  /**
   * ID du chauffeur taxi (taxi_drivers). Si fourni : active le « mode course »
   * (statut occupé + suivi persistant jusqu'à « Course terminée »).
   */
  driverId?: string | null;
}

export function UserTrackerButton({ prominent = false, className, driverName, driverId }: UserTrackerButtonProps) {
  const [open, setOpen] = useState(false);
  // Une course est active : le dialog ne peut plus être fermé par clic extérieur/échap.
  const [courseActive, setCourseActive] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Tant qu'une course est active, on bloque la fermeture (reste sur la navigation).
        if (!next && courseActive) return;
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        {prominent ? (
          <Button
            className={className ?? "w-full bg-blue-600 hover:bg-blue-700 text-white"}
            title="Suivre un client par ID ou lien"
          >
            <MapPinned className="w-4 h-4 mr-2" />
            Suivre un client (ID / lien)
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={className ?? "h-9 px-2 gap-1 text-xs"}
            title="Suivre un client par ID ou lien"
          >
            <MapPinned className="w-4 h-4" />
            <span className="hidden sm:inline">Suivre client</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={courseActive ? "max-w-md [&>button]:hidden" : "max-w-md"}
        onPointerDownOutside={(e) => { if (courseActive) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (courseActive) e.preventDefault(); }}
        onInteractOutside={(e) => { if (courseActive) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinned className="w-5 h-5 text-primary" />
            {courseActive ? 'Course en cours' : 'Suivre un client'}
          </DialogTitle>
        </DialogHeader>
        <UserTracker
          driverName={driverName}
          driverId={driverId}
          onActiveChange={setCourseActive}
          onFinish={() => { setCourseActive(false); setOpen(false); }}
        />
      </DialogContent>
    </Dialog>
  );
}
