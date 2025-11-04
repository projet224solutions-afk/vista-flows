/**
 * CERTIFICATIONS DE SÉCURITÉ
 * Gestion des certifications ISO 27001, PCI-DSS
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, Clock, AlertTriangle, RefreshCw, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Certification {
  id: string;
  name: string;
  certification_type: string;
  status: 'certified' | 'in_progress' | 'planned' | 'expired';
  progress: number;
  valid_from?: string;
  valid_until?: string;
  description: string;
  issuing_authority?: string;
  certificate_url?: string;
  created_at: string;
  updated_at: string;
}

export function SecurityCertifications() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les certifications depuis Supabase
  useEffect(() => {
    loadCertifications();
  }, []);

  const loadCertifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security_certifications')
        .select('*')
        .order('progress', { ascending: false });

      if (error) throw error;
      setCertifications((data || []) as Certification[]);
    } catch (error) {
      console.error('Erreur chargement certifications:', error);
      toast.error('Impossible de charger les certifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async (certId: string, certName: string) => {
    try {
      const cert = certifications.find(c => c.id === certId);
      if (cert?.certificate_url) {
        window.open(cert.certificate_url, '_blank');
      } else {
        toast.info(`Certificat ${certName} en cours de préparation`);
      }
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const getStatusBadge = (status: Certification['status']) => {
    switch (status) {
      case 'certified':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Certifié</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />En cours</Badge>;
      case 'planned':
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />Planifié</Badge>;
      case 'expired':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Expiré</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement des certifications...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Certifications de Sécurité
            </CardTitle>
            <CardDescription>
              Conformité aux normes internationales de sécurité
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadCertifications}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {certifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune certification enregistrée</p>
          </div>
        ) : (
          <>
            {certifications.map((cert) => (
              <div key={cert.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{cert.name}</h4>
                    <p className="text-sm text-muted-foreground">{cert.description}</p>
                    {cert.issuing_authority && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Organisme: {cert.issuing_authority}
                      </p>
                    )}
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
                {cert.valid_until && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {cert.valid_from && `Du ${new Date(cert.valid_from).toLocaleDateString('fr-FR')} `}
                      Valide jusqu'au {new Date(cert.valid_until).toLocaleDateString('fr-FR')}
                    </span>
                    {cert.certificate_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadCertificate(cert.id, cert.name)}
                        className="h-7 text-xs"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Télécharger
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                const certified = certifications.filter(c => c.status === 'certified');
                if (certified.length > 0) {
                  toast.success(`${certified.length} certification(s) disponible(s) au téléchargement`);
                } else {
                  toast.info('Aucun rapport de conformité disponible pour le moment');
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger les rapports de conformité
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
