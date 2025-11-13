import React, { createContext, useContext, ReactNode } from 'react';

export interface VendorAgent {
  id: string;
  vendor_id: string;
  agent_code: string;
  name: string;
  email: string;
  phone: string;
  access_token: string;
  permissions: string[];
  can_create_sub_agent: boolean;
  is_active: boolean;
  created_at: string;
}

interface AgentContextType {
  agent: VendorAgent | null;
  vendorId: string | null;
  hasPermission: (permission: string) => boolean;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within AgentProvider');
  }
  return context;
};

interface AgentProviderProps {
  agent: VendorAgent;
  children: ReactNode;
}

export const AgentProvider: React.FC<AgentProviderProps> = ({ agent, children }) => {
  const hasPermission = (permission: string) => {
    return agent?.permissions?.includes(permission) || false;
  };

  const value: AgentContextType = {
    agent,
    vendorId: agent.vendor_id,
    hasPermission,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
};
