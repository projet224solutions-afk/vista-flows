import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveJwtToken } from '@/services/session';

export default function AuthGoogleSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      saveJwtToken(token);
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">Connexion en cours…</div>
  );
}


