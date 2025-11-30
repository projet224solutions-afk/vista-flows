import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TestPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0f0f0',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#6366f1',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          ✅ Page de test - Ça marche !
        </h1>
        
        <p style={{
          fontSize: '18px',
          color: '#666',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          Si vous voyez cette page, React fonctionne correctement
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <Button 
            onClick={() => navigate('/')}
            style={{ width: '100%' }}
          >
            🏠 Retour à l'accueil
          </Button>
          
          <Button 
            onClick={() => navigate('/auth')}
            variant="outline"
            style={{ width: '100%' }}
          >
            🔐 Page de connexion
          </Button>
        </div>

        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          border: '2px solid #86efac'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#16a34a',
            marginBottom: '10px'
          }}>
            Tests système:
          </h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>✅ React fonctionne</li>
            <li>✅ React Router fonctionne</li>
            <li>✅ Composants UI fonctionnent</li>
            <li>✅ Navigation fonctionne</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
