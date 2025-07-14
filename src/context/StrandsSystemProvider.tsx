/**
 * Strands System Provider - Simplified replacement for AgentSystemProvider
 * 
 * This provides a simplified context for the AWS Strands-based system,
 * maintaining compatibility with existing components while removing
 * dependencies on the legacy agent implementation.
 */

import React, { createContext, useContext, ReactNode } from 'react';

interface StrandsSystemContextValue {
  // System status
  isSystemReady: boolean;
  
  // Agent information  
  availableAgents: string[];
  systemHealth: {
    healthy: number;
    unhealthy: number;
    healthPercentage: number;
  };
  
  // Capabilities
  allCapabilities: Record<string, string[]>;
}

const StrandsSystemContext = createContext<StrandsSystemContextValue | undefined>(undefined);

interface StrandsSystemProviderProps {
  children: ReactNode;
}

export function StrandsSystemProvider({ children }: StrandsSystemProviderProps) {
  const contextValue: StrandsSystemContextValue = {
    isSystemReady: true,
    availableAgents: ['compliance-monitor', 'risk-predictor', 'document-intelligence'],
    systemHealth: {
      healthy: 3,
      unhealthy: 0,
      healthPercentage: 100
    },
    allCapabilities: {
      'Compliance Analysis': ['compliance-monitor'],
      'Risk Assessment': ['risk-predictor'], 
      'Document Validation': ['document-intelligence'],
      'Regulatory Tracking': ['compliance-monitor'],
      'Financial Analysis': ['risk-predictor']
    }
  };

  return (
    <StrandsSystemContext.Provider value={contextValue}>
      {children}
    </StrandsSystemContext.Provider>
  );
}

export function useStrandsSystem() {
  const context = useContext(StrandsSystemContext);
  if (context === undefined) {
    throw new Error('useStrandsSystem must be used within a StrandsSystemProvider');
  }
  return context;
}

// Backward compatibility hooks for existing components
export function useAgentSystem() {
  const context = useStrandsSystem();
  return {
    isSystemReady: context.isSystemReady,
    orchestrator: null, // No longer needed with Strands
    executeWorkflow: async () => ({ id: 'mock', status: 'completed' as const })
  };
}

export function useAgentHealth() {
  const context = useStrandsSystem();
  return {
    getHealthSummary: () => context.systemHealth
  };
}

export function useAgentCapabilities() {
  const context = useStrandsSystem();
  return {
    getAvailableAgents: () => context.availableAgents,
    getAllCapabilities: () => context.allCapabilities
  };
}