/**
 * 🧪 Composant de Test de Communication pour PDG
 * Interface de test et de gestion du système de communication
 */

import { Suspense } from 'react';
import CommunicationTestPanel from '@/components/communication/CommunicationTestPanel';
import UniversalCommunicationHub from '@/components/communication/UniversalCommunicationHub';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, TestTube } from 'lucide-react';

export default function PDGCommunicationTest() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="interface" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="interface" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Interface Communication
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <TestTube className="w-4 h-4" />
            Tests Système
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interface" className="space-y-4 mt-6">
          <Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }>
            <UniversalCommunicationHub />
          </Suspense>
        </TabsContent>

        <TabsContent value="test" className="space-y-4 mt-6">
          <Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }>
            <CommunicationTestPanel />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
