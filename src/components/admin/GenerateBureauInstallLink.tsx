/**
 * GÃ‰NÃ‰RATEUR DE LIEN D'INSTALLATION BUREAU
 * Composant pour gÃ©nÃ©rer des liens sÃ©curisÃ©s d'installation PWA
 * 224SOLUTIONS - Administration
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link as LinkIcon,
  Copy,
  Check,
  Mail,
  Clock,
  Shield,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  bureauId: string;
  bureauName: string;
}

export default function GenerateBureauInstallLink({ bureauId, bureauName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [email, setEmail] = useState('');
  const [expiresIn, setExpiresIn] = useState('24');

  const handleGenerate = async () => {
    setLoading(true);

    try {
      // Appeler l'edge function pour gÃ©nÃ©rer le token
      const { data, error } = await supabase.functions.invoke('generate-bureau-token', {
        body: {
          bureau_id: bureauId,
          president_email: email || null,
          expires_in_hours: parseInt(expiresIn)
        }
      });

      if (error) throw error;

      if (data.success) {
        setGeneratedLink(data.install_url);
        
        toast.success('ðŸ”— Lien gÃ©nÃ©rÃ© !', {
          description: email ? `Email envoyÃ© Ã  ${email}` : 'Copiez et partagez le lien'
        });
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('Erreur gÃ©nÃ©ration lien:', error);
      toast.error(error.message || 'Erreur lors de la gÃ©nÃ©ration');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Lien copiÃ© !');
      
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setGeneratedLink(null);
    setEmail('');
    setExpiresIn('24');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LinkIcon className="w-4 h-4 mr-2" />
          Lien d'installation
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            GÃ©nÃ©rer un lien d'installation PWA
          </DialogTitle>
          <DialogDescription>
            CrÃ©ez un lien sÃ©curisÃ© pour {bureauName}
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4">
            {/* Informations bureau */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">Bureau:</p>
              <p className="text-sm text-blue-700">{bureauName}</p>
              <Badge variant="outline" className="mt-2">
                ID: {bureauId.slice(0, 8)}...
              </Badge>
            </div>

            {/* Email du prÃ©sident (optionnel) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email du prÃ©sident (optionnel)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="president@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Si fourni, le lien sera envoyÃ© automatiquement par email
              </p>
            </div>

            {/* DurÃ©e de validitÃ© */}
            <div className="space-y-2">
              <Label htmlFor="expires" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                DurÃ©e de validitÃ©
              </Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger id="expires">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 heure</SelectItem>
                  <SelectItem value="6">6 heures</SelectItem>
                  <SelectItem value="12">12 heures</SelectItem>
                  <SelectItem value="24">24 heures (recommandÃ©)</SelectItem>
                  <SelectItem value="48">48 heures</SelectItem>
                  <SelectItem value="72">72 heures</SelectItem>
                  <SelectItem value="168">7 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bouton gÃ©nÃ©ration */}
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  GÃ©nÃ©ration en cours...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  GÃ©nÃ©rer le lien
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lien gÃ©nÃ©rÃ© */}
            <div className="p-4 bg-gradient-to-br from-primary-blue-50 to-primary-orange-50 rounded-lg border border-primary-orange-200">
              <div className="flex items-center gap-2 text-primary-orange-800 mb-2">
                <Check className="w-5 h-5" />
                <span className="font-medium">Lien gÃ©nÃ©rÃ© avec succÃ¨s !</span>
              </div>
              
              <div className="mt-3 p-3 bg-white rounded border border-primary-orange-300">
                <p className="text-sm break-all font-mono text-gray-700">
                  {generatedLink}
                </p>
              </div>

              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full mt-3"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-primary-orange-600" />
                    CopiÃ© !
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copier le lien
                  </>
                )}
              </Button>
            </div>

            {/* Informations */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>ValiditÃ©:</strong> {expiresIn} heure(s)
              </p>
              {email && (
                <p className="text-sm text-blue-900 mt-1">
                  <strong>Email envoyÃ© Ã :</strong> {email}
                </p>
              )}
            </div>

            {/* Instructions */}
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-900 mb-2">
                ðŸ“± Instructions pour le prÃ©sident :
              </p>
              <ol className="text-sm text-purple-700 space-y-1 list-decimal list-inside">
                <li>Cliquer sur le lien</li>
                <li>Accepter l'installation de l'application</li>
                <li>L'application sera disponible sur l'Ã©cran d'accueil</li>
                <li>Utilisable mÃªme sans Internet</li>
              </ol>
            </div>

            {/* Boutons */}
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                GÃ©nÃ©rer un nouveau lien
              </Button>
              <Button onClick={() => setOpen(false)} className="flex-1">
                Fermer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
