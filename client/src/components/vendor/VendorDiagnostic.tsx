/**
 * DIAGNOSTIC ET RÉPARATION VENDEUR
 * Système de diagnostic automatique pour l'interface vendeur
 * 224Solutions - Vendor Diagnostic System
 */

import React, { useState, useEffect } from 'react';
import { getErrorMessage, logError } from '@/lib/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Settings,
    Database,
    User,
    Wallet,
    Package,
    ShoppingCart,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticResult {
    test: string;
    status: 'success' | 'error' | 'warning';
    message: string;
    details?: string;
    fix?: string;
}

interface VendorDiagnosticProps {
    onComplete?: (results: DiagnosticResult[]) => void;
}

export default function VendorDiagnostic({ onComplete }: VendorDiagnosticProps) {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<DiagnosticResult[]>([]);
    const [isFixing, setIsFixing] = useState(false);

    // Tests de diagnostic
    const diagnosticTests = [
        {
            name: 'Authentification utilisateur',
            test: async () => {
                if (!user) {
                    throw new Error('Utilisateur non authentifié');
                }
                return { status: 'success', message: 'Utilisateur authentifié' };
            }
        },
        {
            name: 'Profil vendeur',
            test: async () => {
                if (!user) throw new Error('Utilisateur non authentifié');

                const { data: vendor, error } = await supabase
                    .from('vendors')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error || !vendor) {
                    throw new Error('Profil vendeur non trouvé');
                }
                return { status: 'success', message: 'Profil vendeur trouvé' };
            }
        },
        {
            name: 'Wallet utilisateur',
            test: async () => {
                if (!user) throw new Error('Utilisateur non authentifié');

                const { data: wallet, error } = await supabase
                    .from('wallets')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error || !wallet) {
                    throw new Error('Wallet non trouvé');
                }
                return { status: 'success', message: 'Wallet trouvé' };
            }
        },
        {
            name: 'Tables de base de données',
            test: async () => {
                const tables = ['vendors', 'products', 'orders', 'wallets', 'transactions'];
                const results = [];

                for (const table of tables) {
<<<<<<< HEAD:src/components/vendor/VendorDiagnostic.tsx
                    const { error } = await supabase
                        .from(table as any)
                        .select('id')
                        .limit(1);
=======
                    try {
                        const { error } = await supabase
                            .from(table as any)
                            .select('id')
                            .limit(1);
>>>>>>> 33b42bafcc846916b3f76992c9af5e7e0240830e:client/src/components/vendor/VendorDiagnostic.tsx

                        if (error) {
                            results.push({ table, error: getErrorMessage(error) });
                        }
                    } catch (err) {
                        results.push({ table, error: 'Erreur accès table' });
                    }
                }

                if (results.length > 0) {
                    throw new Error(`Tables manquantes: ${results.map(r => r.table).join(', ')}`);
                }
                return { status: 'success', message: 'Toutes les tables sont accessibles' };
            }
        },
        {
            name: 'Permissions utilisateur',
            test: async () => {
                if (!user) throw new Error('Utilisateur non authentifié');

                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (error || !profile) {
                    throw new Error('Profil utilisateur non trouvé');
                }

                if (!['vendeur', 'admin', 'pdg'].includes(profile.role)) {
                    throw new Error('Rôle insuffisant pour accéder à l\'interface vendeur');
                }

                return { status: 'success', message: `Rôle valide: ${profile.role}` };
            }
        }
    ];

    // Lancer le diagnostic
    const runDiagnostic = async () => {
        setIsRunning(true);
        setProgress(0);
        setResults([]);

        const testResults: DiagnosticResult[] = [];

        for (let i = 0; i < diagnosticTests.length; i++) {
            const test = diagnosticTests[i];
            setProgress((i / diagnosticTests.length) * 100);

            try {
                const result = await test.test();
                testResults.push({
                    test: test.name,
                    status: 'success',
                    message: result.message
                });
            } catch (error) {
                logError(error, test.name);
                testResults.push({
                    test: test.name,
                    status: 'error',
                    message: getErrorMessage(error),
                    details: undefined,
                    fix: getFixSuggestion(test.name, getErrorMessage(error))
                });
            }
        }

        setProgress(100);
        setResults(testResults);
        setIsRunning(false);
        onComplete?.(testResults);
    };

    // Suggestions de réparation
    const getFixSuggestion = (testName: string, error: string): string => {
        switch (testName) {
            case 'Profil vendeur':
                return 'Créer un profil vendeur pour cet utilisateur';
            case 'Wallet utilisateur':
                return 'Créer un wallet pour cet utilisateur';
            case 'Tables de base de données':
                return 'Vérifier la configuration Supabase et les permissions';
            case 'Permissions utilisateur':
                return 'Mettre à jour le rôle utilisateur dans la table profiles';
            default:
                return 'Contacter le support technique';
        }
    };

    // Réparer automatiquement
    const autoFix = async () => {
        setIsFixing(true);
        const fixes = [];

        try {
            // Créer le profil vendeur si manquant
            if (!results.find(r => r.test === 'Profil vendeur' && r.status === 'success')) {
                if (user) {
                    const { error } = await supabase
                        .from('vendors')
                        .insert({
                            user_id: user.id,
<<<<<<< HEAD:src/components/vendor/VendorDiagnostic.tsx
                            business_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Entreprise',
=======
                            business_name: 'Mon Entreprise',
>>>>>>> 33b42bafcc846916b3f76992c9af5e7e0240830e:client/src/components/vendor/VendorDiagnostic.tsx
                            business_type: 'retail',
                            status: 'active'
                        });

                    if (!error) {
                        fixes.push('Profil vendeur créé');
                    }
                }
            }

            // Créer le wallet si manquant
            if (!results.find(r => r.test === 'Wallet utilisateur' && r.status === 'success')) {
                if (user) {
                    const { error } = await supabase
                        .from('wallets')
                        .insert({
                            user_id: user.id,
                            balance: 0,
                            currency: 'GNF'
                        });

                    if (!error) {
                        fixes.push('Wallet créé');
                    }
                }
            }

            // Mettre à jour le rôle si nécessaire
            if (!results.find(r => r.test === 'Permissions utilisateur' && r.status === 'success')) {
                if (user) {
                    const { error } = await supabase
                        .from('profiles')
                        .update({ role: 'vendeur' })
                        .eq('id', user.id);

                    if (!error) {
                        fixes.push('Rôle utilisateur mis à jour');
                    }
                }
            }

            if (fixes.length > 0) {
                toast({
                    title: "Réparation réussie",
                    description: `Corrections appliquées: ${fixes.join(', ')}`,
                });

                // Relancer le diagnostic
                setTimeout(() => {
                    runDiagnostic();
                }, 1000);
            } else {
                toast({
                    title: "Aucune réparation nécessaire",
                    description: "Tous les tests sont déjà passés",
                });
            }
        } catch (error) {
            toast({
                title: "Erreur lors de la réparation",
                description: getErrorMessage(error),
                variant: "destructive",
            });
        } finally {
            setIsFixing(false);
        }
    };

    // Obtenir l'icône de statut
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'error':
                return <XCircle className="w-5 h-5 text-red-600" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
            default:
                return null;
        }
    };

    // Obtenir la couleur du badge
    const getBadgeColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'bg-green-100 text-green-800';
            case 'error':
                return 'bg-red-100 text-red-800';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Diagnostic Interface Vendeur
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Button
                            onClick={runDiagnostic}
                            disabled={isRunning}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Diagnostic en cours...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Lancer le diagnostic
                                </>
                            )}
                        </Button>

                        {results.length > 0 && (
                            <Button
                                onClick={autoFix}
                                disabled={isFixing}
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-50"
                            >
                                {isFixing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Réparation...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Réparer automatiquement
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    {isRunning && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progression du diagnostic</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="w-full" />
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-semibold">Résultats du diagnostic</h3>
                            {results.map((result, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                                    {getStatusIcon(result.status)}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium">{result.test}</span>
                                            <Badge className={getBadgeColor(result.status)}>
                                                {result.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600">{result.message}</p>
                                        {result.details && (
                                            <details className="mt-2">
                                                <summary className="text-xs text-gray-500 cursor-pointer">
                                                    Détails techniques
                                                </summary>
                                                <pre className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                                                    {result.details}
                                                </pre>
                                            </details>
                                        )}
                                        {result.fix && (
                                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                                <strong>💡 Suggestion:</strong> {result.fix}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {results.length > 0 && results.every(r => r.status === 'success') && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                                ✅ Tous les tests sont passés ! L'interface vendeur devrait fonctionner correctement.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
