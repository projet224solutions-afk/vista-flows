/**
 * ⚠️ MODAL DE CONFIRMATION DOUBLE - 224SOLUTIONS
 * Composant pour les actions destructrices avec confirmation double
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Shield, 
  CheckCircle, 
  XCircle,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confirmText: string;
    destructive?: boolean;
  };
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  isLoading = false
}) => {
  const [step, setStep] = useState<'warning' | 'confirmation' | 'final'>('warning');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Réinitialiser le modal
  const resetModal = () => {
    setStep('warning');
    setConfirmCheckbox(false);
    setConfirmText('');
    setPassword('');
    setError('');
  };

  // Gérer la fermeture
  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Gérer la confirmation
  const handleConfirm = () => {
    if (step === 'warning') {
      setStep('confirmation');
    } else if (step === 'confirmation') {
      if (!confirmCheckbox || confirmText !== action.confirmText) {
        setError('Veuillez cocher la case et saisir le texte exact');
        return;
      }
      setStep('final');
    } else if (step === 'final') {
      if (!password) {
        setError('Veuillez saisir votre mot de passe');
        return;
      }
      onConfirm();
    }
  };

  // Obtenir la couleur selon la sévérité
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 hover:bg-red-700';
      case 'high':
        return 'bg-orange-600 hover:bg-orange-700';
      case 'medium':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'low':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  // Obtenir l'icône selon la sévérité
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'medium':
        return <Shield className="w-5 h-5" />;
      case 'low':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getSeverityIcon(action.severity)}
            {action.title}
            <Badge variant={action.destructive ? 'destructive' : 'secondary'}>
              {action.severity.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Étape 1: Avertissement */}
          {step === 'warning' && (
            <div className="space-y-4">
              <Alert className={action.destructive ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {action.description}
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Conséquences de cette action :</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Cette action sera enregistrée dans les logs d'audit</li>
                  <li>• Elle ne peut pas être annulée facilement</li>
                  <li>• Elle peut affecter d'autres utilisateurs</li>
                  <li>• Une confirmation supplémentaire sera requise</li>
                </ul>
              </div>
            </div>
          )}

          {/* Étape 2: Confirmation */}
          {step === 'confirmation' && (
            <div className="space-y-4">
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  <strong>Confirmation requise :</strong> Pour continuer, vous devez confirmer que vous comprenez les conséquences de cette action.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="confirm-checkbox"
                    checked={confirmCheckbox}
                    onCheckedChange={setConfirmCheckbox}
                  />
                  <Label htmlFor="confirm-checkbox" className="text-sm">
                    Je comprends les conséquences de cette action et je confirme vouloir continuer
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-text">
                    Tapez <strong>"{action.confirmText}"</strong> pour confirmer :
                  </Label>
                  <Input
                    id="confirm-text"
                    type="text"
                    placeholder={action.confirmText}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <XCircle className="w-4 h-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Étape 3: Vérification finale */}
          {step === 'final' && (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <Lock className="w-4 h-4" />
                <AlertDescription>
                  <strong>Vérification finale :</strong> Saisissez votre mot de passe pour confirmer cette action destructrice.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe de confirmation</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || (step === 'confirmation' && (!confirmCheckbox || confirmText !== action.confirmText)) || (step === 'final' && !password)}
            className={getSeverityColor(action.severity)}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Traitement...
              </>
            ) : step === 'warning' ? (
              'Continuer'
            ) : step === 'confirmation' ? (
              'Confirmer'
            ) : (
              'Exécuter'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
