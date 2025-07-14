import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AgentRegistry } from '../agents/registry/AgentRegistry';
import { AgentOrchestrator } from '../agents/orchestration/AgentOrchestrator';
import { ComplianceMonitorAgent } from '../agents/implementations/ComplianceMonitorAgent';
import { RiskPredictorAgent } from '../agents/implementations/RiskPredictorAgent';
import { DocumentIntelligenceAgent } from '../agents/implementations/DocumentIntelligenceAgent';
import {
  AgentId,
  AgentConfig,
  AgentInvokeRequest,
  AgentInvokeResponse,
  AgentExecutionContext,
  WorkflowDefinition,
  WorkflowExecution,
  AgentHealth,
  PerformanceMetrics
} from '../types';

interface AgentSystemContextValue {
  // Registry and orchestration
  registry: AgentRegistry;
  orchestrator: AgentOrchestrator;
  
  // Agent invocation
  invokeAgent: (
    agentId: AgentId,
    request: AgentInvokeRequest,
    priority?: number
  ) => Promise<AgentInvokeResponse>;
  
  // Workflow execution
  executeWorkflow: (
    workflow: WorkflowDefinition,
    context: AgentExecutionContext
  ) => Promise<WorkflowExecution>;
  
  // System status
  isSystemReady: boolean;
  systemHealth: Record<AgentId, AgentHealth>;
  
  // Agent management
  getAvailableAgents: () => AgentId[];
  getAgentCapabilities: (agentId: AgentId) => string[];
  getAgentHealth: (agentId: AgentId) => AgentHealth | null;
  getAgentMetrics: (agentId: AgentId) => PerformanceMetrics | null;
  
  // System configuration
  featureFlags: AgentFeatureFlags;
  updateFeatureFlag: (flag: string, enabled: boolean) => void;
}

interface AgentFeatureFlags {
  agentFlags: Record<AgentId, {
    enabled: boolean;
    rolloutPercentage: number;
    features: Record<string, boolean>;
  }>;
  workflowFlags: Record<string, {
    enabled: boolean;
    rolloutPercentage: number;
    maxConcurrent: number;
  }>;
  systemFlags: {
    debugMode: boolean;
    enableTracing: boolean;
    performanceMonitoring: boolean;
    healthChecking: boolean;
  };
}

interface AgentSystemProviderProps {
  children: ReactNode;
  config?: {
    maxConcurrency?: number;
    healthCheckInterval?: number;
    enableDebugMode?: boolean;
    featureFlags?: Partial<AgentFeatureFlags>;
  };
}

const AgentSystemContext = createContext<AgentSystemContextValue | null>(null);

const defaultFeatureFlags: AgentFeatureFlags = {
  agentFlags: {
    'compliance-monitor': {
      enabled: true,
      rolloutPercentage: 100,
      features: {
        'advanced_analysis': true,
        'real_time_monitoring': true,
        'predictive_compliance': true
      }
    },
    'risk-predictor': {
      enabled: true,
      rolloutPercentage: 100,
      features: {
        'predictive_modeling': true,
        'scenario_analysis': true,
        'real_time_alerts': true
      }
    },
    'document-intelligence': {
      enabled: true,
      rolloutPercentage: 100,
      features: {
        'advanced_ocr': true,
        'fraud_detection': true,
        'automated_classification': true
      }
    }
  },
  workflowFlags: {
    'supplier-onboarding': {
      enabled: true,
      rolloutPercentage: 100,
      maxConcurrent: 5
    },
    'compliance-review': {
      enabled: true,
      rolloutPercentage: 100,
      maxConcurrent: 10
    },
    'risk-assessment': {
      enabled: true,
      rolloutPercentage: 100,
      maxConcurrent: 8
    },
    'document-validation': {
      enabled: true,
      rolloutPercentage: 100,
      maxConcurrent: 15
    }
  },
  systemFlags: {
    debugMode: process.env.NODE_ENV === 'development',
    enableTracing: true,
    performanceMonitoring: true,
    healthChecking: true
  }
};

