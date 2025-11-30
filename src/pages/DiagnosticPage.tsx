import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function DiagnosticPage() {
  const [status, setStatus] = useState<{
    supabaseUrl: string;
    hasKey: boolean;
    connectionTest: string;
    envVars: Record<string, string>;
  }>({
    supabaseUrl: '',
    hasKey: false,
    connectionTest: 'En cours...',
    envVars: {}
  });

  useEffect(() => {
    const checkConnection = async () => {
      // Vérifier les variables d'environnement
      const envVars = {
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'NON DÉFINI',
        VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Défini (masqué)' : 'NON DÉFINI',
        VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'Défini (masqué)' : 'NON DÉFINI',
      };

      setStatus({
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'Non défini',
        hasKey: !!(import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
        connectionTest: 'Test en cours...',
        envVars
      });

      // Test de connexion
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          setStatus(prev => ({
            ...prev,
            connectionTest: `❌ Erreur: ${error.message}`
          }));
        } else {
          setStatus(prev => ({
            ...prev,
            connectionTest: `✅ Connexion OK - Session: ${data.session ? 'Connecté' : 'Non connecté'}`
          }));
        }
      } catch (err: any) {
        setStatus(prev => ({
          ...prev,
          connectionTest: `❌ Exception: ${err.message}`
        }));
      }
    };

    checkConnection();
  }, []);

  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'monospace',
      backgroundColor: '#1a1a1a',
      color: '#00ff00',
      minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '30px', color: '#ffffff' }}>
        🔧 Diagnostic 224Solutions
      </h1>
      
      <div style={{ 
        backgroundColor: '#2a2a2a', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#ffaa00' }}>
          Configuration Supabase
        </h2>
        <div style={{ marginBottom: '10px' }}>
          <strong>URL:</strong> {status.supabaseUrl}
        </div>
        <div style={{ marginBottom: '10px' }}>
          <strong>Clé API:</strong> {status.hasKey ? '✅ Présente' : '❌ Manquante'}
        </div>
        <div>
          <strong>Test de connexion:</strong> {status.connectionTest}
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#2a2a2a', 
        padding: '20px', 
        borderRadius: '8px'
      }}>
        <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#ffaa00' }}>
          Variables d'environnement
        </h2>
        {Object.entries(status.envVars).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '8px' }}>
            <strong>{key}:</strong> {value}
          </div>
        ))}
      </div>

      <div style={{ 
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px'
      }}>
        <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#ffaa00' }}>
          Actions
        </h2>
        <button
          onClick={() => window.location.href = '/auth'}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Aller à la page de connexion
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Recharger la page
        </button>
      </div>
    </div>
  );
}
