/**
 * 🏢 PAGE DASHBOARD AGENT - 224SOLUTIONS
 * Page principale pour les agents
 */

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import AgentDashboard from '@/components/pdg/AgentDashboard';

export default function AgentDashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (profile?.role !== 'agent') {
      navigate('/');
      return;
    }
  }, [user, profile, navigate]);

  if (!user || profile?.role !== 'agent') {
    return null;
  }

  return <AgentDashboard />;
}