const defaultAgentConfigs: Record<AgentId, AgentConfig> = {
  'compliance-monitor': {
    enabled: true,
    maxConcurrency: 5,
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    rateLimits: {
      requestsPerMinute: 30,
      requestsPerHour: 500
    },
    features: {
      'advanced_analysis': true,
      'real_time_monitoring': true
    }
  },
  'risk-predictor': {
    enabled: true,
    maxConcurrency: 3,
    timeout: 45000, // 45 seconds for complex analysis
    retryAttempts: 2,
    rateLimits: {
      requestsPerMinute: 20,
      requestsPerHour: 300
    },
    features: {
      'predictive_modeling': true,
      'scenario_analysis': true
    }
  },
  'document-intelligence': {
    enabled: true,
    maxConcurrency: 8,
    timeout: 60000, // 60 seconds for document processing
    retryAttempts: 3,
    rateLimits: {
      requestsPerMinute: 40,
      requestsPerHour: 600
    },
    features: {
      'advanced_ocr': true,
      'fraud_detection': true
    }
  }
};

export function AgentSystemProvider({ children, config }: AgentSystemProviderProps) {
  const [registry] = useState(() => new AgentRegistry());
  const [orchestrator] = useState(() => new AgentOrchestrator(registry));
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [systemHealth, setSystemHealth] = useState<Record<AgentId, AgentHealth>>({});
  const [featureFlags, setFeatureFlags] = useState<AgentFeatureFlags>(() => ({
    ...defaultFeatureFlags,
    ...config?.featureFlags,
    systemFlags: {
      ...defaultFeatureFlags.systemFlags,
      debugMode: config?.enableDebugMode ?? defaultFeatureFlags.systemFlags.debugMode,
      ...config?.featureFlags?.systemFlags
    }
  }));

  // Initialize the agent system
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        console.log('🚀 Initializing proCURE Agent System...');

        // Set orchestrator configuration
        if (config?.maxConcurrency) {
          orchestrator.setMaxConcurrency(config.maxConcurrency);
        }

        // Register agents
        await registerAgents();

        // Start health monitoring
        if (featureFlags.systemFlags.healthChecking) {
          startHealthMonitoring();
        }

        setIsSystemReady(true);
        console.log('✅ Agent System initialized successfully');

        // Log system status if debug mode is enabled
        if (featureFlags.systemFlags.debugMode) {
          logSystemStatus();
        }

      } catch (error) {
        console.error('❌ Failed to initialize Agent System:', error);
        setIsSystemReady(false);
      }
    };

    initializeSystem();

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Agent System...');
      orchestrator.cleanup();
    };
  }, []);

  const registerAgents = async () => {
    try {
      // Create agent instances
      const complianceAgent = new ComplianceMonitorAgent();
      const riskAgent = new RiskPredictorAgent();
      const documentAgent = new DocumentIntelligenceAgent();

      // Register agents with their configurations (check if already registered first)
      if (!registry.isAgentRegistered('compliance-monitor')) {
        registry.registerAgent(
          'compliance-monitor',
          complianceAgent,
          defaultAgentConfigs['compliance-monitor']
        );
      }

      if (!registry.isAgentRegistered('risk-predictor')) {
        registry.registerAgent(
          'risk-predictor',
          riskAgent,
          defaultAgentConfigs['risk-predictor']
        );
      }

      if (!registry.isAgentRegistered('document-intelligence')) {
        registry.registerAgent(
          'document-intelligence',
          documentAgent,
          defaultAgentConfigs['document-intelligence']
        );
      }

      // Validate dependencies
      const dependencyValidation = registry.validateDependencies();
      if (!dependencyValidation.isValid) {
        console.warn('⚠️ Dependency validation issues:', dependencyValidation);
      }

      console.log('📋 Registered agents:', registry.getRegisteredAgents());

    } catch (error) {
      console.error('❌ Failed to register agents:', error);
      throw error;
    }
  };

  const startHealthMonitoring = () => {
    // Update health status periodically
    const healthCheckInterval = config?.healthCheckInterval || 30000; // 30 seconds

    const updateHealthStatus = async () => {
      try {
        const healthData = await registry.getAllAgentHealth();
        const healthRecord: Record<AgentId, AgentHealth> = {};
        
        for (const [agentId, health] of healthData.entries()) {
          healthRecord[agentId] = health;
        }
        
        setSystemHealth(healthRecord);
      } catch (error) {
        console.error('Failed to update health status:', error);
      }
    };

    // Initial health check
    updateHealthStatus();

    // Set up periodic health checks
    const healthInterval = setInterval(updateHealthStatus, healthCheckInterval);

    // Cleanup function would be called in useEffect cleanup
    return () => clearInterval(healthInterval);
  };

  const logSystemStatus = () => {
    const stats = registry.getRegistryStats();
    const queueStatus = orchestrator.getQueueStatus();
    
    console.log('📊 Agent System Status:', {
      agents: stats,
      queue: queueStatus,
      featureFlags: featureFlags.systemFlags
    });
  };

  // Create execution context for agent invocations
  const createExecutionContext = (sessionId?: string): AgentExecutionContext => {
    return {
      sessionId: sessionId || `session-${Date.now()}`,
      userId: 'current-user', // Would come from auth context in real app
      requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      metadata: {
        systemVersion: '1.0.0',
        featureFlags: featureFlags.systemFlags
      }
    };
  };

  // Agent invocation function
  const invokeAgent = async (
    agentId: AgentId,
    request: AgentInvokeRequest,
    priority = 5
  ): Promise<AgentInvokeResponse> => {
    if (!isSystemReady) {
      throw new Error('Agent system is not ready');
    }

    // Check if agent is enabled
    const agentFlags = featureFlags.agentFlags[agentId];
    if (!agentFlags?.enabled) {
      throw new Error(`Agent ${agentId} is disabled`);
    }

    // Check rollout percentage (for gradual rollouts)
    if (Math.random() * 100 > agentFlags.rolloutPercentage) {
      throw new Error(`Agent ${agentId} not available for this request (rollout percentage)`);
    }

    const context = createExecutionContext(request.sessionId);
    
    try {
      const response = await orchestrator.invokeAgent(agentId, request, context, priority);
      
      if (featureFlags.systemFlags.debugMode) {
        console.log(`🎯 Agent ${agentId} invoked successfully:`, {
          requestId: context.requestId,
          confidence: response.confidence,
          responseLength: response.response.length
        });
      }
      
      return response;
    } catch (error) {
      console.error(`❌ Agent ${agentId} invocation failed:`, error);
      throw error;
    }
  };

  // Workflow execution function
  const executeWorkflow = async (
    workflow: WorkflowDefinition,
    context?: Partial<AgentExecutionContext>
  ): Promise<WorkflowExecution> => {
    if (!isSystemReady) {
      throw new Error('Agent system is not ready');
    }

    // Check if workflow is enabled
    const workflowFlags = featureFlags.workflowFlags[workflow.id];
    if (!workflowFlags?.enabled) {
      throw new Error(`Workflow ${workflow.id} is disabled`);
    }

    const executionContext = {
      ...createExecutionContext(),
      ...context
    };

    try {
      const execution = await orchestrator.executeWorkflow(workflow, executionContext);
      
      if (featureFlags.systemFlags.debugMode) {
        console.log(`🔄 Workflow ${workflow.id} executed:`, {
          executionId: execution.id,
          status: execution.status,
          stepCount: execution.stepResults.length
        });
      }
      
      return execution;
    } catch (error) {
      console.error(`❌ Workflow ${workflow.id} execution failed:`, error);
      throw error;
    }
  };

  // Helper functions
  const getAvailableAgents = (): AgentId[] => {
    return registry.getRegisteredAgents().filter(agentId => 
      featureFlags.agentFlags[agentId]?.enabled
    );
  };

  const getAgentCapabilities = (agentId: AgentId): string[] => {
    const capabilities = registry.getAgentCapabilities(agentId);
    return capabilities ? capabilities.capabilities : [];
  };

  const getAgentHealth = (agentId: AgentId): AgentHealth | null => {
    return systemHealth[agentId] || null;
  };

  const getAgentMetrics = (agentId: AgentId): PerformanceMetrics | null => {
    const agent = registry.getAgent(agentId);
    return agent ? agent.getPerformanceMetrics() : null;
  };

  const updateFeatureFlag = (flag: string, enabled: boolean) => {
    setFeatureFlags(prev => {
      // Handle different types of feature flags
      if (flag.startsWith('agent:')) {
        const agentId = flag.replace('agent:', '') as AgentId;
        return {
          ...prev,
          agentFlags: {
            ...prev.agentFlags,
            [agentId]: {
              ...prev.agentFlags[agentId],
              enabled
            }
          }
        };
      } else if (flag.startsWith('workflow:')) {
        const workflowId = flag.replace('workflow:', '');
        return {
          ...prev,
          workflowFlags: {
            ...prev.workflowFlags,
            [workflowId]: {
              ...prev.workflowFlags[workflowId],
              enabled
            }
          }
        };
      } else if (flag.startsWith('system:')) {
        const systemFlag = flag.replace('system:', '') as keyof typeof prev.systemFlags;
        return {
          ...prev,
          systemFlags: {
            ...prev.systemFlags,
            [systemFlag]: enabled
          }
        };
      }
      
      return prev;
    });
  };

  const contextValue: AgentSystemContextValue = {
    registry,
    orchestrator,
    invokeAgent,
    executeWorkflow,
    isSystemReady,
    systemHealth,
    getAvailableAgents,
    getAgentCapabilities,
    getAgentHealth,
    getAgentMetrics,
    featureFlags,
    updateFeatureFlag
  };

  return (
    <AgentSystemContext.Provider value={contextValue}>
      {children}
    </AgentSystemContext.Provider>
  );
}

