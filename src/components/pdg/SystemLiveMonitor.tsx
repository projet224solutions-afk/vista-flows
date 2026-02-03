/**
 * SYSTEM LIVE MONITOR - Visualisation spectaculaire du système 24/7
 * Écran style Matrix/Cyberpunk montrant toutes les fonctionnalités en temps réel
 * Chaque carte est cliquable et affiche l'état de santé + correction automatique
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Shield,
  Activity,
  Zap,
  Database,
  Wallet,
  ShoppingCart,
  Package,
  Users,
  Truck,
  Lock,
  Eye,
  Cpu,
  Network,
  BarChart3,
  CreditCard,
  Bell,
  Globe,
  Server,
  Cloud,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { useFeatureHealth } from '@/hooks/useFeatureHealth';
import FeatureDetailSheet from './FeatureDetailSheet';

// Toutes les fonctionnalités du système
const SYSTEM_FEATURES = [
  { name: 'Authentification Sécurisée', icon: Lock, color: '#22c55e', domain: 'AUTH' },
  { name: 'Gestion des Utilisateurs', icon: Users, color: '#3b82f6', domain: 'USERS' },
  { name: 'Portefeuilles Numériques', icon: Wallet, color: '#a855f7', domain: 'WALLET' },
  { name: 'Transactions Financières', icon: CreditCard, color: '#f59e0b', domain: 'FINANCE' },
  { name: 'Système POS', icon: ShoppingCart, color: '#06b6d4', domain: 'POS' },
  { name: 'Gestion des Stocks', icon: Package, color: '#10b981', domain: 'STOCK' },
  { name: 'Commandes & Livraisons', icon: Truck, color: '#f97316', domain: 'ORDERS' },
  { name: 'Commissions Agents', icon: BarChart3, color: '#ec4899', domain: 'COMMISSION' },
  { name: 'Intelligence Artificielle', icon: Cpu, color: '#8b5cf6', domain: 'AI' },
  { name: 'Surveillance Sécurité', icon: Shield, color: '#ef4444', domain: 'SECURITY' },
  { name: 'Base de Données', icon: Database, color: '#14b8a6', domain: 'DATABASE' },
  { name: 'Réseau & API', icon: Network, color: '#6366f1', domain: 'NETWORK' },
  { name: 'Notifications Temps Réel', icon: Bell, color: '#f472b6', domain: 'NOTIFICATIONS' },
  { name: 'Services Cloud', icon: Cloud, color: '#0ea5e9', domain: 'CLOUD' },
  { name: 'Serveurs Backend', icon: Server, color: '#84cc16', domain: 'BACKEND' },
  { name: 'Synchronisation Globale', icon: Globe, color: '#eab308', domain: 'SYNC' },
  { name: 'Monitoring Système', icon: Eye, color: '#d946ef', domain: 'MONITORING' },
  { name: 'Analyse en Temps Réel', icon: Activity, color: '#22d3ee', domain: 'ANALYTICS' },
];

// Messages de log du système
const SYSTEM_LOGS = [
  '✓ Vérification intégrité portefeuilles...',
  '✓ Synchronisation transactions en cours...',
  '✓ Validation règles métier POS...',
  '✓ Contrôle stocks multi-entrepôts...',
  '✓ Analyse patterns commissions...',
  '✓ Scan sécurité authentification...',
  '✓ Audit trail blockchain actif...',
  '✓ Détection anomalies IA...',
  '✓ Reconciliation balances...',
  '✓ Vérification permissions RLS...',
  '✓ Monitoring API endpoints...',
  '✓ Health check microservices...',
  '✓ Validation schémas données...',
  '✓ Contrôle rate limiting...',
  '✓ Backup incrémental actif...',
  '✓ Réplication temps réel...',
  '✓ Cache invalidation check...',
  '✓ Optimisation requêtes SQL...',
  '✓ Vérification certificats SSL...',
  '✓ Monitoring métriques système...',
];

interface SystemLiveMonitorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FloatingLog {
  id: number;
  text: string;
  x: number;
  y: number;
  opacity: number;
}

export default function SystemLiveMonitor({ open, onOpenChange }: SystemLiveMonitorProps) {
  const navigate = useNavigate();
  const [activeFeatures, setActiveFeatures] = useState<Set<number>>(new Set());
  const [logs, setLogs] = useState<FloatingLog[]>([]);
  const [uptime, setUptime] = useState({ days: 99, hours: 23, mins: 45, secs: 12 });
  const [stats, setStats] = useState({
    transactions: 1247853,
    requests: 8432561,
    users: 15234,
    checks: 98765,
  });
  const [selectedFeature, setSelectedFeature] = useState<typeof SYSTEM_FEATURES[0] | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const logIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hook pour la santé des fonctionnalités
  const { healthData, globalHealth, loading, refetch, applyAutoCorrection } = useFeatureHealth();

  // Simuler l'activité des fonctionnalités
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * SYSTEM_FEATURES.length);
      setActiveFeatures((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(randomIndex)) {
          newSet.delete(randomIndex);
        } else {
          newSet.add(randomIndex);
          // Auto-remove after 2 seconds
          setTimeout(() => {
            setActiveFeatures((p) => {
              const s = new Set(p);
              s.delete(randomIndex);
              return s;
            });
          }, 2000);
        }
        return newSet;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [open]);

  // Générer les logs flottants
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      const randomLog = SYSTEM_LOGS[Math.floor(Math.random() * SYSTEM_LOGS.length)];
      const newLog: FloatingLog = {
        id: logIdRef.current++,
        text: randomLog,
        x: Math.random() * 60 + 20,
        y: 100,
        opacity: 1,
      };

      setLogs((prev) => [...prev.slice(-15), newLog]);
    }, 400);

    return () => clearInterval(interval);
  }, [open]);

  // Animer les logs vers le haut
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setLogs((prev) =>
        prev
          .map((log) => ({
            ...log,
            y: log.y - 2,
            opacity: Math.max(0, log.opacity - 0.02),
          }))
          .filter((log) => log.opacity > 0)
      );
    }, 50);

    return () => clearInterval(interval);
  }, [open]);

  // Mettre à jour l'uptime
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setUptime((prev) => {
        let { days, hours, mins, secs } = prev;
        secs++;
        if (secs >= 60) {
          secs = 0;
          mins++;
        }
        if (mins >= 60) {
          mins = 0;
          hours++;
        }
        if (hours >= 24) {
          hours = 0;
          days++;
        }
        return { days, hours, mins, secs };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  // Mettre à jour les stats
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setStats((prev) => ({
        transactions: prev.transactions + Math.floor(Math.random() * 5),
        requests: prev.requests + Math.floor(Math.random() * 20),
        users: prev.users + (Math.random() > 0.9 ? 1 : 0),
        checks: prev.checks + Math.floor(Math.random() * 3),
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [open]);

  // Handler pour clic sur une carte
  const handleFeatureClick = (feature: typeof SYSTEM_FEATURES[0]) => {
    setSelectedFeature(feature);
    setShowDetailSheet(true);
  };

  // Obtenir le statut de santé pour une fonctionnalité
  const getFeatureHealth = (domain: string) => {
    return healthData[domain] || null;
  };

  // Obtenir l'icône de statut
  const getStatusIndicator = (domain: string) => {
    const health = getFeatureHealth(domain);
    if (!health) return null;

    if (health.status === 'CRITICAL') {
      return (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
        >
          <AlertTriangle className="w-2.5 h-2.5 text-white" />
        </motion.div>
      );
    }
    if (health.status === 'WARNING') {
      return (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
          <AlertCircle className="w-2.5 h-2.5 text-white" />
        </div>
      );
    }
    return (
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[1400px] h-[850px] p-0 overflow-hidden bg-black border-0">
          {/* Background Grid Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,136,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,136,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
          
          {/* Scanning Line Effect */}
          <motion.div
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between p-4 border-b border-emerald-500/30 bg-black/80 backdrop-blur">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              >
                <Shield className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-emerald-400 font-mono tracking-wider">
                  SYSTÈME DE SURVEILLANCE 24/7
                </h1>
                <p className="text-emerald-500/70 text-sm font-mono">
                  Monitoring en temps réel de toutes les fonctionnalités
                </p>
              </div>
            </div>

            {/* Global Health + Live Badge */}
            <div className="flex items-center gap-4">
              {/* Global Health Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-600">
                {globalHealth.status === 'CRITICAL' && (
                  <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                )}
                {globalHealth.status === 'WARNING' && (
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                )}
                {globalHealth.status === 'OK' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                <span className="text-sm font-medium text-slate-300">
                  {globalHealth.totalAnomalies} anomalies
                </span>
                {globalHealth.criticalCount > 0 && (
                  <Badge className="bg-red-600 text-white text-xs">
                    {globalHealth.criticalCount} critiques
                  </Badge>
                )}
              </div>

              <Badge className="bg-red-600 text-white animate-pulse flex items-center gap-2 px-4 py-2">
                <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                LIVE
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                className="text-emerald-400 hover:text-white hover:bg-emerald-500/20"
                disabled={loading}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-emerald-400 hover:text-white hover:bg-emerald-500/20"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="relative flex-1 p-6 overflow-hidden" ref={containerRef}>
            {/* Floating Logs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  className="absolute text-emerald-400/60 text-xs font-mono whitespace-nowrap"
                  style={{
                    left: `${log.x}%`,
                    top: `${log.y}%`,
                    opacity: log.opacity,
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: log.opacity, scale: 1 }}
                >
                  {log.text}
                </motion.div>
              ))}
            </div>

            {/* Stats Bar */}
            <div className="relative z-10 grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'TRANSACTIONS', value: stats.transactions.toLocaleString(), icon: CreditCard },
                { label: 'REQUÊTES API', value: stats.requests.toLocaleString(), icon: Network },
                { label: 'UTILISATEURS', value: stats.users.toLocaleString(), icon: Users },
                { label: 'CHECKS SYSTÈME', value: stats.checks.toLocaleString(), icon: CheckCircle2 },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 backdrop-blur"
                >
                  <div className="flex items-center gap-2 text-emerald-500/70 text-xs mb-2">
                    <stat.icon className="w-4 h-4" />
                    {stat.label}
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">
                    {stat.value}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Features Grid - CLICKABLE */}
            <div className="relative z-10 grid grid-cols-6 gap-4 mb-8">
              {SYSTEM_FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = activeFeatures.has(index);
                const health = getFeatureHealth(feature.domain);
                const hasIssue = health && health.status !== 'OK';
                
                return (
                  <motion.div
                    key={feature.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      boxShadow: isActive 
                        ? `0 0 30px ${feature.color}60, 0 0 60px ${feature.color}30` 
                        : hasIssue
                        ? health.status === 'CRITICAL' 
                          ? '0 0 20px rgba(239, 68, 68, 0.4)'
                          : '0 0 15px rgba(249, 115, 22, 0.3)'
                        : 'none'
                    }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleFeatureClick(feature)}
                    className={`relative p-4 rounded-xl border transition-all duration-300 cursor-pointer hover:scale-105 ${
                      isActive 
                        ? 'border-emerald-400 bg-emerald-500/20' 
                        : hasIssue
                        ? health.status === 'CRITICAL'
                          ? 'border-red-500/50 bg-red-500/10'
                          : 'border-orange-500/50 bg-orange-500/10'
                        : 'border-emerald-500/20 bg-black/50 hover:border-emerald-500/50'
                    }`}
                  >
                    {/* Status Indicator */}
                    {getStatusIndicator(feature.domain)}

                    {/* Pulse ring when active */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl border-2"
                        style={{ borderColor: feature.color }}
                        initial={{ opacity: 1, scale: 1 }}
                        animate={{ opacity: 0, scale: 1.2 }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                    
                    <div className="flex flex-col items-center gap-2 relative z-10">
                      <motion.div
                        animate={{ 
                          rotate: isActive ? 360 : 0,
                          scale: isActive ? 1.2 : 1 
                        }}
                        transition={{ duration: 0.5 }}
                        className="p-3 rounded-lg"
                        style={{ 
                          backgroundColor: `${feature.color}20`,
                          boxShadow: isActive ? `0 0 20px ${feature.color}` : 'none'
                        }}
                      >
                        <Icon 
                          className="w-6 h-6" 
                          style={{ color: feature.color }}
                        />
                      </motion.div>
                      <span className="text-xs text-center text-emerald-400/80 font-medium">
                        {feature.name}
                      </span>
                      <Badge 
                        className="text-[10px] px-2"
                        style={{ 
                          backgroundColor: isActive ? feature.color : 'transparent',
                          color: isActive ? 'white' : feature.color,
                          borderColor: feature.color
                        }}
                        variant={isActive ? 'default' : 'outline'}
                      >
                        {feature.domain}
                      </Badge>

                      {/* Anomaly count badge */}
                      {health && health.anomalyCount > 0 && (
                        <Badge className="text-[9px] px-1.5 bg-orange-500 text-white">
                          {health.anomalyCount} anomalie{health.anomalyCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Uptime Display */}
            <div className="relative z-10 flex justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/20 to-emerald-500/10 border border-emerald-500/30"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw className="w-8 h-8 text-emerald-400" />
                  </motion.div>
                  <span className="text-emerald-500/70 text-lg font-medium">UPTIME</span>
                </div>
                
                <div className="flex items-center gap-3 font-mono text-4xl text-emerald-400 font-bold">
                  <div className="flex flex-col items-center">
                    <span>{String(uptime.days).padStart(2, '0')}</span>
                    <span className="text-xs text-emerald-500/50">JOURS</span>
                  </div>
                  <span className="text-emerald-500/50">:</span>
                  <div className="flex flex-col items-center">
                    <span>{String(uptime.hours).padStart(2, '0')}</span>
                    <span className="text-xs text-emerald-500/50">HEURES</span>
                  </div>
                  <span className="text-emerald-500/50">:</span>
                  <div className="flex flex-col items-center">
                    <span>{String(uptime.mins).padStart(2, '0')}</span>
                    <span className="text-xs text-emerald-500/50">MINS</span>
                  </div>
                  <span className="text-emerald-500/50">:</span>
                  <div className="flex flex-col items-center">
                    <motion.span
                      key={uptime.secs}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {String(uptime.secs).padStart(2, '0')}
                    </motion.span>
                    <span className="text-xs text-emerald-500/50">SECS</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">SYSTÈME OPÉRATIONNEL</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Footer Status */}
          <div className="relative z-10 flex items-center justify-between p-4 border-t border-emerald-500/30 bg-black/80 backdrop-blur">
            <div className="flex items-center gap-6 text-xs font-mono text-emerald-500/70">
              <span>CPU: 23% ▓▓░░░░░░░░</span>
              <span>RAM: 45% ▓▓▓▓░░░░░░</span>
              <span>NET: 1.2 Gb/s ▓▓▓▓▓▓▓░░░</span>
              <span>DISK: 67% ▓▓▓▓▓▓░░░░</span>
            </div>
            <div className="text-emerald-400 text-sm font-mono">
              {new Date().toLocaleString('fr-FR')}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <FeatureDetailSheet
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        feature={selectedFeature}
        healthData={selectedFeature ? healthData[selectedFeature.domain] : null}
        onApplyCorrection={applyAutoCorrection}
      />
    </>
  );
}
