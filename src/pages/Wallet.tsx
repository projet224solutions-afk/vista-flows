import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import UniversalWalletTransactions from '@/components/wallet/UniversalWalletTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet as WalletIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Wallet() {
  const { user, profileLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Rediriger vers auth si pas connecté
    if (!user && !profileLoading) {
      navigate('/auth');
    }
  }, [user, profileLoading, navigate]);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <WalletIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Mon Wallet</h1>
                <p className="text-sm text-muted-foreground">
                  Gérez vos transactions et votre solde
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <UniversalWalletTransactions />
      </div>
    </div>
  );
}
