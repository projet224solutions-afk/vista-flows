/**
 * PAGE PARAM├êTRES LIVREUR
 * Notifications, confidentialit├®, pr├®f├®rences
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, Lock, Globe, Smartphone, Navigation, Volume2 } from 'lucide-react';
import { DriverLayout } from '@/components/driver/DriverLayout';
import { useTheme } from 'next-themes';

export default function DriverSettings() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <DriverLayout currentPage="settings">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Param├¿tres</h1>
          <p className="text-muted-foreground">Configurez votre application</p>
        </div>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>G├®rez vos pr├®f├®rences de notification</CardDescription>
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
                <p className="text-sm text-muted-foreground">Recevoir des notifications m├¬me hors app</p>
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
                <p className="text-sm text-muted-foreground">Partager votre position en temps r├®el</p>
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

        {/* Confidentialit├® */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Confidentialit├® et s├®curit├®
            </CardTitle>
            <CardDescription>Prot├®gez vos donn├®es personnelles</CardDescription>
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

        {/* Pr├®f├®rences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Pr├®f├®rences
            </CardTitle>
            <CardDescription>Langue et affichage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Langue</Label>
              <select className="w-full p-2 border rounded-lg">
                <option>Fran├ºais</option>
                <option>English</option>
              </select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Mode sombre</Label>
                <p className="text-sm text-muted-foreground">Activer le th├¿me sombre</p>
              </div>
              <Switch 
                checked={isDark} 
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
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
