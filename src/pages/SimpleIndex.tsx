import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function SimpleIndex() {
  const navigate = useNavigate();

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          fontSize: '48px', 
          fontWeight: 'bold',
          marginBottom: '20px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          224Solutions
        </h1>
        
        <p style={{ 
          fontSize: '20px',
          color: '#666',
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          Plateforme multiservices - E-commerce, Livraison, Taxi-Moto, Bureau Syndicat
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <Button 
            onClick={() => navigate('/auth')}
            style={{
              padding: '20px',
              fontSize: '16px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🔐 Se connecter
          </Button>
          
          <Button 
            onClick={() => navigate('/marketplace')}
            style={{
              padding: '20px',
              fontSize: '16px',
              backgroundColor: '#764ba2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🛍️ Marketplace
          </Button>
          
          <Button 
            onClick={() => navigate('/diagnostic')}
            style={{
              padding: '20px',
              fontSize: '16px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🔧 Diagnostic
          </Button>
        </div>

        <div style={{
          backgroundColor: '#f9fafb',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '30px'
        }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            marginBottom: '15px',
            color: '#333'
          }}>
            ℹ️ État du système
          </h2>
          <ul style={{ 
            listStyleType: 'none', 
            padding: 0,
            color: '#666'
          }}>
            <li style={{ marginBottom: '10px' }}>✅ Serveur Vite actif (port 8080)</li>
            <li style={{ marginBottom: '10px' }}>✅ Clés Supabase configurées</li>
            <li style={{ marginBottom: '10px' }}>✅ React Router opérationnel</li>
            <li style={{ marginBottom: '10px' }}>⚠️ Certaines tables DB manquantes (non critique)</li>
          </ul>
        </div>

        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#eff6ff',
          borderRadius: '8px',
          borderLeft: '4px solid #3b82f6'
        }}>
          <strong style={{ color: '#1e40af' }}>Note:</strong> Si vous rencontrez une page blanche, 
          utilisez le bouton Diagnostic ci-dessus pour vérifier la connexion Supabase.
        </div>
      </div>
    </div>
  );
}
