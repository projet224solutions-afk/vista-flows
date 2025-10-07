import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function AuthTest() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult("Test de connexion à Supabase...");
    
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        setResult(`❌ Erreur: ${error.message}`);
      } else {
        setResult(`✅ Connexion réussie à Supabase!`);
      }
    } catch (err) {
      setResult(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    setLoading(false);
  };

  const testSignUp = async () => {
    setLoading(true);
    setResult("Test d'inscription...");
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: "Test",
            last_name: "User",
            role: "client"
          }
        }
      });
      
      if (error) {
        setResult(`❌ Erreur d'inscription: ${error.message}`);
      } else {
        setResult(`✅ Inscription réussie! User ID: ${data.user?.id}`);
      }
    } catch (err) {
      setResult(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    setLoading(false);
  };

  const testSignIn = async () => {
    setLoading(true);
    setResult("Test de connexion...");
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        setResult(`❌ Erreur de connexion: ${error.message}`);
      } else {
        setResult(`✅ Connexion réussie! User: ${data.user?.email}`);
      }
    } catch (err) {
      setResult(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>🔍 Test Authentification Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">URL Supabase:</p>
            <code className="block p-2 bg-gray-100 rounded text-xs">
              {import.meta.env.VITE_SUPABASE_URL || "❌ Non défini"}
            </code>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 mb-2">Clé Supabase:</p>
            <code className="block p-2 bg-gray-100 rounded text-xs">
              {import.meta.env.VITE_SUPABASE_ANON_KEY ? 
                `✅ ${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 30)}...` : 
                "❌ Non défini"}
            </code>
          </div>

          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={testConnection} disabled={loading}>
              Test Connexion DB
            </Button>
            <Button onClick={testSignUp} disabled={loading}>
              Test Inscription
            </Button>
            <Button onClick={testSignIn} disabled={loading}>
              Test Connexion
            </Button>
          </div>

          {result && (
            <div className={`p-4 rounded ${result.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
