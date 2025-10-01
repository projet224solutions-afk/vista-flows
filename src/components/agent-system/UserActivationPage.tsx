/**
 * 🎯 Page d'Activation Utilisateur - 224Solutions
 * Interface d'activation pour les utilisateurs invités par les agents
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Smartphone, Monitor, Tablet, Download, CheckCircle,
  Crown, Shield, Sparkles, ArrowRight, ExternalLink,
  Mail, Phone, User, Calendar
} from "lucide-react";
import { useUserActivation } from "@/hooks/useAgentSystem";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function UserActivationPage() {
  const { invitationToken } = useParams<{ invitationToken: string }>();
  const navigate = useNavigate();
  const { activateUser, loading, error } = useUserActivation();
  
  const [selectedDevice, setSelectedDevice] = useState<'mobile' | 'pc' | 'tablet' | null>(null);
  const [activationResult, setActivationResult] = useState<any>(null);
  const [isActivated, setIsActivated] = useState(false);

  // Détecter automatiquement le type d'appareil
  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
      
      if (isTablet) {
        setSelectedDevice('tablet');
      } else if (isMobile) {
        setSelectedDevice('mobile');
      } else {
        setSelectedDevice('pc');
      }
    };

    detectDevice();
  }, []);

  const handleActivation = async () => {
    if (!invitationToken || !selectedDevice) {
      toast.error("Informations d'activation manquantes");
      return;
    }

    try {
      const result = await activateUser(invitationToken, selectedDevice);
      setActivationResult(result);
      setIsActivated(true);
      
      // Redirection automatique après 5 secondes
      setTimeout(() => {
        if (result.downloadUrl) {
          window.open(result.downloadUrl, '_blank');
        }
        navigate('/');
      }, 5000);
    } catch (error) {
      console.error('Erreur activation:', error);
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="w-8 h-8" />;
      case 'tablet': return <Tablet className="w-8 h-8" />;
      case 'pc': return <Monitor className="w-8 h-8" />;
      default: return <Monitor className="w-8 h-8" />;
    }
  };

  const getDeviceLabel = (device: string) => {
    switch (device) {
      case 'mobile': return 'Mobile / Smartphone';
      case 'tablet': return 'Tablette';
      case 'pc': return 'Ordinateur / PC';
      default: return 'Ordinateur';
    }
  };

  if (!invitationToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">Lien Invalide</h2>
            <p className="text-muted-foreground">
              Ce lien d'invitation n'est pas valide ou a expiré.
            </p>
            <Button 
              className="mt-4" 
              onClick={() => navigate('/')}
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isActivated && activationResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl text-green-600">
              🎉 Activation Réussie !
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-green-200 bg-green-50">
              <Sparkles className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Votre compte 224Solutions a été activé avec succès ! 
                Bienvenue dans notre écosystème digital.
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Téléchargez l'Application</h3>
              <p className="text-muted-foreground">
                Pour une expérience optimale, téléchargez notre application :
              </p>
              
              <div className="flex justify-center">
                <Badge variant="outline" className="px-4 py-2">
                  {getDeviceIcon(selectedDevice || 'pc')}
                  <span className="ml-2">{getDeviceLabel(selectedDevice || 'pc')}</span>
                </Badge>
              </div>

              {activationResult.downloadUrl && (
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => window.open(activationResult.downloadUrl, '_blank')}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Télécharger Maintenant
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}

              <div className="text-sm text-muted-foreground">
                Redirection automatique dans 5 secondes...
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Prochaines étapes :</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Téléchargez et installez l'application</li>
                <li>• Connectez-vous avec vos identifiants</li>
                <li>• Explorez toutes les fonctionnalités</li>
                <li>• Contactez votre agent pour toute question</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Bienvenue chez 224Solutions
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Activez votre compte pour accéder à notre écosystème digital complet
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Vous avez été invité par un agent certifié 224Solutions. 
              Votre compte sera automatiquement lié à votre parrain.
            </AlertDescription>
          </Alert>

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Sélectionnez votre appareil
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { type: 'mobile', label: 'Mobile / Smartphone', desc: 'iOS & Android' },
                { type: 'tablet', label: 'Tablette', desc: 'iPad & Android' },
                { type: 'pc', label: 'Ordinateur', desc: 'Windows & Mac' }
              ].map((device) => (
                <Card 
                  key={device.type}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedDevice === device.type 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedDevice(device.type as any)}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                      selectedDevice === device.type 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {getDeviceIcon(device.type)}
                    </div>
                    <h4 className="font-medium">{device.label}</h4>
                    <p className="text-sm text-muted-foreground">{device.desc}</p>
                    {selectedDevice === device.type && (
                      <CheckCircle className="w-5 h-5 text-blue-500 mx-auto mt-2" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Ce que vous obtenez :
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Accès complet à la plateforme</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Support de votre agent</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Commissions automatiques</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Outils professionnels</span>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center">
            <Button 
              size="lg"
              onClick={handleActivation}
              disabled={!selectedDevice || loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Activation en cours...
                </>
              ) : (
                <>
                  Activer mon compte
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            En activant votre compte, vous acceptez nos{' '}
            <a href="#" className="text-blue-600 hover:underline">conditions d'utilisation</a>
            {' '}et notre{' '}
            <a href="#" className="text-blue-600 hover:underline">politique de confidentialité</a>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
