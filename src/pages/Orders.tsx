import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ClientOrdersList from "@/components/client/ClientOrdersList";

export default function Orders() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const subtitle = useMemo(() => {
    if (!profile?.role) return "Suivez et consultez vos commandes.";
    if (profile.role === "vendeur") return "Commandes passées depuis votre compte.";
    return "Suivez et consultez vos commandes.";
  }, [profile?.role]);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-6xl p-4 sm:p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Mes commandes</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </header>

        {!user ? (
          <Card>
            <CardHeader>
              <CardTitle>Connexion requise</CardTitle>
              <CardDescription>Connectez-vous pour voir vos commandes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => navigate("/auth")}>Se connecter</Button>
              <Button variant="outline" onClick={() => navigate("/marketplace")}>Retour marketplace</Button>
            </CardContent>
          </Card>
        ) : (
          <ClientOrdersList />
        )}
      </section>
    </main>
  );
}
