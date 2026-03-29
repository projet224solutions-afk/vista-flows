/**
 * Panneau latÃ©ral pour afficher les dÃ©tails de santÃ© d'une fonctionnalitÃ©
 * avec actions de correction automatique
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Zap,
  ExternalLink,
  RefreshCw,
  Activity,
  Clock,
  TrendingUp,
  Database,
} from 'lucide-react';
import { FeatureHealthData } from '@/hooks/useFeatureHealth';
import { motion } from 'framer-motion';

interface FeatureDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: {
    name: string;
    icon: React.ElementType;
    color: string;
    domain: string;
  } | null;
  healthData: FeatureHealthData | null;
  onApplyCorrection: (domain: string) => Promise<void>;
  isApplying?: boolean;
}

export default function FeatureDetailSheet({
  open,
  onOpenChange,
  feature,
  healthData,
  onApplyCorrection,
  isApplying = false,
}: FeatureDetailSheetProps) {
  const navigate = useNavigate();
  const [localApplying, setLocalApplying] = useState(false);

  if (!feature || !healthData) return null;

  const Icon = feature.icon;

  const getStatusBadge = () => {
    switch (healthData.status) {
      case 'CRITICAL':
        return (
          <Badge className="bg-red-600 text-white animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            CRITIQUE
          </Badge>
        );
      case 'WARNING':
        return (
          <Badge className="bg-orange-500 text-white">
            <AlertCircle className="w-3 h-3 mr-1" />
            ATTENTION
          </Badge>
        );
      default:
        return (
          <Badge className="bg-primary-blue-500 text-white">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            OK
          </Badge>
        );
    }
  };

  const getHealthScore = () => {
    if (healthData.status === 'OK') return 100;
    if (healthData.status === 'WARNING') return 70 - healthData.anomalyCount * 5;
    return Math.max(10, 40 - healthData.anomalyCount * 10);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-primary-blue-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleApplyCorrection = async () => {
    setLocalApplying(true);
    try {
      await onApplyCorrection(feature.domain);
    } finally {
      setLocalApplying(false);
    }
  };

  const handleNavigateToModule = () => {
    onOpenChange(false);
    navigate(healthData.route);
  };

  const score = getHealthScore();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[450px] sm:w-[540px] bg-slate-900 border-slate-700 overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: healthData.status === 'CRITICAL' ? [0, 10, -10, 0] : 0 }}
              transition={{ duration: 0.5, repeat: healthData.status === 'CRITICAL' ? Infinity : 0 }}
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${feature.color}30` }}
            >
              <Icon className="w-8 h-8" style={{ color: feature.color }} />
            </motion.div>
            <div>
              <SheetTitle className="text-white text-xl">{feature.name}</SheetTitle>
              <SheetDescription className="text-slate-400">
                Domaine: {feature.domain}
              </SheetDescription>
            </div>
          </div>
          <div className="pt-3">{getStatusBadge()}</div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Score de santÃ© */}
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-300 font-medium">Score de SantÃ©</span>
              <span 
                className="text-2xl font-bold"
                style={{ color: score >= 80 ? '#ff4000' : score >= 50 ? '#f97316' : '#ef4444' }}
              >
                {score}%
              </span>
            </div>
            <Progress value={score} className={`h-3 ${getScoreColor(score)}`} />
          </div>

          {/* Source de donnÃ©es */}
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600 mb-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Database className="w-3 h-3" />
              Source de donnÃ©es
            </div>
            <p className="text-xs font-mono text-primary-blue-400">
              {healthData.dataSource || 'Non dÃ©finie'}
            </p>
          </div>

          {/* MÃ©triques */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                {healthData.metricLabel}
              </div>
              <p className="text-2xl font-bold text-white">
                {healthData.metricValue.toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <AlertTriangle className="w-4 h-4" />
                Anomalies actives
              </div>
              <p 
                className="text-2xl font-bold"
                style={{ color: healthData.anomalyCount > 0 ? '#f97316' : '#ff4000' }}
              >
                {healthData.anomalyCount}
              </p>
            </div>

            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Activity className="w-4 h-4" />
                ActivitÃ© rÃ©cente
              </div>
              <p className="text-2xl font-bold text-primary-blue-400">
                {healthData.recentActivity}%
              </p>
            </div>

            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Clock className="w-4 h-4" />
                DerniÃ¨re vÃ©rif.
              </div>
              <p className="text-sm font-medium text-slate-300">
                {new Date(healthData.lastCheck).toLocaleTimeString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {healthData.anomalyCount > 0 && (
              <Button
                onClick={handleApplyCorrection}
                disabled={localApplying || isApplying}
                className="w-full bg-primary-blue-600 hover:opacity-90 text-white font-semibold"
              >
                {localApplying || isApplying ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {localApplying || isApplying
                  ? 'Correction en cours...'
                  : `Corriger automatiquement (${healthData.anomalyCount})`}
              </Button>
            )}

            <Button
              onClick={handleNavigateToModule}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              AccÃ©der au module {feature.domain}
            </Button>
          </div>

          {/* Conseils */}
          {healthData.status !== 'OK' && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <h4 className="text-orange-400 font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Recommandations
              </h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>â€¢ VÃ©rifier les logs rÃ©cents du module</li>
                <li>â€¢ Appliquer les corrections automatiques</li>
                <li>â€¢ Consulter le tableau de surveillance dÃ©taillÃ©</li>
                {healthData.status === 'CRITICAL' && (
                  <li className="text-red-400">â€¢ âš ï¸ Action immÃ©diate requise</li>
                )}
              </ul>
            </div>
          )}

          {healthData.status === 'OK' && (
            <div className="p-4 bg-primary-blue-500/10 border border-primary-orange-500/30 rounded-lg">
              <h4 className="text-primary-blue-400 font-medium mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                SystÃ¨me sain
              </h4>
              <p className="text-sm text-slate-300">
                Aucune anomalie dÃ©tectÃ©e. Le module {feature.name.toLowerCase()} fonctionne normalement.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
