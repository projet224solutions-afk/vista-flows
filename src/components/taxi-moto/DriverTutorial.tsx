/**
 * TUTORIEL CONDUCTEUR - Guide d'utilisation de l'application
 * Explique comment utiliser l'app pour effectuer des courses
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  HelpCircle,
  Bell,
  Navigation,
  MapPin,
  CheckCircle,
  Car,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  PlayCircle
} from "lucide-react";

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tips: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "1. Activer le mode en ligne",
    description: "Commencez par activer le bouton 'EN LIGNE' en haut de l'écran pour recevoir des demandes de course.",
    icon: <PlayCircle className="w-12 h-12 text-green-600" />,
    tips: [
      "Assurez-vous que votre GPS est activé",
      "Vérifiez votre connexion internet",
      "Le bouton devient vert quand vous êtes en ligne"
    ]
  },
  {
    title: "2. Recevoir une demande",
    description: "Une notification apparaît quand un client demande une course. Vous avez 30 secondes pour répondre.",
    icon: <Bell className="w-12 h-12 text-blue-600" />,
    tips: [
      "Une alerte sonore vous prévient",
      "Vérifiez la distance et le prix",
      "Consultez la note du client"
    ]
  },
  {
    title: "3. Accepter la course",
    description: "Appuyez sur 'Accepter' pour confirmer. La course apparaît dans l'onglet 'Course'.",
    icon: <CheckCircle className="w-12 h-12 text-green-600" />,
    tips: [
      "L'adresse de départ s'affiche",
      "La navigation démarre automatiquement",
      "Le client est informé que vous arrivez"
    ]
  },
  {
    title: "4. Navigation vers le client",
    description: "Suivez la navigation GPS pour rejoindre le point de départ. Cliquez sur 'Ouvrir dans Google Maps' si besoin.",
    icon: <Navigation className="w-12 h-12 text-blue-600" />,
    tips: [
      "Distance et temps estimé s'affichent",
      "Votre position est mise à jour en temps réel",
      "Le client suit votre position"
    ]
  },
  {
    title: "5. Arrivée au point de départ",
    description: "Une fois sur place, appuyez sur 'Je suis arrivé au point de départ'.",
    icon: <MapPin className="w-12 h-12 text-green-600" />,
    tips: [
      "Vérifiez l'identité du client",
      "Confirmez la destination",
      "Appelez le client si nécessaire"
    ]
  },
  {
    title: "6. Démarrer la course",
    description: "Quand le client est à bord, appuyez sur 'Client à bord - Démarrer la course'.",
    icon: <Car className="w-12 h-12 text-purple-600" />,
    tips: [
      "La navigation vers la destination démarre",
      "Le compteur de course commence",
      "Conduisez prudemment"
    ]
  },
  {
    title: "7. Terminer la course",
    description: "À l'arrivée, appuyez sur 'Arrivé à destination - Terminer la course'.",
    icon: <DollarSign className="w-12 h-12 text-green-600" />,
    tips: [
      "Le paiement est traité automatiquement",
      "Vos gains sont ajoutés à votre portefeuille",
      "Le client peut vous noter"
    ]
  }
];

export function DriverTutorial() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = tutorialSteps[currentStep];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <HelpCircle className="w-4 h-4" />
          Comment ça marche ?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            Guide du conducteur
          </DialogTitle>
          <DialogDescription>
            Apprenez à utiliser l'application pour effectuer vos courses
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Indicateur de progression */}
          <div className="flex justify-between items-center mb-6">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 mx-1 rounded-full transition-all ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Étape actuelle */}
          <Card className="border-2 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="mb-4">{step.icon}</div>
                <Badge className="mb-3 bg-blue-600">
                  Étape {currentStep + 1} sur {tutorialSteps.length}
                </Badge>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>

              {/* Conseils */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="font-semibold text-blue-900 mb-3">💡 Conseils :</p>
                <ul className="space-y-2">
                  {step.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </Button>

            <span className="text-sm text-gray-600">
              {currentStep + 1} / {tutorialSteps.length}
            </span>

            {currentStep < tutorialSteps.length - 1 ? (
              <Button onClick={handleNext} className="gap-2 bg-blue-600 hover:bg-blue-700">
                Suivant
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setOpen(false)}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                Compris !
              </Button>
            )}
          </div>

          {/* Bouton retour au début */}
          {currentStep > 0 && (
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(0)}
              className="w-full text-sm"
            >
              Retour au début
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
