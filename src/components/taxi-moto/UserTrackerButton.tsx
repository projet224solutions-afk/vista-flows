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
}

export function UserTrackerButton({ prominent = false, className, driverName }: UserTrackerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinned className="w-5 h-5 text-primary" />
            Suivre un client
          </DialogTitle>
        </DialogHeader>
        <UserTracker driverName={driverName} />
      </DialogContent>
    </Dialog>
  );
}
