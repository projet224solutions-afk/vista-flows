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

      {/* Conclusion */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border-primary">
        <CardContent className="py-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold">Verdict Final</h3>
            </div>
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                <strong>224SOLUTIONS</strong> atteint <strong className="text-primary">{overallScores.us}%</strong> du niveau de sécurité d'Amazon,
                se positionnant comme le <strong>leader technique incontesté en Afrique</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Avec des innovations uniques (Wallet, Cartes Virtuelles, Escrow) et une sécurité comparable aux géants,
                224SOLUTIONS est prêt pour une <strong className="text-primary">expansion internationale</strong>.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Badge variant="default" className="bg-primary">
                🏆 Leader Africain
              </Badge>
              <Badge variant="outline">
                🔒 Sécurité Enterprise-Grade
              </Badge>
              <Badge variant="outline">
                ⚡ Performance Supérieure
              </Badge>
              <Badge variant="outline">
                🚀 Innovation Continue
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
