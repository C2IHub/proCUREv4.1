import {
  AgentInvokeRequest,
  AgentInvokeResponse,
  BaseAgentCapabilities,
  AgentExecutionContext,
  ValidationResult,
  PerformanceMetrics,
  AgentMemoryEntry
} from '../../types';
import { SecurityValidator } from './SecurityValidator';
import { RateLimiter } from './RateLimiter';
import { PerformanceTracker } from './PerformanceTracker';
import { AgentMemory } from './AgentMemory';

export abstract class BaseAgent {
  protected securityValidator: SecurityValidator;
  protected rateLimiter: RateLimiter;
  protected performanceTracker: PerformanceTracker;
  protected memory: AgentMemory;

  constructor(protected capabilities: BaseAgentCapabilities) {
    this.securityValidator = new SecurityValidator();
    this.rateLimiter = new RateLimiter();
    this.performanceTracker = new PerformanceTracker(capabilities.id);
    this.memory = new AgentMemory(capabilities.id);
  }

  /**
   * Main entry point for agent invocation
   * Implements the template method pattern with security, validation, and performance tracking
   */
  async invoke(
    request: AgentInvokeRequest,
    context: AgentExecutionContext
  ): Promise<AgentInvokeResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Security validation
      const securityResult = await this.securityValidator.validate(request, context);
      if (!securityResult.passed) {
        throw new Error(`Security validation failed: ${securityResult.violations.join(', ')}`);
      }

      // 2. Rate limiting
      const rateLimitResult = await this.rateLimiter.checkLimit(context.userId, this.capabilities.id);
      if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds`);
      }

      // 3. Input validation
      const validationResult = await this.validateInput(request);
      if (!validationResult.isValid) {
        throw new Error(`Input validation failed: ${validationResult.errors.join(', ')}`);
      }

      // 4. Check cache
      const cacheKey = this.generateCacheKey(request);
      const cachedResponse = await this.memory.get(cacheKey);
      if (cachedResponse && this.isCacheValid(cachedResponse)) {
        this.performanceTracker.recordCacheHit();
        return cachedResponse.value as AgentInvokeResponse;
      }

      // 5. Build prompt
      const prompt = await this.buildPrompt(request);

      // 6. Execute the agent logic
      const rawResponse = await this.executeAgent(prompt, request, context);

      // 7. Parse and validate response
      const response = await this.parseResponse(rawResponse, request);

      // 8. Cache response
      await this.memory.set(cacheKey, response, 300); // 5 minute TTL

      // 9. Record performance metrics
      const duration = Date.now() - startTime;
      this.performanceTracker.recordExecution(duration, true);

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.performanceTracker.recordExecution(duration, false);
      throw error;
    }
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): BaseAgentCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Get agent health status
   */
  async getHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: string }> {
    try {
      // Perform a simple health check
      await this.healthCheck();
      return { status: 'healthy', details: 'Agent is responding normally' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceTracker.getMetrics();
  }

  /**
   * Clear agent memory
   */
  async clearMemory(): Promise<void> {
    await this.memory.clear();
  }

  // Abstract methods that must be implemented by concrete agents

  /**
   * Define the capabilities of this agent
   */
  abstract defineCapabilities(): BaseAgentCapabilities;

  /**
   * Build the prompt for the agent based on the request
   */
  abstract buildPrompt(request: AgentInvokeRequest): Promise<string>;

  /**
   * Parse the raw response from the agent into a structured response
   */
  abstract parseResponse(response: unknown, request: AgentInvokeRequest): Promise<AgentInvokeResponse>;

  /**
   * Validate the input request
   */
  abstract validateInput(request: AgentInvokeRequest): Promise<ValidationResult>;

  /**
   * Execute the actual agent logic (e.g., call to Bedrock, LLM, etc.)
   */
  protected abstract executeAgent(
    prompt: string,
    request: AgentInvokeRequest,
    context: AgentExecutionContext
  ): Promise<unknown>;

  // Protected helper methods

  /**
   * Perform a health check specific to this agent
   */
  protected async healthCheck(): Promise<void> {
    // Default implementation - can be overridden by concrete agents
    const testRequest: AgentInvokeRequest = {
      prompt: 'health check',
      sessionId: 'health-check',
      context: {}
    };
    
    const testContext: AgentExecutionContext = {
      sessionId: 'health-check',
      userId: 'system',
      requestId: 'health-check',
      timestamp: new Date().toISOString(),
      metadata: {}
    };

    // This will timeout quickly if the agent is not responsive
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), 5000);
    });

    await Promise.race([
      this.executeAgent('health check', testRequest, testContext),
      timeoutPromise
    ]);
  }

  /**
   * Generate a cache key for the request
   */
  protected generateCacheKey(request: AgentInvokeRequest): string {
    const key = `${this.capabilities.id}:${JSON.stringify(request)}`;
    return Buffer.from(key).toString('base64');
  }

  /**
   * Check if cached response is still valid
   */
  protected isCacheValid(entry: AgentMemoryEntry): boolean {
    if (!entry.ttl) return true;
    return Date.now() - new Date(entry.timestamp).getTime() < entry.ttl * 1000;
  }

  /**
   * Extract conversation history from memory
   */
  protected async getConversationHistory(sessionId: string): Promise<AgentInvokeRequest[]> {
    const historyKey = `conversation:${sessionId}`;
    const history = await this.memory.get(historyKey);
    return history?.value as AgentInvokeRequest[] || [];
  }

  /**
   * Store conversation history
   */
  protected async storeConversationHistory(
    sessionId: string, 
    request: AgentInvokeRequest
  ): Promise<void> {
    const historyKey = `conversation:${sessionId}`;
    const history = await this.getConversationHistory(sessionId);
    
    // Keep only last 50 messages
    const updatedHistory = [...history, request].slice(-50);
    
    // Store with 24 hour TTL
    await this.memory.set(historyKey, updatedHistory, 86400);
  }
}