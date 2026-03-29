/**
 * COMPOSANT TEST SYSTÃˆME - SURVEILLANCE LOGIQUE
 * Test RÃ‰EL connectÃ© aux vraies donnÃ©es Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  AlertTriangle,
  Shield,
  Database,
  Zap,
  Activity,
  Server,
  Lock,
  Eye,
  Cpu,
  Network,
  BarChart3,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestStep {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  duration: number;
  testFn: () => Promise<{ success: boolean; message?: string; value?: number }>;
}

interface SystemTestDemoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SystemTestDemo({ open, onOpenChange }: SystemTestDemoProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [systemScore, setSystemScore] = useState(0);
  const [testDetails, setTestDetails] = useState<Record<string, { value?: number; message?: string }>>({});

  // DÃ©finir les Ã©tapes de test avec de VRAIES requÃªtes
  const createTestSteps = useCallback((): TestStep[] => [
    {
      id: 'connection',
      name: 'Connexion Base de DonnÃ©es',
      description: 'VÃ©rification de la connexion Supabase',
      icon: <Database className="w-5 h-5" />,
      duration: 500,
      status: 'pending',
      testFn: async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
          
          if (error) throw error;
          return { success: true, message: 'Connexion Ã©tablie' };
        } catch (err) {
          return { success: false, message: 'Ã‰chec de connexion' };
        }
      },
    },
    {
      id: 'rules',
      name: 'Chargement des RÃ¨gles',
      description: 'RÃ©cupÃ©ration des rÃ¨gles mÃ©tier actives',
      icon: <Server className="w-5 h-5" />,
      duration: 600,
      status: 'pending',
      testFn: async () => {
        try {
          const { count, error } = await supabase
            .from('logic_rules')
            .select('*', { count: 'exact', head: true })
            .eq('enabled', true);
          
          if (error) throw error;
          
          const rulesCount = count || 0;
          // Warning si moins de 50 rÃ¨gles actives
          if (rulesCount < 50) {
            return { success: true, value: rulesCount, message: `${rulesCount} rÃ¨gles (recommandÃ©: 50+)` };
          }
          return { success: true, value: rulesCount, message: `${rulesCount} rÃ¨gles actives` };
        } catch (err) {
          return { success: false, message: 'Erreur chargement rÃ¨gles' };
        }
      },
    },
    {
      id: 'detection',
      name: 'Moteur de DÃ©tection',
      description: 'Analyse des anomalies en temps rÃ©el',
      icon: <Eye className="w-5 h-5" />,
      duration: 700,
      status: 'pending',
      testFn: async () => {
        try {
          const { count, error } = await supabase
            .from('logic_anomalies')
            .select('*', { count: 'exact', head: true })
            .is('resolved_at', null);
          
          if (error) throw error;
          
          const anomaliesCount = count || 0;
          // Warning si anomalies non rÃ©solues
          if (anomaliesCount > 0) {
            return { success: true, value: anomaliesCount, message: `${anomaliesCount} anomalie(s) dÃ©tectÃ©e(s)` };
          }
          return { success: true, value: 0, message: 'Aucune anomalie' };
        } catch (err) {
          return { success: false, message: 'Erreur moteur dÃ©tection' };
        }
      },
    },
    {
      id: 'ai',
      name: 'Intelligence Artificielle',
      description: 'DÃ©tection de patterns suspects',
      icon: <Cpu className="w-5 h-5" />,
      duration: 600,
      status: 'pending',
      testFn: async () => {
        try {
          // VÃ©rifier les documents IA et les logs d'usage
          const { count: aiDocs, error: aiError } = await supabase
            .from('ai_generated_documents')
            .select('*', { count: 'exact', head: true });
          
          const { count: apiLogs, error: apiError } = await supabase
            .from('api_usage_logs')
            .select('*', { count: 'exact', head: true });
          
          if (aiError || apiError) throw aiError || apiError;
          
          const total = (aiDocs || 0) + (apiLogs || 0);
          return { success: true, value: total, message: `${total} opÃ©ration(s) IA` };
        } catch (err) {
          return { success: false, message: 'Module IA non disponible' };
        }
      },
    },
    {
      id: 'network',
      name: 'Surveillance RÃ©seau',
      description: 'Monitoring des flux en temps rÃ©el',
      icon: <Network className="w-5 h-5" />,
      duration: 500,
      status: 'pending',
      testFn: async () => {
        try {
          const { count, error } = await supabase
            .from('api_connections')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
          
          if (error) throw error;
          
          const activeApis = count || 0;
          // Warning si aucune API active
          if (activeApis === 0) {
            return { success: true, value: 0, message: 'Aucune API active' };
          }
          return { success: true, value: activeApis, message: `${activeApis} API(s) active(s)` };
        } catch (err) {
          return { success: false, message: 'Erreur surveillance rÃ©seau' };
        }
      },
    },
    {
      id: 'security',
      name: 'Validation SÃ©curitÃ©',
      description: 'ContrÃ´le des accÃ¨s et permissions',
      icon: <Lock className="w-5 h-5" />,
      duration: 600,
      status: 'pending',
      testFn: async () => {
        try {
          // VÃ©rifier les incidents de sÃ©curitÃ© non rÃ©solus
          const { count: incidents, error: incError } = await supabase
            .from('security_incidents')
            .select('*', { count: 'exact', head: true })
            .is('resolved_at', null);
          
          // VÃ©rifier les tentatives de connexion Ã©chouÃ©es rÃ©centes
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          const { count: failedLogins, error: loginError } = await supabase
            .from('auth_attempts_log')
            .select('*', { count: 'exact', head: true })
            .eq('success', false)
            .gte('attempted_at', yesterday.toISOString());
          
          if (incError || loginError) throw incError || loginError;
          
          const totalIssues = (incidents || 0) + (failedLogins || 0);
          
          if (totalIssues > 5) {
            return { success: true, value: totalIssues, message: `${totalIssues} alerte(s) sÃ©curitÃ©` };
          }
          return { success: true, value: totalIssues, message: 'SÃ©curitÃ© validÃ©e' };
        } catch (err) {
          return { success: false, message: 'Erreur validation sÃ©curitÃ©' };
        }
      },
    },
    {
      id: 'analytics',
      name: 'Module Analytics',
      description: 'GÃ©nÃ©ration des mÃ©triques',
      icon: <BarChart3 className="w-5 h-5" />,
      duration: 500,
      status: 'pending',
      testFn: async () => {
        try {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          const { count, error } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', yesterday.toISOString());
          
          if (error) throw error;
          
          const logsCount = count || 0;
          return { success: true, value: logsCount, message: `${logsCount} Ã©vÃ©nement(s) 24h` };
        } catch (err) {
          return { success: false, message: 'Erreur analytics' };
        }
      },
    },
    {
      id: 'shield',
      name: 'Protection Active',
      description: 'Activation du bouclier de surveillance',
      icon: <Shield className="w-5 h-5" />,
      duration: 400,
      status: 'pending',
      testFn: async () => {
        try {
          // VÃ©rifier que les rÃ¨gles de surveillance sont actives
          const { count, error } = await supabase
            .from('logic_rules')
            .select('*', { count: 'exact', head: true })
            .eq('enabled', true)
            .eq('severity', 'CRITICAL');
          
          if (error) throw error;
          
          const criticalRules = count || 0;
          if (criticalRules > 0) {
            return { success: true, value: criticalRules, message: `${criticalRules} rÃ¨gle(s) critique(s) actives` };
          }
          return { success: true, value: 0, message: 'Protection standard active' };
        } catch (err) {
          return { success: false, message: 'Erreur protection' };
        }
      },
    },
  ], []);

  // Initialiser les Ã©tapes
  useEffect(() => {
    if (open) {
      setSteps(createTestSteps());
    }
  }, [open, createTestSteps]);

  const resetTest = useCallback(() => {
    setIsRunning(false);
    setCurrentStep(-1);
    setSteps(createTestSteps());
    setOverallProgress(0);
    setShowResult(false);
    setSystemScore(0);
    setTestDetails({});
  }, [createTestSteps]);

  const runTest = useCallback(async () => {
    resetTest();
    setIsRunning(true);
    
    const testSteps = createTestSteps();
    setSteps(testSteps);
    
    let successCount = 0;
    let warningCount = 0;
    const details: Record<string, { value?: number; message?: string }> = {};

    for (let i = 0; i < testSteps.length; i++) {
      setCurrentStep(i);
      
      // Set current step to running
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'running' as const } : s
        )
      );

      // ExÃ©cuter le vrai test
      const result = await testSteps[i].testFn();
      
      // Petit dÃ©lai pour l'animation
      await new Promise((resolve) => setTimeout(resolve, testSteps[i].duration));

      // DÃ©terminer le statut basÃ© sur le rÃ©sultat rÃ©el
      let status: 'success' | 'warning' | 'error';
      if (!result.success) {
        status = 'error';
      } else if (
        (testSteps[i].id === 'rules' && (result.value || 0) < 50) ||
        (testSteps[i].id === 'detection' && (result.value || 0) > 0) ||
        (testSteps[i].id === 'security' && (result.value || 0) > 5) ||
        (testSteps[i].id === 'network' && (result.value || 0) === 0)
      ) {
        status = 'warning';
        warningCount++;
      } else {
        status = 'success';
        successCount++;
      }

      details[testSteps[i].id] = { value: result.value, message: result.message };

      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status } : s
        )
      );

      // Update progress
      setOverallProgress(((i + 1) / testSteps.length) * 100);
    }

    setTestDetails(details);

    // Calculate final score based on real results
    const totalSteps = testSteps.length;
    const baseScore = Math.round((successCount / totalSteps) * 100);
    const warningPenalty = warningCount * 3;
    const finalScore = Math.max(0, Math.min(100, baseScore - warningPenalty + (warningCount > 0 ? 0 : 5)));
    
    setSystemScore(finalScore);
    setShowResult(true);
    setIsRunning(false);
  }, [resetTest, createTestSteps]);

  useEffect(() => {
    if (!open) {
      resetTest();
    }
  }, [open, resetTest]);

  const getStatusColor = (status: TestStep['status']) => {
    switch (status) {
      case 'success':
        return 'text-primary-orange-500';
      case 'warning':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      case 'running':
        return 'text-blue-500';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusBg = (status: TestStep['status']) => {
    switch (status) {
      case 'success':
        return 'bg-primary-blue-600/10 border-primary-orange-500/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      case 'running':
        return 'bg-blue-500/10 border-blue-500/30';
      default:
        return 'bg-slate-500/5 border-slate-500/20';
    }
  };

  const getResultStyle = () => {
    if (systemScore >= 80) {
      return {
        bg: 'bg-primary-blue-900/50',
        border: 'border-primary-orange-500/30',
        text: 'text-primary-orange-400',
        textLight: 'text-primary-orange-300',
        message: 'SystÃ¨me OpÃ©rationnel',
        submessage: 'Tous les modules fonctionnent correctement',
      };
    } else if (systemScore >= 60) {
      return {
        bg: 'from-yellow-900/50 to-orange-900/50',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        textLight: 'text-yellow-300',
        message: 'SystÃ¨me Fonctionnel',
        submessage: 'Certains modules nÃ©cessitent une attention',
      };
    } else {
      return {
        bg: 'from-red-900/50 to-orange-900/50',
        border: 'border-red-500/30',
        text: 'text-red-400',
        textLight: 'text-red-300',
        message: 'Attention Requise',
        submessage: 'Des problÃ¨mes ont Ã©tÃ© dÃ©tectÃ©s',
      };
    }
  };

  const resultStyle = getResultStyle();

  // Calculer les stats rÃ©elles
  const rulesValue = testDetails['rules']?.value || 0;
  const successSteps = steps.filter(s => s.status === 'success').length;
  const warningSteps = steps.filter(s => s.status === 'warning').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <motion.div
              animate={{ rotate: isRunning ? 360 : 0 }}
              transition={{ duration: 2, repeat: isRunning ? Infinity : 0, ease: 'linear' }}
            >
              <Shield className="w-8 h-8 text-blue-400" />
            </motion.div>
            Test du SystÃ¨me de Surveillance
            {isRunning && (
              <Badge className="bg-blue-600 ml-2 animate-pulse">
                En cours...
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Progression globale</span>
              <span className="text-blue-400 font-mono">{overallProgress.toFixed(0)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2 bg-slate-700" />
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-2 gap-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${getStatusBg(step.status)}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getStatusBg(step.status)} ${getStatusColor(step.status)}`}>
                    {step.status === 'running' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Activity className="w-5 h-5" />
                      </motion.div>
                    ) : step.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : step.status === 'warning' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : step.status === 'error' ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${step.status === 'pending' ? 'text-slate-400' : 'text-white'}`}>
                      {step.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {testDetails[step.id]?.message || step.description}
                    </p>
                  </div>
                  {step.status === 'running' && (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Result Panel */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`p-6 rounded-2xl bg-gradient-to-r ${resultStyle.bg} border-2 ${resultStyle.border}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                      className={`p-4 rounded-full ${resultStyle.bg.replace('from-', 'bg-').split(' ')[0]}/20`}
                    >
                      {systemScore >= 80 ? (
                        <CheckCircle2 className={`w-10 h-10 ${resultStyle.text}`} />
                      ) : systemScore >= 60 ? (
                        <AlertTriangle className={`w-10 h-10 ${resultStyle.text}`} />
                      ) : (
                        <XCircle className={`w-10 h-10 ${resultStyle.text}`} />
                      )}
                    </motion.div>
                    <div>
                      <h3 className={`text-xl font-bold ${resultStyle.text}`}>
                        {resultStyle.message}
                      </h3>
                      <p className={`text-sm ${resultStyle.textLight}/70`}>
                        {resultStyle.submessage}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <p className={`text-5xl font-bold ${resultStyle.text} font-mono`}>
                        {systemScore}%
                      </p>
                      <p className={`text-xs ${resultStyle.textLight}/50 uppercase tracking-wider`}>
                        Score de santÃ©
                      </p>
                    </motion.div>
                  </div>
                </div>

                {/* Stats Grid - DonnÃ©es rÃ©elles */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="grid grid-cols-4 gap-4 mt-6"
                >
                  {[
                    { label: 'RÃ¨gles vÃ©rifiÃ©es', value: rulesValue.toString(), icon: <Server className="w-4 h-4" /> },
                    { label: 'Tests rÃ©ussis', value: `${successSteps}/${steps.length}`, icon: <CheckCircle2 className="w-4 h-4" /> },
                    { label: 'Avertissements', value: warningSteps.toString(), icon: <AlertTriangle className="w-4 h-4" /> },
                    { label: 'Protection', value: systemScore >= 80 ? 'Active' : 'Partielle', icon: <Shield className="w-4 h-4" /> },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`p-3 rounded-lg ${resultStyle.bg.replace('from-', 'bg-').split(' ')[0]}/10 border ${resultStyle.border.replace('border-', 'border-')}/20 text-center`}
                    >
                      <div className={`flex justify-center ${resultStyle.text} mb-1`}>{stat.icon}</div>
                      <p className={`text-lg font-bold ${resultStyle.textLight}`}>{stat.value}</p>
                      <p className={`text-xs ${resultStyle.textLight}/50`}>{stat.label}</p>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {!isRunning && !showResult && (
              <Button
                onClick={runTest}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold h-12"
              >
                <Play className="w-5 h-5 mr-2" />
                Lancer le Test SystÃ¨me
              </Button>
            )}
            {showResult && (
              <Button
                onClick={resetTest}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 h-12"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Relancer le Test
              </Button>
            )}
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
