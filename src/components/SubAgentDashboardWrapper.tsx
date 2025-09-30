/**
 * 🔗 Wrapper pour Sub-Agent Dashboard avec paramètres URL
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import SubAgentDashboard from '@/pages/SubAgentDashboard';

export const SubAgentDashboardWrapper: React.FC = () => {
    const { subAgentId } = useParams<{ subAgentId: string }>();

    if (!subAgentId) {
        return <div>Sous-Agent ID manquant</div>;
    }

    return <SubAgentDashboard subAgentId={subAgentId} />;
};

export default SubAgentDashboardWrapper;
