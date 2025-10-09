import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Crown, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function PDGTest() {
    const { user, profile, loading } = useAuth();
    const navigate = useNavigate();
    const [pdgAuth, setPdgAuth] = useState<any>(null);
    const [debugInfo, setDebugInfo] = useState<any>({});

    useEffect(() => {
        // Récupérer les infos d'auth PDG
        const pdgAuthData = sessionStorage.getItem("pdg_auth");
        if (pdgAuthData) {
            try {
                const authInfo = JSON.parse(pdgAuthData);
                setPdgAuth(authInfo);
            } catch (error) {
                console.error("Erreur parsing PDG auth:", error);
            }
        }

        // Collecter les infos de debug
        setDebugInfo({
            hasUser: !!user,
            userId: user?.id,
            userEmail: user?.email,
            hasProfile: !!profile,
            profileRole: profile?.role,
            loading,
            pdgAuthExists: !!pdgAuthData,
            sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
                acc[key] = sessionStorage.getItem(key);
                return acc;
            }, {} as any)
        });
    }, [user, profile, loading]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="border-2 border-purple-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Crown className="w-6 h-6 text-purple-600" />
                            Test Interface PDG - Diagnostic
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Statut Authentification PDG */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className={`border-2 ${pdgAuth ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        {pdgAuth ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                                        Authentification PDG
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {pdgAuth ? (
                                        <div className="space-y-2">
                                            <Badge variant="default" className="bg-green-600">ACTIVE</Badge>
                                            <p><strong>Code:</strong> {pdgAuth.userCode}</p>
                                            <p><strong>Nom:</strong> {pdgAuth.name}</p>
                                            <p><strong>Niveau:</strong> {pdgAuth.level}</p>
                                            <p><strong>Timestamp:</strong> {new Date(pdgAuth.timestamp).toLocaleString()}</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <Badge variant="destructive">INACTIVE</Badge>
                                            <p className="text-sm text-red-600 mt-2">Aucune authentification PDG trouvée</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className={`border-2 ${user ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        {user ? <CheckCircle className="w-5 h-5 text-blue-600" /> : <XCircle className="w-5 h-5 text-gray-600" />}
                                        Authentification Supabase
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {user ? (
                                        <div className="space-y-2">
                                            <Badge variant="default" className="bg-blue-600">CONNECTÉ</Badge>
                                            <p><strong>ID:</strong> {user.id}</p>
                                            <p><strong>Email:</strong> {user.email}</p>
                                            <p><strong>Rôle Profile:</strong> {profile?.role || 'Non défini'}</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <Badge variant="secondary">DÉCONNECTÉ</Badge>
                                            <p className="text-sm text-gray-600 mt-2">Aucun utilisateur Supabase connecté</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-4">
                            <Button
                                onClick={() => navigate('/auth')}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <Crown className="w-4 h-4" />
                                Retour Authentification
                            </Button>

                            <Button
                                onClick={() => navigate('/pdg-advanced')}
                                disabled={!pdgAuth}
                                className="flex items-center gap-2"
                            >
                                <Crown className="w-4 h-4" />
                                Interface PDG Avancée
                            </Button>

                            <Button
                                onClick={() => {
                                    sessionStorage.clear();
                                    window.location.reload();
                                }}
                                variant="destructive"
                            >
                                Vider Session & Recharger
                            </Button>
                        </div>

                        {/* Debug Info */}
                        <Card className="border border-gray-300">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                                    Informations de Debug
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                                    {JSON.stringify(debugInfo, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
