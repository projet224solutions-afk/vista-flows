/**
 * 🔗 Wrapper pour Agent Dashboard avec paramètres URL
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import AgentDashboard from '@/pages/AgentDashboard';

export const AgentDashboardWrapper: React.FC = () => {
    const { agentId } = useParams<{ agentId: string }>();

    if (!agentId) {
        return <div>Agent ID manquant</div>;
    }

    return <AgentDashboard agentId={agentId} />;
};

export default AgentDashboardWrapper;
