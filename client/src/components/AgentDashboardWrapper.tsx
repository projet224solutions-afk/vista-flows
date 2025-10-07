/**
 * 🔗 Wrapper pour Agent Dashboard avec paramètres URL
 */

import React from 'react';
import { useParams } from 'react-router-dom';
// AgentDashboard removed - feature being refactored

export const AgentDashboardWrapper: React.FC = () => {
    const { agentId } = useParams<{ agentId: string }>();

    if (!agentId) {
        return <div>Agent ID manquant</div>;
    }

    return <div className="p-8 text-center">Agent Dashboard en cours de refonte</div>;
};

export default AgentDashboardWrapper;
