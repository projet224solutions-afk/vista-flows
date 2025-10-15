import { useMemo } from 'react';

export default function LoginGoogle() {
  const backendBase = useMemo(() => {
    const env = (import.meta as unknown).env || {};
    return env.VITE_API_BASE_URL || 'http://localhost:3001';
  }, []);

  const handleLogin = () => {
    const redirect = encodeURIComponent(window.location.origin + '/auth/google/success');
    window.location.href = `${backendBase}/auth/google?redirect=${redirect}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <button onClick={handleLogin} className="px-4 py-2 bg-blue-600 text-white rounded">
        Se connecter avec Google
      </button>
    </div>
  );
}


