/**
 * 🔗 Wrapper pour Sub-Agent Dashboard avec paramètres URL
 */

import React from 'react';
import { useParams } from 'react-router-dom';
// SubAgentDashboard removed - feature being refactored

export const SubAgentDashboardWrapper: React.FC = () => {
    const { subAgentId } = useParams<{ subAgentId: string }>();

    if (!subAgentId) {
        return <div>Sous-Agent ID manquant</div>;
    }

    return <div className="p-8 text-center">Sub-Agent Dashboard en cours de refonte</div>;
};

export default SubAgentDashboardWrapper;
