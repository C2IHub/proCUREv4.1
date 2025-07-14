import {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowStep,
  WorkflowStepResult,
  WorkflowCondition,
  AgentExecutionContext,
  AgentInvokeRequest,
  AgentInvokeResponse
} from '../../types';
import type { AgentOrchestrator } from './AgentOrchestrator';
import type { AgentRegistry } from '../registry/AgentRegistry';

export class WorkflowEngine {
  private activeWorkflows = new Map<string, WorkflowExecution>();

  constructor(
    private orchestrator: AgentOrchestrator,
    private registry: AgentRegistry
  ) {}

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflow: WorkflowDefinition,
    context: AgentExecutionContext
  ): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId: workflow.id,
      status: 'pending',
      startTime: new Date().toISOString(),
      context,
      stepResults: []
    };

    // Add to active workflows
    this.activeWorkflows.set(execution.id, execution);

    try {
      execution.status = 'running';

      // Execute based on coordination pattern
      switch (workflow.coordination) {
        case 'sequential':
          await this.executeSequential(workflow, execution);
          break;
        case 'parallel':
          await this.executeParallel(workflow, execution);
          break;
        case 'conditional':
          await this.executeConditional(workflow, execution);
          break;
        case 'event-driven':
          await this.executeEventDriven(workflow, execution);
          break;
        default:
          throw new Error(`Unsupported coordination pattern: ${workflow.coordination}`);
      }

      execution.status = 'completed';
      execution.endTime = new Date().toISOString();

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date().toISOString();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle retry logic
      if (this.shouldRetry(workflow, execution)) {
        return this.retryWorkflow(workflow, execution);
      }
    } finally {
      // Remove from active workflows after a delay (for monitoring)
      setTimeout(() => {
        this.activeWorkflows.delete(execution.id);
      }, 30000); // 30 seconds
    }

    return execution;
  }

  /**
   * Execute steps sequentially
   */
  private async executeSequential(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution
  ): Promise<void> {
    let stepContext = { ...execution.context.metadata };

    for (const step of workflow.steps) {
      // Check if step should be executed based on dependencies
      if (!this.shouldExecuteStep(step, execution.stepResults)) {
        const stepResult: WorkflowStepResult = {
          stepId: step.id,
          status: 'skipped',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString()
        };
        execution.stepResults.push(stepResult);
        continue;
      }

      const stepResult = await this.executeStep(step, execution.context, stepContext);
      execution.stepResults.push(stepResult);

      // If step failed and it's critical, stop execution
      if (stepResult.status === 'failed') {
        throw new Error(`Step ${step.id} failed: ${stepResult.error}`);
      }

      // Update context with step results
      if (stepResult.result && step.outputs) {
        for (const output of step.outputs) {
          stepContext[output] = this.extractOutputValue(stepResult.result, output);
        }
      }
    }
  }

  /**
   * Execute steps in parallel
   */
  private async executeParallel(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution
  ): Promise<void> {
    const stepPromises = workflow.steps.map(async (step) => {
      if (!this.shouldExecuteStep(step, [])) {
        return {
          stepId: step.id,
          status: 'skipped' as const,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString()
        };
      }

      return this.executeStep(step, execution.context, execution.context.metadata);
    });

    const stepResults = await Promise.allSettled(stepPromises);
    
    for (let i = 0; i < stepResults.length; i++) {
      const result = stepResults[i];
      if (result.status === 'fulfilled') {
        execution.stepResults.push(result.value);
      } else {
        execution.stepResults.push({
          stepId: workflow.steps[i].id,
          status: 'failed',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          error: result.reason?.message || 'Unknown error'
        });
      }
    }

    // Check if any critical steps failed
    const failedSteps = execution.stepResults.filter(r => r.status === 'failed');
    if (failedSteps.length > 0) {
      throw new Error(`${failedSteps.length} steps failed`);
    }
  }

  /**
   * Execute steps based on conditions
   */
  private async executeConditional(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution
  ): Promise<void> {
    let stepContext = { ...execution.context.metadata };

    for (const step of workflow.steps) {
      // Check conditions
      if (step.conditions && !this.evaluateConditions(step.conditions, stepContext)) {
        const stepResult: WorkflowStepResult = {
          stepId: step.id,
          status: 'skipped',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString()
        };
        execution.stepResults.push(stepResult);
        continue;
      }

      const stepResult = await this.executeStep(step, execution.context, stepContext);
      execution.stepResults.push(stepResult);

      if (stepResult.status === 'failed') {
        throw new Error(`Step ${step.id} failed: ${stepResult.error}`);
      }

      // Update context
      if (stepResult.result && step.outputs) {
        for (const output of step.outputs) {
          stepContext[output] = this.extractOutputValue(stepResult.result, output);
        }
      }
    }
  }

  /**
   * Execute steps based on events (simplified implementation)
   */
  private async executeEventDriven(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution
  ): Promise<void> {
    // For now, execute sequentially but with event-like pattern
    // In a real implementation, this would involve event subscriptions and triggers
    await this.executeSequential(workflow, execution);
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    context: AgentExecutionContext,
    stepContext: Record<string, unknown>
  ): Promise<WorkflowStepResult> {
    const stepResult: WorkflowStepResult = {
      stepId: step.id,
      status: 'running',
      startTime: new Date().toISOString()
    };

    try {
      // Create agent request with step inputs and context
      const request: AgentInvokeRequest = {
        prompt: this.buildStepPrompt(step, stepContext),
        sessionId: context.sessionId,
        context: {
          ...stepContext,
          stepId: step.id,
          stepName: step.name,
          workflowId: context.metadata.workflowId,
          inputs: step.inputs
        }
      };

      // Create step-specific context
      const stepExecutionContext: AgentExecutionContext = {
        ...context,
        requestId: `${context.requestId}-${step.id}`,
        metadata: {
          ...context.metadata,
          stepId: step.id,
          stepName: step.name
        }
      };

      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Step timeout')), step.timeout || 30000);
      });

      const responsePromise = this.orchestrator.invokeAgent(
        step.agentId,
        request,
        stepExecutionContext
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);

      stepResult.status = 'completed';
      stepResult.result = response;
      stepResult.endTime = new Date().toISOString();

    } catch (error) {
      stepResult.status = 'failed';
      stepResult.error = error instanceof Error ? error.message : 'Unknown error';
      stepResult.endTime = new Date().toISOString();
    }

    return stepResult;
  }

  /**
   * Build prompt for a workflow step
   */
  private buildStepPrompt(step: WorkflowStep, context: Record<string, unknown>): string {
    let prompt = `Execute workflow step: ${step.name}\n`;
    prompt += `Description: ${step.description}\n\n`;

    if (Object.keys(step.inputs).length > 0) {
      prompt += `Inputs:\n`;
      for (const [key, value] of Object.entries(step.inputs)) {
        // Replace context variables in inputs
        const resolvedValue = this.resolveContextVariables(value, context);
        prompt += `- ${key}: ${JSON.stringify(resolvedValue)}\n`;
      }
      prompt += '\n';
    }

    if (step.outputs && step.outputs.length > 0) {
      prompt += `Expected outputs: ${step.outputs.join(', ')}\n\n`;
    }

    prompt += `Please provide a structured response that addresses the step requirements.`;

    return prompt;
  }

  /**
   * Resolve context variables in values
   */
  private resolveContextVariables(value: unknown, context: Record<string, unknown>): unknown {
    if (typeof value === 'string') {
      // Replace ${variable} patterns
      return value.replace(/\$\{([^}]+)\}/g, (match, variable) => {
        const contextValue = this.getNestedValue(context, variable);
        return contextValue !== undefined ? String(contextValue) : match;
      });
    } else if (Array.isArray(value)) {
      return value.map(item => this.resolveContextVariables(item, context));
    } else if (typeof value === 'object' && value !== null) {
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveContextVariables(val, context);
      }
      return resolved;
    }
    
    return value;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? (current as any)[key] : undefined;
    }, obj);
  }

  /**
   * Check if a step should be executed based on dependencies
   */
  private shouldExecuteStep(step: WorkflowStep, completedSteps: WorkflowStepResult[]): boolean {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }

    const completedStepIds = new Set(
      completedSteps
        .filter(result => result.status === 'completed')
        .map(result => result.stepId)
    );

    return step.dependencies.every(dep => completedStepIds.has(dep));
  }

  /**
   * Evaluate conditions for conditional execution
   */
  private evaluateConditions(conditions: WorkflowCondition[], context: Record<string, unknown>): boolean {
    return conditions.every(condition => {
      const value = this.getNestedValue(context, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'greater_than':
          return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
        case 'less_than':
          return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
        case 'contains':
          return typeof value === 'string' && typeof condition.value === 'string' && value.includes(condition.value);
        default:
          return false;
      }
    });
  }

  /**
   * Extract output value from agent response
   */
  private extractOutputValue(response: AgentInvokeResponse, outputName: string): unknown {
    // Try to parse the response as JSON first
    try {
      const parsed = JSON.parse(response.response);
      return parsed[outputName] || response.response;
    } catch {
      // If not JSON, return the whole response
      return response.response;
    }
  }

  /**
   * Check if workflow should be retried
   */
  private shouldRetry(workflow: WorkflowDefinition, execution: WorkflowExecution): boolean {
    // Simple retry logic - would be more sophisticated in practice
    return workflow.retryPolicy.maxRetries > 0 && 
           execution.status === 'failed' &&
           !execution.error?.includes('timeout');
  }

  /**
   * Retry a failed workflow
   */
  private async retryWorkflow(
    workflow: WorkflowDefinition,
    originalExecution: WorkflowExecution
  ): Promise<WorkflowExecution> {
    // Wait for backoff period
    const backoffDelay = 1000 * Math.pow(workflow.retryPolicy.backoffMultiplier, 1);
    await new Promise(resolve => setTimeout(resolve, backoffDelay));

    // Create new execution context for retry
    const retryContext: AgentExecutionContext = {
      ...originalExecution.context,
      requestId: `${originalExecution.context.requestId}-retry-1`,
      metadata: {
        ...originalExecution.context.metadata,
        retryAttempt: 1,
        originalExecutionId: originalExecution.id
      }
    };

    return this.executeWorkflow(workflow, retryContext);
  }

  /**
   * Get active workflow executions
   */
  getActiveWorkflows(): WorkflowExecution[] {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Get workflow execution by ID
   */
  getWorkflowExecution(executionId: string): WorkflowExecution | null {
    return this.activeWorkflows.get(executionId) || null;
  }

  /**
   * Cancel a workflow execution
   */
  async cancelWorkflow(executionId: string): Promise<boolean> {
    const execution = this.activeWorkflows.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = new Date().toISOString();
    execution.error = 'Workflow cancelled by user';

    return true;
  }

  /**
   * Get workflow statistics
   */
  getStatistics(): {
    activeWorkflows: number;
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
  } {
    // Simplified statistics - in a real implementation, you'd track more detailed metrics
    return {
      activeWorkflows: this.activeWorkflows.size,
      totalExecutions: 0, // Would track historical data
      successRate: 0.92, // Would calculate from historical data
      averageExecutionTime: 0 // Would calculate from execution times
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.activeWorkflows.clear();
  }
}