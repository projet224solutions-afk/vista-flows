/**
 * CERTIFICATIONS DE SÉCURITÉ
 * Gestion des certifications ISO 27001, PCI-DSS
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Certification {
  id: string;
  name: string;
  status: 'certified' | 'in_progress' | 'planned';
  progress: number;
  validUntil?: string;
  description: string;
}

const certifications: Certification[] = [
  {
    id: 'iso27001',
    name: 'ISO 27001',
    status: 'in_progress',
    progress: 65,
    description: 'Système de management de la sécurité de l\'information'
  },
  {
    id: 'pci_dss',
    name: 'PCI-DSS',
    status: 'in_progress',
    progress: 45,
    description: 'Norme de sécurité des données de carte de paiement'
  },
  {
    id: 'soc2',
    name: 'SOC 2 Type II',
    status: 'planned',
    progress: 20,
    description: 'Contrôles de sécurité organisationnels'
  }
];

export function SecurityCertifications() {
  const getStatusBadge = (status: Certification['status']) => {
    switch (status) {
      case 'certified':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Certifié</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />En cours</Badge>;
      case 'planned':
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />Planifié</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Certifications de Sécurité
        </CardTitle>
        <CardDescription>
          Conformité aux normes internationales de sécurité
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {certifications.map((cert) => (
          <div key={cert.id} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{cert.name}</h4>
                <p className="text-sm text-muted-foreground">{cert.description}</p>
              </div>
              {getStatusBadge(cert.status)}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progression</span>
                <span className="font-medium">{cert.progress}%</span>
              </div>
              <Progress value={cert.progress} className="h-2" />
            </div>
            {cert.validUntil && (
              <p className="text-xs text-muted-foreground">
                Valide jusqu'au {new Date(cert.validUntil).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        ))}
        <Button variant="outline" className="w-full">
          Télécharger les rapports de conformité
        </Button>
      </CardContent>
    </Card>
  );
}
