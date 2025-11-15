// 📖 Playbooks de réponse aux incidents
import React from 'react';
import { Book, Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SecurityPlaybooks: React.FC = () => {
  const playbooks = [
    {
      name: 'Réponse Brute Force',
      type: 'brute_force',
      severity: 'high',
      autoExecute: true,
      steps: 5
    },
    {
      name: 'Mitigation DDoS',
      type: 'ddos',
      severity: 'critical',
      autoExecute: true,
      steps: 7
    },
    {
      name: 'Clé Compromise',
      type: 'key_compromise',
      severity: 'critical',
      autoExecute: false,
      steps: 4
    },
    {
      name: 'Exfiltration de Données',
      type: 'data_exfil',
      severity: 'critical',
      autoExecute: false,
      steps: 6
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-2xl font-bold">Playbooks de Sécurité</h3>
        <p className="text-muted-foreground">Procédures automatisées de réponse</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {playbooks.map((playbook) => (
          <Card key={playbook.type}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Book className="h-5 w-5" />
                  <CardTitle className="text-lg">{playbook.name}</CardTitle>
                </div>
                <Badge variant={playbook.autoExecute ? 'default' : 'secondary'}>
                  {playbook.autoExecute ? 'Auto' : 'Manuel'}
                </Badge>
              </div>
              <CardDescription>
                {playbook.steps} étapes • Sévérité: {playbook.severity}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Exécuter Playbook
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Création de Playbooks</CardTitle>
          <CardDescription>Créez des playbooks personnalisés pour votre organisation</CardDescription>
        </CardHeader>
        <CardContent>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Playbook
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

export default SecurityPlaybooks;
