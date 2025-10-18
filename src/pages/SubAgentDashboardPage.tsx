/**
 * 🏪 PAGE DASHBOARD SOUS-AGENT - 224SOLUTIONS
 * Page principale pour les sous-agents
 */

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import SubAgentDashboard from '@/components/pdg/SubAgentDashboard';

export default function SubAgentDashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (profile?.role !== 'sub_agent') {
      navigate('/');
      return;
    }
  }, [user, profile, navigate]);

  if (!user || profile?.role !== 'sub_agent') {
    return null;
  }

  return <SubAgentDashboard />;
}
