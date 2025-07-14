import { 
  AgentId, 
  BaseAgentCapabilities, 
  AgentConfig, 
  DependencyValidationResult,
  AgentHealth 
} from '../../types';
import { BaseAgent } from '../core/BaseAgent';
import { HealthMonitor } from './HealthMonitor';

interface RegisteredAgent {
  agent: BaseAgent;
  config: AgentConfig;
  registrationTime: string;
  lastAccessed: string;
}

export class AgentRegistry {
  private agents = new Map<AgentId, RegisteredAgent>();
  private capabilities = new Map<string, Set<AgentId>>();
  private dependencies = new Map<AgentId, Set<AgentId>>();
  private healthMonitor: HealthMonitor;

  constructor() {
    this.healthMonitor = new HealthMonitor(this);
  }

  /**
   * Register a new agent in the registry
   */
  registerAgent(agentId: AgentId, agent: BaseAgent, config: AgentConfig): void {
    if (this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} is already registered`);
    }

    const agentCapabilities = agent.getCapabilities();
    
    // Validate agent ID matches capabilities
    if (agentCapabilities.id !== agentId) {
      throw new Error(`Agent ID mismatch: expected ${agentId}, got ${agentCapabilities.id}`);
    }

    const registeredAgent: RegisteredAgent = {
      agent,
      config,
      registrationTime: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };

    // Register the agent
    this.agents.set(agentId, registeredAgent);

    // Index capabilities
    this.indexCapabilities(agentId, agentCapabilities);

    // Index dependencies
    this.indexDependencies(agentId, agentCapabilities);

    // Start health monitoring
    this.healthMonitor.startMonitoring(agentId);

    console.log(`Agent ${agentId} registered successfully with capabilities:`, agentCapabilities.capabilities);
  }

  /**
   * Unregister an agent from the registry
   */
  unregisterAgent(agentId: AgentId): boolean {
    const registeredAgent = this.agents.get(agentId);
    if (!registeredAgent) {
      return false;
    }

    // Stop health monitoring
    this.healthMonitor.stopMonitoring(agentId);

    // Remove from capabilities index
    const capabilities = registeredAgent.agent.getCapabilities();
    this.removeFromCapabilitiesIndex(agentId, capabilities);

    // Remove from dependencies index
    this.dependencies.delete(agentId);

    // Remove from agents map
    this.agents.delete(agentId);

    console.log(`Agent ${agentId} unregistered successfully`);
    return true;
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: AgentId): BaseAgent | null {
    const registeredAgent = this.agents.get(agentId);
    if (!registeredAgent) {
      return null;
    }

    // Update last accessed time
    registeredAgent.lastAccessed = new Date().toISOString();
    
    return registeredAgent.agent;
  }

  /**
   * Get agent configuration
   */
  getAgentConfig(agentId: AgentId): AgentConfig | null {
    const registeredAgent = this.agents.get(agentId);
    return registeredAgent ? registeredAgent.config : null;
  }

  /**
   * Get all registered agent IDs
   */
  getRegisteredAgents(): AgentId[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get agents that support a specific capability
   */
  getAgentsForCapability(capability: string): AgentId[] {
    const agentSet = this.capabilities.get(capability);
    return agentSet ? Array.from(agentSet) : [];
  }

  /**
   * Get all capabilities supported by the registry
   */
  getAllCapabilities(): string[] {
    return Array.from(this.capabilities.keys());
  }

  /**
   * Check if an agent is registered
   */
  isAgentRegistered(agentId: AgentId): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Get agent capabilities
   */
  getAgentCapabilities(agentId: AgentId): BaseAgentCapabilities | null {
    const agent = this.getAgent(agentId);
    return agent ? agent.getCapabilities() : null;
  }

  /**
   * Validate all dependencies in the registry
   */
  validateDependencies(): DependencyValidationResult {
    const missingDependencies: AgentId[] = [];
    const circularDependencies: AgentId[][] = [];

    // Check for missing dependencies
    for (const [agentId, deps] of this.dependencies.entries()) {
      for (const dep of deps) {
        if (!this.agents.has(dep)) {
          missingDependencies.push(dep);
        }
      }
    }

    // Check for circular dependencies using DFS
    const visited = new Set<AgentId>();
    const recursionStack = new Set<AgentId>();

    const hasCycle = (agentId: AgentId, path: AgentId[]): boolean => {
      if (recursionStack.has(agentId)) {
        // Found a cycle - extract the cycle from the path
        const cycleStart = path.indexOf(agentId);
        const cycle = path.slice(cycleStart).concat(agentId);
        circularDependencies.push(cycle);
        return true;
      }

      if (visited.has(agentId)) {
        return false;
      }

      visited.add(agentId);
      recursionStack.add(agentId);

      const deps = this.dependencies.get(agentId) || new Set();
      for (const dep of deps) {
        if (hasCycle(dep, [...path, agentId])) {
          return true;
        }
      }

      recursionStack.delete(agentId);
      return false;
    };

    for (const agentId of this.agents.keys()) {
      if (!visited.has(agentId)) {
        hasCycle(agentId, []);
      }
    }

    return {
      isValid: missingDependencies.length === 0 && circularDependencies.length === 0,
      missingDependencies: [...new Set(missingDependencies)], // Remove duplicates
      circularDependencies
    };
  }

  /**
   * Get dependency graph for an agent
   */
  getDependencyGraph(agentId: AgentId): { dependencies: AgentId[]; dependents: AgentId[] } {
    const dependencies = Array.from(this.dependencies.get(agentId) || []);
    
    const dependents: AgentId[] = [];
    for (const [id, deps] of this.dependencies.entries()) {
      if (deps.has(agentId)) {
        dependents.push(id);
      }
    }

    return { dependencies, dependents };
  }

  /**
   * Get health status for all agents
   */
  async getAllAgentHealth(): Promise<Map<AgentId, AgentHealth>> {
    return this.healthMonitor.getAllHealth();
  }

  /**
   * Get health status for a specific agent
   */
  async getAgentHealth(agentId: AgentId): Promise<AgentHealth | null> {
    return this.healthMonitor.getHealth(agentId);
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): {
    totalAgents: number;
    totalCapabilities: number;
    averageCapabilitiesPerAgent: number;
    totalDependencies: number;
    healthyAgents: number;
    unhealthyAgents: number;
  } {
    const totalAgents = this.agents.size;
    const totalCapabilities = this.capabilities.size;
    
    let totalAgentCapabilities = 0;
    let totalDeps = 0;
    
    for (const [agentId, registeredAgent] of this.agents.entries()) {
      const caps = registeredAgent.agent.getCapabilities();
      totalAgentCapabilities += caps.capabilities.length;
      totalDeps += (this.dependencies.get(agentId)?.size || 0);
    }

    const averageCapabilitiesPerAgent = totalAgents > 0 ? totalAgentCapabilities / totalAgents : 0;

    // Get health stats (simplified for now)
    const healthyAgents = this.healthMonitor.getHealthyAgentCount();
    const unhealthyAgents = totalAgents - healthyAgents;

    return {
      totalAgents,
      totalCapabilities,
      averageCapabilitiesPerAgent,
      totalDependencies: totalDeps,
      healthyAgents,
      unhealthyAgents
    };
  }

  /**
   * Update agent configuration
   */
  updateAgentConfig(agentId: AgentId, config: Partial<AgentConfig>): boolean {
    const registeredAgent = this.agents.get(agentId);
    if (!registeredAgent) {
      return false;
    }

    registeredAgent.config = { ...registeredAgent.config, ...config };
    return true;
  }

  /**
   * Get agents ordered by last access time (most recent first)
   */
  getAgentsByActivity(): Array<{ agentId: AgentId; lastAccessed: string; capabilities: string[] }> {
    const agentActivity = Array.from(this.agents.entries())
      .map(([agentId, registeredAgent]) => ({
        agentId,
        lastAccessed: registeredAgent.lastAccessed,
        capabilities: registeredAgent.agent.getCapabilities().capabilities
      }))
      .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());

    return agentActivity;
  }

  private indexCapabilities(agentId: AgentId, capabilities: BaseAgentCapabilities): void {
    for (const capability of capabilities.capabilities) {
      if (!this.capabilities.has(capability)) {
        this.capabilities.set(capability, new Set());
      }
      this.capabilities.get(capability)!.add(agentId);
    }
  }

  private removeFromCapabilitiesIndex(agentId: AgentId, capabilities: BaseAgentCapabilities): void {
    for (const capability of capabilities.capabilities) {
      const agentSet = this.capabilities.get(capability);
      if (agentSet) {
        agentSet.delete(agentId);
        if (agentSet.size === 0) {
          this.capabilities.delete(capability);
        }
      }
    }
  }

  private indexDependencies(agentId: AgentId, capabilities: BaseAgentCapabilities): void {
    if (capabilities.dependencies && capabilities.dependencies.length > 0) {
      this.dependencies.set(agentId, new Set(capabilities.dependencies));
    }
  }
}