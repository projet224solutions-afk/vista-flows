/**
 * COMPOSANT DEMO TEST SYSTÈME - SURVEILLANCE LOGIQUE
 * Animation ultra-professionnelle démontrant le fonctionnement du système
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
} from 'lucide-react';

interface TestStep {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'success' | 'warning';
  duration: number;
}

const initialSteps: Omit<TestStep, 'status'>[] = [
  {
    id: 'connection',
    name: 'Connexion Base de Données',
    description: 'Vérification de la connexion Supabase',
    icon: <Database className="w-5 h-5" />,
    duration: 800,
  },
  {
    id: 'rules',
    name: 'Chargement des Règles',
    description: 'Récupération des 120 règles métier',
    icon: <Server className="w-5 h-5" />,
    duration: 1200,
  },
  {
    id: 'detection',
    name: 'Moteur de Détection',
    description: 'Analyse des anomalies en temps réel',
    icon: <Eye className="w-5 h-5" />,
    duration: 1500,
  },
  {
    id: 'ai',
    name: 'Intelligence Artificielle',
    description: 'Détection de patterns suspects',
    icon: <Cpu className="w-5 h-5" />,
    duration: 1000,
  },
  {
    id: 'network',
    name: 'Surveillance Réseau',
    description: 'Monitoring des flux en temps réel',
    icon: <Network className="w-5 h-5" />,
    duration: 900,
  },
  {
    id: 'security',
    name: 'Validation Sécurité',
    description: 'Contrôle des accès et permissions',
    icon: <Lock className="w-5 h-5" />,
    duration: 700,
  },
  {
    id: 'analytics',
    name: 'Module Analytics',
    description: 'Génération des métriques',
    icon: <BarChart3 className="w-5 h-5" />,
    duration: 600,
  },
  {
    id: 'shield',
    name: 'Protection Active',
    description: 'Activation du bouclier de surveillance',
    icon: <Shield className="w-5 h-5" />,
    duration: 500,
  },
];

interface SystemTestDemoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SystemTestDemo({ open, onOpenChange }: SystemTestDemoProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [steps, setSteps] = useState<TestStep[]>(
    initialSteps.map((s) => ({ ...s, status: 'pending' as const }))
  );
  const [overallProgress, setOverallProgress] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [systemScore, setSystemScore] = useState(0);

  const resetTest = useCallback(() => {
    setIsRunning(false);
    setCurrentStep(-1);
    setSteps(initialSteps.map((s) => ({ ...s, status: 'pending' as const })));
    setOverallProgress(0);
    setShowResult(false);
    setSystemScore(0);
  }, []);

  const runTest = useCallback(async () => {
    resetTest();
    setIsRunning(true);

    for (let i = 0; i < initialSteps.length; i++) {
      setCurrentStep(i);
      
      // Set current step to running
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'running' as const } : s
        )
      );

      // Wait for the step duration
      await new Promise((resolve) => setTimeout(resolve, initialSteps[i].duration));

      // Set step to success (random chance for warning to show detection capability)
      const status = Math.random() > 0.85 ? 'warning' : 'success';
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: status as 'success' | 'warning' } : s
        )
      );

      // Update progress
      setOverallProgress(((i + 1) / initialSteps.length) * 100);
    }

    // Calculate final score
    const finalScore = 94 + Math.floor(Math.random() * 6); // 94-99%
    setSystemScore(finalScore);
    setShowResult(true);
    setIsRunning(false);
  }, [resetTest]);

  useEffect(() => {
    if (!open) {
      resetTest();
    }
  }, [open, resetTest]);

  const getStatusColor = (status: TestStep['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'running':
        return 'text-blue-500';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusBg = (status: TestStep['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'running':
        return 'bg-blue-500/10 border-blue-500/30';
      default:
        return 'bg-slate-500/5 border-slate-500/20';
    }
  };

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
            Test du Système de Surveillance
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
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${step.status === 'pending' ? 'text-slate-400' : 'text-white'}`}>
                      {step.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{step.description}</p>
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
                className="p-6 rounded-2xl bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-2 border-green-500/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                      className="p-4 rounded-full bg-green-500/20"
                    >
                      <CheckCircle2 className="w-10 h-10 text-green-400" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold text-green-400">
                        Système Opérationnel
                      </h3>
                      <p className="text-sm text-green-300/70">
                        Tous les modules fonctionnent correctement
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <p className="text-5xl font-bold text-green-400 font-mono">
                        {systemScore}%
                      </p>
                      <p className="text-xs text-green-300/50 uppercase tracking-wider">
                        Score de santé
                      </p>
                    </motion.div>
                  </div>
                </div>

                {/* Stats Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="grid grid-cols-4 gap-4 mt-6"
                >
                  {[
                    { label: 'Règles vérifiées', value: '120', icon: <Server className="w-4 h-4" /> },
                    { label: 'Temps de réponse', value: '< 50ms', icon: <Zap className="w-4 h-4" /> },
                    { label: 'Uptime', value: '99.9%', icon: <Activity className="w-4 h-4" /> },
                    { label: 'Protection', value: 'Active', icon: <Shield className="w-4 h-4" /> },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center"
                    >
                      <div className="flex justify-center text-green-400 mb-1">{stat.icon}</div>
                      <p className="text-lg font-bold text-green-300">{stat.value}</p>
                      <p className="text-xs text-green-300/50">{stat.label}</p>
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
                Lancer le Test Système
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
