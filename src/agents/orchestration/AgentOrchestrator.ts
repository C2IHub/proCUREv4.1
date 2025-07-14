import {
  AgentId,
  AgentInvokeRequest,
  AgentInvokeResponse,
  AgentExecutionContext,
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowStepResult
} from '../../types';
import { AgentRegistry } from '../registry/AgentRegistry';
import { WorkflowEngine } from './WorkflowEngine';

interface ExecutionQueue {
  request: AgentInvokeRequest;
  context: AgentExecutionContext;
  agentId: AgentId;
  priority: number;
  resolve: (value: AgentInvokeResponse) => void;
  reject: (error: Error) => void;
}

export class AgentOrchestrator {
  private executionQueue: ExecutionQueue[] = [];
  private activeExecutions = new Map<string, Promise<AgentInvokeResponse>>();
  private workflowEngine: WorkflowEngine;
  private maxConcurrentExecutions = 10;
  private processing = false;

  constructor(private registry: AgentRegistry) {
    this.workflowEngine = new WorkflowEngine(this, registry);
    
    // Start processing queue
    this.startQueueProcessor();
  }

  /**
   * Invoke a single agent
   */
  async invokeAgent(
    agentId: AgentId,
    request: AgentInvokeRequest,
    context: AgentExecutionContext,
    priority = 5
  ): Promise<AgentInvokeResponse> {
    // Validate agent exists and is enabled
    const agent = this.registry.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const config = this.registry.getAgentConfig(agentId);
    if (!config || !config.enabled) {
      throw new Error(`Agent ${agentId} is disabled`);
    }

    // Check if we're at max concurrency
    if (this.activeExecutions.size >= this.maxConcurrentExecutions) {
      // Queue the request
      return new Promise<AgentInvokeResponse>((resolve, reject) => {
        this.executionQueue.push({
          request,
          context,
          agentId,
          priority,
          resolve,
          reject
        });
        
        // Sort queue by priority (higher priority first)
        this.executionQueue.sort((a, b) => b.priority - a.priority);
      });
    }

    // Execute immediately
    return this.executeAgent(agentId, request, context);
  }

  /**
   * Execute a workflow with multiple agents
   */
  async executeWorkflow(
    workflow: WorkflowDefinition,
    context: AgentExecutionContext
  ): Promise<WorkflowExecution> {
    return this.workflowEngine.executeWorkflow(workflow, context);
  }

  /**
   * Get the workflow engine for direct access
   */
  getWorkflowEngine(): WorkflowEngine {
    return this.workflowEngine;
  }

  /**
   * Cancel an active execution
   */
  async cancelExecution(requestId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(requestId);
    if (!execution) {
      return false;
    }

    // Remove from active executions
    this.activeExecutions.delete(requestId);
    
    // In a real implementation, you might need to actually cancel the underlying operation
    // For now, we'll just remove it from tracking
    return true;
  }

  /**
   * Get status of all active executions
   */
  getActiveExecutions(): Array<{
    requestId: string;
    agentId?: AgentId;
    startTime: string;
    status: 'running';
  }> {
    const executions: Array<{
      requestId: string;
      agentId?: AgentId;
      startTime: string;
      status: 'running';
    }> = [];

    // This is simplified - in a real implementation, you'd track more detailed execution state
    for (const requestId of this.activeExecutions.keys()) {
      executions.push({
        requestId,
        startTime: new Date().toISOString(), // Would be actual start time
        status: 'running'
      });
    }

    return executions;
  }

  /**
   * Get execution queue status
   */
  getQueueStatus(): {
    queueLength: number;
    activeExecutions: number;
    maxConcurrency: number;
    isProcessing: boolean;
  } {
    return {
      queueLength: this.executionQueue.length,
      activeExecutions: this.activeExecutions.size,
      maxConcurrency: this.maxConcurrentExecutions,
      isProcessing: this.processing
    };
  }

