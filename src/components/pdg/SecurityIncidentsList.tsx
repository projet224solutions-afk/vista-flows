// 🚨 Liste des incidents de sécurité
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Shield, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SecurityIncident } from '@/hooks/useSecurityOps';

interface Props {
  incidents: SecurityIncident[];
  onContain: (id: string) => void;
  onResolve: (id: string) => void;
  onCreate: (type: string, severity: string, title: string, description: string, sourceIp?: string, targetService?: string) => void;
}

export const SecurityIncidentsList: React.FC<Props> = ({ incidents, onContain, onResolve, onCreate }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    type: 'brute_force',
    severity: 'high',
    title: '',
    description: '',
    sourceIp: '',
    targetService: ''
  });

  const handleCreate = () => {
    onCreate(
      newIncident.type,
      newIncident.severity,
      newIncident.title,
      newIncident.description,
      newIncident.sourceIp || undefined,
      newIncident.targetService || undefined
    );
    setIsCreateOpen(false);
    setNewIncident({ type: 'brute_force', severity: 'high', title: '', description: '', sourceIp: '', targetService: '' });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'investigating': return 'default';
      case 'contained': return 'secondary';
      case 'resolved': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">Incidents de Sécurité</h3>
          <p className="text-muted-foreground">Gestion et réponse aux incidents</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Créer un Incident
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un Incident de Sécurité</DialogTitle>
              <DialogDescription>Déclarer un nouvel incident de sécurité</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Type d'incident</label>
                <Select value={newIncident.type} onValueChange={(v) => setNewIncident({ ...newIncident, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brute_force">Brute Force</SelectItem>
                    <SelectItem value="ddos">DDoS</SelectItem>
                    <SelectItem value="data_exfil">Exfiltration de données</SelectItem>
                    <SelectItem value="key_compromise">Clé compromise</SelectItem>
                    <SelectItem value="anomaly">Anomalie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Sévérité</label>
                <Select value={newIncident.severity} onValueChange={(v) => setNewIncident({ ...newIncident, severity: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critique</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Titre</label>
                <Input value={newIncident.title} onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={newIncident.description} onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">IP Source (optionnel)</label>
                <Input value={newIncident.sourceIp} onChange={(e) => setNewIncident({ ...newIncident, sourceIp: e.target.value })} placeholder="192.168.1.1" />
              </div>
              <div>
                <label className="text-sm font-medium">Service Cible (optionnel)</label>
                <Input value={newIncident.targetService} onChange={(e) => setNewIncident({ ...newIncident, targetService: e.target.value })} placeholder="authentication" />
              </div>
              <Button onClick={handleCreate} className="w-full">Créer l'Incident</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {incidents.map((incident) => (
          <Card key={incident.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {incident.title}
                  </CardTitle>
                  <CardDescription>{incident.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={getSeverityColor(incident.severity)}>
                    {incident.severity}
                  </Badge>
                  <Badge variant={getStatusColor(incident.status)}>
                    {incident.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Type:</span>
                  <span className="text-muted-foreground">{incident.incident_type}</span>
                </div>
                {incident.source_ip && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">IP Source:</span>
                    <span className="text-muted-foreground">{incident.source_ip}</span>
                  </div>
                )}
                {incident.target_service && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Service:</span>
                    <span className="text-muted-foreground">{incident.target_service}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-muted-foreground">
                    Détecté le {new Date(incident.detected_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                {incident.status === 'open' || incident.status === 'investigating' ? (
                  <div className="flex gap-2 mt-2">
                    {incident.status === 'open' && (
                      <Button size="sm" variant="outline" onClick={() => onContain(incident.id)}>
                        <Shield className="h-4 w-4 mr-1" />
                        Contenir
                      </Button>
                    )}
                    <Button size="sm" variant="default" onClick={() => onResolve(incident.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Résoudre
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {incidents.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Aucun incident de sécurité</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
