/**
 * PAGE PARAMÈTRES LIVREUR
 * Notifications, confidentialité, préférences
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, Lock, Globe, Smartphone, Navigation, Volume2 } from 'lucide-react';
import { DriverLayout } from '@/components/driver/DriverLayout';

export default function DriverSettings() {
  return (
    <DriverLayout currentPage="settings">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground">Configurez votre application</p>
        </div>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Gérez vos préférences de notification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Nouvelles missions</Label>
                <p className="text-sm text-muted-foreground">Recevoir des alertes pour les nouvelles livraisons</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Notifications sonores</Label>
                <p className="text-sm text-muted-foreground">Sons pour les alertes importantes</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Notifications push</Label>
                <p className="text-sm text-muted-foreground">Recevoir des notifications même hors app</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* GPS & Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              GPS & Navigation
            </CardTitle>
            <CardDescription>Options de localisation et navigation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Tracking GPS automatique</Label>
                <p className="text-sm text-muted-foreground">Partager votre position en temps réel</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Navigation Google Maps</Label>
                <p className="text-sm text-muted-foreground">Ouvrir automatiquement Google Maps</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Confidentialité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Confidentialité et sécurité
            </CardTitle>
            <CardDescription>Protégez vos données personnelles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Profil visible</Label>
                <p className="text-sm text-muted-foreground">Les clients peuvent voir votre profil</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Partage de statistiques</Label>
                <p className="text-sm text-muted-foreground">Partager vos performances avec 224Solutions</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <Button variant="outline" className="w-full">
              Changer le mot de passe
            </Button>
          </CardContent>
        </Card>

        {/* Préférences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Préférences
            </CardTitle>
            <CardDescription>Langue et affichage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Langue</Label>
              <select className="w-full p-2 border rounded-lg">
                <option>Français</option>
                <option>English</option>
              </select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Mode sombre</Label>
                <p className="text-sm text-muted-foreground">Activer le thème sombre</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button variant="outline" className="flex-1">Annuler</Button>
          <Button className="flex-1">Enregistrer les modifications</Button>
        </div>
      </div>
    </DriverLayout>
  );
}
