/**
 * USER TRACKER BUTTON - 224SOLUTIONS
 * Bouton compact pour ouvrir le tracker d'utilisateur
 */

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPinned } from "lucide-react";
import { UserTracker } from "./UserTracker";

export function UserTrackerButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 gap-1 text-xs"
          title="Tracker un utilisateur"
        >
          <MapPinned className="w-4 h-4" />
          <span className="hidden sm:inline">Track</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinned className="w-5 h-5 text-primary" />
            Tracker un utilisateur
          </DialogTitle>
        </DialogHeader>
        <UserTracker />
      </DialogContent>
    </Dialog>
  );
}
