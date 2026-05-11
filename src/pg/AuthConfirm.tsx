import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

type Status = 'verifying' | 'success' | 'error';

export default function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type') as 'email' | 'signup' | null;

    if (!tokenHash) {
      setStatus('error');
      setErrorMessage('Lien de confirmation invalide ou expiré.');
      return;
    }

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: type === 'email' ? 'email' : 'signup' })
      .then(({ error }) => {
        if (error) {
          setStatus('error');
          setErrorMessage(error.message || 'Le lien est invalide ou a expiré.');
        } else {
          setStatus('success');
          setTimeout(() => navigate('/home', { replace: true }), 2500);
        }
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h1 className="text-xl font-semibold">Vérification en cours…</h1>
            <p className="text-muted-foreground text-sm">Nous confirmons votre adresse email.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <h1 className="text-xl font-semibold">Email confirmé !</h1>
            <p className="text-muted-foreground text-sm">
              Votre compte est activé. Vous allez être redirigé…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-14 h-14 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Lien invalide</h1>
            <p className="text-muted-foreground text-sm">{errorMessage}</p>
            <button
              onClick={() => navigate('/auth', { replace: true })}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Retour à la connexion
            </button>
          </>
        )}
      </div>
    </div>
  );
}