  /**
   * Set maximum concurrent executions
   */
  setMaxConcurrency(max: number): void {
    this.maxConcurrentExecutions = Math.max(1, max);
    
    // Process queue if we increased capacity
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Clear the execution queue
   */
  clearQueue(): void {
    // Reject all queued requests
    for (const item of this.executionQueue) {
      item.reject(new Error('Execution queue cleared'));
    }
    this.executionQueue = [];
  }

  /**
   * Invoke multiple agents in parallel
   */
  async invokeAgentsParallel(
    requests: Array<{
      agentId: AgentId;
      request: AgentInvokeRequest;
      context: AgentExecutionContext;
    }>
  ): Promise<Array<{ agentId: AgentId; response: AgentInvokeResponse; error?: Error }>> {
    const promises = requests.map(async ({ agentId, request, context }) => {
      try {
        const response = await this.invokeAgent(agentId, request, context);
        return { agentId, response };
      } catch (error) {
        return { agentId, response: null as any, error: error as Error };
      }
    });

    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          agentId: requests[index].agentId,
          response: null as any,
          error: result.reason
        };
      }
    });
  }

  /**
   * Get recommended agents for a capability
   */
  getRecommendedAgents(capability: string): Array<{
    agentId: AgentId;
    score: number;
    reason: string;
  }> {
    const agentIds = this.registry.getAgentsForCapability(capability);
    const recommendations: Array<{
      agentId: AgentId;
      score: number;
      reason: string;
    }> = [];

    for (const agentId of agentIds) {
      const agent = this.registry.getAgent(agentId);
      const config = this.registry.getAgentConfig(agentId);
      
      if (!agent || !config || !config.enabled) {
        continue;
      }

      // Calculate recommendation score based on various factors
      let score = 50; // Base score
      let reasons: string[] = [];

      // Health-based scoring
      this.registry.getAgentHealth(agentId).then(health => {
        if (health) {
          if (health.status === 'healthy') {
            score += 30;
            reasons.push('Healthy status');
          } else if (health.status === 'degraded') {
            score += 10;
            reasons.push('Degraded performance');
          } else {
            score -= 20;
            reasons.push('Unhealthy status');
          }

          // Response time scoring
          if (health.responseTime < 1000) {
            score += 15;
            reasons.push('Fast response time');
          } else if (health.responseTime < 5000) {
            score += 5;
            reasons.push('Moderate response time');
          } else {
            score -= 10;
            reasons.push('Slow response time');
          }

          // Error rate scoring
          if (health.errorRate < 0.01) {
            score += 15;
            reasons.push('Low error rate');
          } else if (health.errorRate < 0.05) {
            score += 5;
            reasons.push('Acceptable error rate');
          } else {
            score -= 15;
            reasons.push('High error rate');
          }
        }
      });

      // Performance metrics scoring
      const metrics = agent.getPerformanceMetrics();
      if (metrics.successRate > 0.95) {
        score += 10;
        reasons.push('High success rate');
      } else if (metrics.successRate > 0.8) {
        score += 5;
        reasons.push('Good success rate');
      }

      recommendations.push({
        agentId,
        score: Math.max(0, Math.min(100, score)),
        reason: reasons.join(', ') || 'Available agent'
      });
    }

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score);
    
    return recommendations;
  }

  private async executeAgent(
    agentId: AgentId,
    request: AgentInvokeRequest,
    context: AgentExecutionContext
  ): Promise<AgentInvokeResponse> {
    const agent = this.registry.getAgent(agentId)!;
    const requestId = context.requestId;

    try {
      // Add to active executions
      const executionPromise = agent.invoke(request, context);
      this.activeExecutions.set(requestId, executionPromise);

      const response = await executionPromise;
      
      // Remove from active executions
      this.activeExecutions.delete(requestId);

      return response;
    } catch (error) {
      // Remove from active executions
      this.activeExecutions.delete(requestId);
      throw error;
    } finally {
      // Process queue if there's capacity
      if (!this.processing && this.executionQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  private startQueueProcessor(): void {
    // Process queue every 100ms
    setInterval(() => {
      if (!this.processing && this.executionQueue.length > 0 && 
          this.activeExecutions.size < this.maxConcurrentExecutions) {
        this.processQueue();
      }
    }, 100);
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.executionQueue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.executionQueue.length > 0 && 
             this.activeExecutions.size < this.maxConcurrentExecutions) {
        
        const item = this.executionQueue.shift()!;
        
        try {
          const response = await this.executeAgent(item.agentId, item.request, item.context);
          item.resolve(response);
        } catch (error) {
          item.reject(error as Error);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get orchestrator statistics
   */
  getStatistics(): {
    totalExecutions: number;
    currentQueueLength: number;
    activeExecutions: number;
    maxConcurrency: number;
    averageQueueTime: number;
    successRate: number;
  } {
    // This is simplified - in a real implementation, you'd track detailed statistics
    return {
      totalExecutions: 0, // Would track actual count
      currentQueueLength: this.executionQueue.length,
      activeExecutions: this.activeExecutions.size,
      maxConcurrency: this.maxConcurrentExecutions,
      averageQueueTime: 0, // Would calculate based on queue timing
      successRate: 0.95 // Would calculate based on execution results
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearQueue();
    this.activeExecutions.clear();
    this.workflowEngine.cleanup();
  }
}