export function useAgentSystem() {
  const context = useContext(AgentSystemContext);
  if (!context) {
    throw new Error('useAgentSystem must be used within an AgentSystemProvider');
  }
  return context;
}

// Convenience hooks for specific functionality
export function useAgentInvocation() {
  const { invokeAgent, isSystemReady } = useAgentSystem();
  
  const invoke = async (
    agentId: AgentId,
    prompt: string,
    options?: {
      sessionId?: string;
      context?: Record<string, unknown>;
      priority?: number;
    }
  ) => {
    const request: AgentInvokeRequest = {
      prompt,
      sessionId: options?.sessionId,
      context: options?.context || {}
    };
    
    return invokeAgent(agentId, request, options?.priority);
  };
  
  return { invoke, isReady: isSystemReady };
}

export function useAgentHealth() {
  const { systemHealth, getAgentHealth } = useAgentSystem();
  
  const getHealthSummary = () => {
    const agents = Object.keys(systemHealth);
    const healthy = agents.filter(id => systemHealth[id]?.status === 'healthy').length;
    const degraded = agents.filter(id => systemHealth[id]?.status === 'degraded').length;
    const unhealthy = agents.filter(id => systemHealth[id]?.status === 'unhealthy').length;
    
    return {
      total: agents.length,
      healthy,
      degraded,
      unhealthy,
      healthPercentage: agents.length > 0 ? (healthy / agents.length) * 100 : 0
    };
  };
  
  return {
    systemHealth,
    getAgentHealth,
    getHealthSummary
  };
}

export function useAgentCapabilities() {
  const { getAvailableAgents, getAgentCapabilities } = useAgentSystem();
  
  const getAllCapabilities = () => {
    const agents = getAvailableAgents();
    const capabilities: Record<string, AgentId[]> = {};
    
    for (const agentId of agents) {
      const agentCapabilities = getAgentCapabilities(agentId);
      for (const capability of agentCapabilities) {
        if (!capabilities[capability]) {
          capabilities[capability] = [];
        }
        capabilities[capability].push(agentId);
      }
    }
    
    return capabilities;
  };
  
  const getAgentsForCapability = (capability: string): AgentId[] => {
    const agents = getAvailableAgents();
    return agents.filter(agentId => {
      const capabilities = getAgentCapabilities(agentId);
      return capabilities.includes(capability);
    });
  };
  
  return {
    getAvailableAgents,
    getAgentCapabilities,
    getAllCapabilities,
    getAgentsForCapability
  };
}