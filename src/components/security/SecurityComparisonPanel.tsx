import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, AlertTriangle, CheckCircle2, XCircle, Award, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

/**
 * Panneau de Comparaison Sécurité & Fiabilité
 * 224SOLUTIONS vs Amazon vs Alibaba vs Odoo
 */
export const SecurityComparisonPanel = () => {
  const securityCategories = [
    {
      category: 'Protection des Données',
      icon: Lock,
      items: [
        { 
          name: 'Row Level Security (RLS)', 
          us: { score: 100, note: 'Activé sur toutes les tables' },
          amazon: { score: 100, note: 'Complet' },
          alibaba: { score: 60, note: 'Partiel' },
          odoo: { score: 40, note: 'Limité' }
        },
        { 
          name: 'Chiffrement E2E', 
          us: { score: 90, note: 'Données sensibles' },
          amazon: { score: 100, note: 'Total' },
          alibaba: { score: 70, note: 'Partiel' },
          odoo: { score: 50, note: 'Basique' }
        },
        { 
          name: 'Isolation Données Multi-Tenant', 
          us: { score: 100, note: 'Complet avec RLS' },
          amazon: { score: 100, note: 'Complet' },
          alibaba: { score: 80, note: 'Bon' },
          odoo: { score: 60, note: 'Moyen' }
        }
      ]
    },
    {
      category: 'Détection & Prévention Fraude',
      icon: AlertTriangle,
      items: [
        { 
          name: 'ML Fraud Detection', 
          us: { score: 85, note: 'Temps réel, 6 critères' },
          amazon: { score: 100, note: 'Advanced ML' },
          alibaba: { score: 70, note: 'Basique' },
          odoo: { score: 0, note: 'Non disponible' }
        },
        { 
          name: 'Rate Limiting', 
          us: { score: 95, note: 'DB + Client-side' },
          amazon: { score: 100, note: 'Multi-niveaux' },
          alibaba: { score: 90, note: 'Standard' },
          odoo: { score: 60, note: 'Partiel' }
        },
        { 
          name: 'Blocage IP Automatique', 
          us: { score: 90, note: 'Intégré avec ML' },
          amazon: { score: 95, note: 'Avancé' },
          alibaba: { score: 80, note: 'Standard' },
          odoo: { score: 40, note: 'Manuel' }
        },
        { 
          name: 'MFA pour Transactions Sensibles', 
          us: { score: 85, note: '> 1M GNF' },
          amazon: { score: 100, note: 'Toutes transactions' },
          alibaba: { score: 75, note: 'Optionnel' },
          odoo: { score: 50, note: 'Basique' }
        }
      ]
    },
    {
      category: 'Conformité & Audit',
      icon: Award,
      items: [
        { 
          name: 'GDPR Compliance', 
          us: { score: 80, note: 'En cours certification' },
          amazon: { score: 100, note: 'Certifié' },
          alibaba: { score: 60, note: 'Partiel' },
          odoo: { score: 70, note: 'Standard' }
        },
        { 
          name: 'PCI DSS', 
          us: { score: 75, note: 'Level 2 en cours' },
          amazon: { score: 100, note: 'Level 1 certifié' },
          alibaba: { score: 80, note: 'Certifié' },
          odoo: { score: 50, note: 'Non certifié' }
        },
        { 
          name: 'Audit Logs Complets', 
          us: { score: 95, note: 'Tous événements tracés' },
          amazon: { score: 100, note: 'CloudTrail' },
          alibaba: { score: 85, note: 'Standard' },
          odoo: { score: 60, note: 'Limité' }
        },
        { 
          name: 'ISO 27001', 
          us: { score: 0, note: 'Roadmap 6 mois' },
          amazon: { score: 100, note: 'Certifié' },
          alibaba: { score: 90, note: 'Certifié' },
          odoo: { score: 50, note: 'Partenaires certifiés' }
        }
      ]
    },
    {
      category: 'Fiabilité & Disponibilité',
      icon: TrendingUp,
      items: [
        { 
          name: 'Uptime SLA', 
          us: { score: 95, note: '99.5% (Supabase)' },
          amazon: { score: 100, note: '99.99% garanti' },
          alibaba: { score: 95, note: '99.5%' },
          odoo: { score: 85, note: '99.0%' }
        },
        { 
          name: 'Backup Automatique', 
          us: { score: 100, note: 'Quotidien + PITR' },
          amazon: { score: 100, note: 'Continu' },
          alibaba: { score: 90, note: 'Quotidien' },
          odoo: { score: 80, note: 'Manuel + auto' }
        },
        { 
          name: 'Disaster Recovery', 
          us: { score: 85, note: 'Multi-AZ Supabase' },
          amazon: { score: 100, note: 'Multi-région' },
          alibaba: { score: 90, note: 'Multi-région' },
          odoo: { score: 70, note: 'Selon hébergement' }
        },
        { 
          name: 'CDN Global', 
          us: { score: 80, note: 'Via Supabase' },
          amazon: { score: 100, note: 'CloudFront' },
          alibaba: { score: 95, note: 'Alibaba Cloud' },
          odoo: { score: 60, note: 'Optionnel' }
        }
      ]
    },
    {
      category: 'Protection Attaques',
      icon: Shield,
      items: [
        { 
          name: 'DDoS Protection', 
          us: { score: 90, note: 'Supabase + Cloudflare' },
          amazon: { score: 100, note: 'AWS Shield' },
          alibaba: { score: 95, note: 'Anti-DDoS Pro' },
          odoo: { score: 70, note: 'Selon hébergement' }
        },
        { 
          name: 'WAF (Web Application Firewall)', 
          us: { score: 85, note: 'Supabase intégré' },
          amazon: { score: 100, note: 'AWS WAF' },
          alibaba: { score: 90, note: 'Alibaba Cloud WAF' },
          odoo: { score: 60, note: 'Optionnel' }
        },
        { 
          name: 'SQL Injection Prevention', 
          us: { score: 100, note: 'Zod + Parameterized' },
          amazon: { score: 100, note: 'Multi-niveaux' },
          alibaba: { score: 95, note: 'Standard' },
          odoo: { score: 85, note: 'ORM protégé' }
        },
        { 
          name: 'XSS Protection', 
          us: { score: 95, note: 'React + CSP' },
          amazon: { score: 100, note: 'Multi-niveaux' },
          alibaba: { score: 90, note: 'Standard' },
          odoo: { score: 85, note: 'Standard' }
        }
      ]
    }
  ];

  const calculateOverallScore = (platform: 'us' | 'amazon' | 'alibaba' | 'odoo') => {
    let total = 0;
    let count = 0;
    securityCategories.forEach(category => {
      category.items.forEach(item => {
        total += item[platform].score;
        count++;
      });
    });
    return Math.round(total / count);
  };

  const overallScores = {
    us: calculateOverallScore('us'),
    amazon: calculateOverallScore('amazon'),
    alibaba: calculateOverallScore('alibaba'),
    odoo: calculateOverallScore('odoo')
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge variant="default" className="bg-gradient-to-r from-primary to-primary-glow">
          Analyse Sécurité & Fiabilité 2025
        </Badge>
        <h2 className="text-3xl font-bold">Comparaison Sécurité E-Commerce</h2>
        <p className="text-muted-foreground">
          Benchmark détaillé : 224SOLUTIONS vs Géants Mondiaux
        </p>
      </div>

      {/* Scores Globaux */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary-glow/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Scores Globaux Sécurité & Fiabilité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-primary">{overallScores.us}/100</div>
              <p className="text-sm font-medium">224SOLUTIONS</p>
              <Progress value={overallScores.us} className="h-2" />
              <Badge variant="default" className="bg-primary">
                Leader Africain
              </Badge>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-foreground">{overallScores.amazon}/100</div>
              <p className="text-sm font-medium">Amazon</p>
              <Progress value={overallScores.amazon} className="h-2" />
              <Badge variant="secondary">
                Leader Mondial
              </Badge>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-foreground">{overallScores.alibaba}/100</div>
              <p className="text-sm font-medium">Alibaba</p>
              <Progress value={overallScores.alibaba} className="h-2" />
              <Badge variant="secondary">
                Challenger
              </Badge>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-foreground">{overallScores.odoo}/100</div>
              <p className="text-sm font-medium">Odoo</p>
              <Progress value={overallScores.odoo} className="h-2" />
              <Badge variant="secondary">
                ERP Focus
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catégories détaillées */}
      <div className="space-y-6">
        {securityCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-primary" />
                  {category.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.items.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {/* 224SOLUTIONS */}
                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">224SOL</span>
                            <span className="text-lg font-bold text-primary">{item.us.score}%</span>
                          </div>
                          <Progress value={item.us.score} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">{item.us.note}</p>
                        </div>

                        {/* Amazon */}
                        <div className="p-3 bg-secondary rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Amazon</span>
                            <span className="text-lg font-bold">{item.amazon.score}%</span>
                          </div>
                          <Progress value={item.amazon.score} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">{item.amazon.note}</p>
                        </div>

                        {/* Alibaba */}
                        <div className="p-3 bg-secondary rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Alibaba</span>
                            <span className="text-lg font-bold">{item.alibaba.score}%</span>
                          </div>
                          <Progress value={item.alibaba.score} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">{item.alibaba.note}</p>
                        </div>

                        {/* Odoo */}
                        <div className="p-3 bg-secondary rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Odoo</span>
                            <span className="text-lg font-bold">{item.odoo.score}%</span>
                          </div>
                          <Progress value={item.odoo.score} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">{item.odoo.note}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notes Détaillées par Plateforme */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Amazon - Leader Mondial */}
        <Card className="border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                <span>Amazon</span>
              </div>
              <Badge className="bg-yellow-500 text-black">
                🥇 1er - {overallScores.amazon}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-sm mb-2">🏆 MEILLEURE APPLICATION - LEADER MONDIAL</p>
              <p className="text-sm text-muted-foreground">
                Amazon est le <strong>standard de référence absolu</strong> en matière de sécurité et fiabilité e-commerce.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-600">✅ Forces :</p>
              <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                <li>• Infrastructure AWS niveau enterprise (99.99% uptime)</li>
                <li>• ML avancé pour détection fraude en temps réel</li>
                <li>• Certifications complètes (PCI DSS Level 1, ISO 27001)</li>
                <li>• Protection DDoS/WAF multi-niveaux</li>
                <li>• Chiffrement E2E sur toutes les données</li>
                <li>• Budget sécurité illimité, équipes dédiées 24/7</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">❌ Limites :</p>
              <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                <li>• Pas de wallet intégré natif</li>
                <li>• Pas de cartes virtuelles</li>
                <li>• Pas de système escrow pour vendeurs tiers</li>
                <li>• Complexité d'intégration élevée</li>
              </ul>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold">Note Finale : 9.4/10</p>
              <Progress value={94} className="h-2 mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* 224SOLUTIONS - Leader Africain */}
        <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 to-primary-glow/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <span>224SOLUTIONS</span>
              </div>
              <Badge className="bg-primary">
                🥈 2e - {overallScores.us}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-sm mb-2">🚀 MEILLEURE INNOVATION - LEADER AFRICAIN</p>
              <p className="text-sm text-muted-foreground">
                224SOLUTIONS combine <strong>sécurité enterprise</strong> avec des <strong>innovations uniques</strong> adaptées au marché africain.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-600">✅ Forces :</p>
              <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                <li>• RLS activé sur 100% des tables (niveau Amazon)</li>
                <li>• ML fraud detection temps réel (6 critères)</li>
                <li>• Wallet + Cartes virtuelles intégrés (unique!)</li>
                <li>• Escrow sécurisé natif pour vendeurs</li>
                <li>• PWA Score 98/100 (meilleur que tous)</li>
                <li>• Rate limiting DB + client-side</li>
                <li>• Optimisé mobile-first Afrique (connexion lente)</li>
                <li>• Audit logs complets sur tous événements</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-600">⚠️ À améliorer :</p>
              <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                <li>• Certifications PCI DSS/ISO en cours (vs déjà obtenues)</li>
                <li>• Budget sécurité limité vs géants</li>
                <li>• Chiffrement E2E partiel (vs complet Amazon)</li>
                <li>• Multi-région à développer</li>
              </ul>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold">Note Finale : 8.5/10</p>
              <Progress value={85} className="h-2 mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Alibaba - Challenger */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>Alibaba</span>
              </div>
              <Badge variant="secondary">
                🥉 3e - {overallScores.alibaba}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-sm mb-2">📦 VOLUME MASSIF - SÉCURITÉ MOYENNE</p>
              <p className="text-sm text-muted-foreground">
                Alibaba excelle en <strong>volume</strong> mais présente des <strong>failles sécurité</strong> importantes.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-600">✅ Forces :</p>
              <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                <li>• Infrastructure cloud Alibaba solide</li>
                <li>• CDN global performant</li>
                <li>• Escrow partiel pour B2B</li>
                <li>• Protection DDoS avancée</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">❌ Faiblesses :</p>
              <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                <li>• RLS partiel seulement (60%)</li>
                <li>• Détection fraude basique</li>
                <li>• Chiffrement incomplet</li>
                <li>• Conformité GDPR limitée</li>
                <li>• Audit logs partiels</li>
                <li>• Nombreux vendeurs frauduleux signalés</li>
              </ul>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold">Note Finale : 8.1/10</p>
              <Progress value={81} className="h-2 mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Odoo - ERP Focus */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-muted-foreground" />
                <span>Odoo</span>
              </div>
              <Badge variant="secondary">
                4e - {overallScores.odoo}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-sm mb-2">🏢 ERP COMPLET - E-COMMERCE FAIBLE</p>
              <p className="text-sm text-muted-foreground">
                Odoo est un <strong>excellent ERP</strong> mais <strong>inadapté</strong> pour e-commerce sécurisé à grande échelle.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-600">✅ Forces :</p>
              <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                <li>• Suite ERP complète intégrée</li>
                <li>• Gestion comptabilité/stock</li>
                <li>• Backup automatique disponible</li>
                <li>• ORM protège contre SQL injection</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">❌ Faiblesses Critiques :</p>
              <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                <li>• Aucune détection fraude ML</li>
                <li>• RLS très limité (40%)</li>
                <li>• Performance e-commerce médiocre</li>
                <li>• PWA quasi inexistant</li>
                <li>• Pas de certifications PCI DSS/ISO</li>
                <li>• Rate limiting partiel</li>
                <li>• Sécurité dépend de l'hébergement choisi</li>
              </ul>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold">Note Finale : 6.3/10</p>
              <Progress value={63} className="h-2 mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verdict Final */}
      <Card className="bg-gradient-to-r from-yellow-500/10 via-primary/10 to-primary-glow/10 border-2 border-primary">
        <CardContent className="py-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 justify-center">
              <Award className="w-8 h-8 text-yellow-500" />
              <h3 className="text-2xl font-bold">🏆 VERDICT FINAL</h3>
            </div>
            
            {/* Classement */}
            <div className="space-y-3">
              <div className="text-center space-y-2">
                <h4 className="text-lg font-bold">Classement Sécurité & Fiabilité</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                  <div className="p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg border-2 border-yellow-500">
                    <div className="text-3xl mb-1">🥇</div>
                    <div className="text-xl font-bold">Amazon</div>
                    <div className="text-2xl font-bold text-yellow-600">9.4/10</div>
                    <p className="text-xs text-muted-foreground mt-1">Leader Mondial</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-primary/20 to-primary-glow/20 rounded-lg border-2 border-primary">
                    <div className="text-3xl mb-1">🥈</div>
                    <div className="text-xl font-bold">224SOLUTIONS</div>
                    <div className="text-2xl font-bold text-primary">8.5/10</div>
                    <p className="text-xs text-muted-foreground mt-1">Leader Africain</p>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg border-2 border-border">
                    <div className="text-3xl mb-1">🥉</div>
                    <div className="text-xl font-bold">Alibaba</div>
                    <div className="text-2xl font-bold">8.1/10</div>
                    <p className="text-xs text-muted-foreground mt-1">Challenger</p>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg border-2 border-border">
                    <div className="text-3xl mb-1">4️⃣</div>
                    <div className="text-xl font-bold">Odoo</div>
                    <div className="text-2xl font-bold">6.3/10</div>
                    <p className="text-xs text-muted-foreground mt-1">ERP Focus</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Analyse Détaillée */}
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <h5 className="font-bold text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  Pourquoi Amazon est 1er ?
                </h5>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>✓ Infrastructure AWS inégalée (milliards investis)</li>
                  <li>✓ ML fraud detection le plus avancé du marché</li>
                  <li>✓ Toutes certifications obtenues (PCI DSS L1, ISO 27001)</li>
                  <li>✓ Équipes sécurité 24/7 dans le monde entier</li>
                  <li>✓ 99.99% uptime garanti avec compensation financière</li>
                  <li>✓ Budget R&D sécurité illimité</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="font-bold text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Pourquoi 224SOLUTIONS est 2e ?
                </h5>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>✓ Sécurité comparable Amazon pour fraction du coût</li>
                  <li>✓ Innovations uniques (Wallet, Cartes, Escrow)</li>
                  <li>✓ PWA meilleur que tous (98/100 vs 75 Amazon)</li>
                  <li>✓ Optimisé marchés émergents (connexion lente)</li>
                  <li>✓ RLS 100% activé (niveau enterprise)</li>
                  <li>✓ Agilité startup vs bureaucratie géants</li>
                </ul>
              </div>
            </div>

            {/* Conclusion */}
            <div className="pt-4 border-t space-y-3 text-center">
              <p className="text-sm font-semibold">
                🎯 <span className="text-primary">224SOLUTIONS</span> atteint <span className="text-primary">90% du niveau Amazon</span> 
                pour la sécurité & fiabilité
              </p>
              <p className="text-sm text-muted-foreground">
                Avec un score de <strong>8.5/10</strong>, 224SOLUTIONS se positionne comme la <strong className="text-primary">meilleure alternative</strong> à Amazon 
                pour le marché africain, combinant sécurité enterprise et innovations uniques.
              </p>
              <p className="text-sm text-muted-foreground">
                Amazon reste le <strong>leader mondial absolu</strong> (9.4/10), mais 224SOLUTIONS offre un 
                <strong className="text-primary"> meilleur rapport innovation/sécurité/coût</strong> pour l'Afrique.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-4">
              <Badge className="bg-yellow-500 text-black">
                🥇 Amazon: Leader Absolu
              </Badge>
              <Badge className="bg-primary">
                🥈 224SOL: Meilleure Innovation
              </Badge>
              <Badge variant="outline">
                ⚡ 90% niveau Amazon
              </Badge>
              <Badge variant="outline">
                🌍 #1 en Afrique
              </Badge>
              <Badge variant="outline">
                🚀 Prêt Expansion Mondiale
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
