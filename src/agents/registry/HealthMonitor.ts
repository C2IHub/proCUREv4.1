import { AgentId, AgentHealth } from '../../types';
import type { AgentRegistry } from './AgentRegistry';

export class HealthMonitor {
  private healthChecks = new Map<AgentId, NodeJS.Timeout>();
  private healthStatus = new Map<AgentId, AgentHealth>();
  private readonly checkInterval = 30000; // 30 seconds
  private readonly healthTimeout = 10000; // 10 seconds

  constructor(private registry: AgentRegistry) {}

  /**
   * Start monitoring an agent's health
   */
  startMonitoring(agentId: AgentId): void {
    if (this.healthChecks.has(agentId)) {
      this.stopMonitoring(agentId);
    }

    // Initialize health status
    this.healthStatus.set(agentId, {
      agentId,
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: 0,
      errorRate: 0,
      uptime: 0
    });

    // Start periodic health checks
    const intervalId = setInterval(() => {
      this.performHealthCheck(agentId);
    }, this.checkInterval);

    this.healthChecks.set(agentId, intervalId);

    // Perform initial health check
    this.performHealthCheck(agentId);
  }

  /**
   * Stop monitoring an agent's health
   */
  stopMonitoring(agentId: AgentId): void {
    const intervalId = this.healthChecks.get(agentId);
    if (intervalId) {
      clearInterval(intervalId);
      this.healthChecks.delete(agentId);
    }
    this.healthStatus.delete(agentId);
  }

  /**
   * Get health status for a specific agent
   */
  async getHealth(agentId: AgentId): Promise<AgentHealth | null> {
    return this.healthStatus.get(agentId) || null;
  }

  /**
   * Get health status for all monitored agents
   */
  async getAllHealth(): Promise<Map<AgentId, AgentHealth>> {
    return new Map(this.healthStatus);
  }

  /**
   * Get count of healthy agents
   */
  getHealthyAgentCount(): number {
    let count = 0;
    for (const health of this.healthStatus.values()) {
      if (health.status === 'healthy') {
        count++;
      }
    }
    return count;
  }

  /**
   * Get agents with degraded performance
   */
  getDegradedAgents(): AgentId[] {
    const degraded: AgentId[] = [];
    for (const [agentId, health] of this.healthStatus.entries()) {
      if (health.status === 'degraded') {
        degraded.push(agentId);
      }
    }
    return degraded;
  }

  /**
   * Get unhealthy agents
   */
  getUnhealthyAgents(): AgentId[] {
    const unhealthy: AgentId[] = [];
    for (const [agentId, health] of this.healthStatus.entries()) {
      if (health.status === 'unhealthy') {
        unhealthy.push(agentId);
      }
    }
    return unhealthy;
  }

  /**
   * Force a health check for a specific agent
   */
  async forceHealthCheck(agentId: AgentId): Promise<AgentHealth | null> {
    await this.performHealthCheck(agentId);
    return this.healthStatus.get(agentId) || null;
  }

  /**
   * Get health summary for all agents
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    lastUpdate: string;
  } {
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    for (const health of this.healthStatus.values()) {
      switch (health.status) {
        case 'healthy':
          healthy++;
          break;
        case 'degraded':
          degraded++;
          break;
        case 'unhealthy':
          unhealthy++;
          break;
      }
    }

    return {
      total: this.healthStatus.size,
      healthy,
      degraded,
      unhealthy,
      lastUpdate: new Date().toISOString()
    };
  }

  private async performHealthCheck(agentId: AgentId): Promise<void> {
    const agent = this.registry.getAgent(agentId);
    if (!agent) {
      this.healthStatus.delete(agentId);
      return;
    }

    const startTime = Date.now();
    let health: AgentHealth;

    try {
      // Perform health check with timeout
      const healthPromise = agent.getHealth();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), this.healthTimeout);
      });

      const result = await Promise.race([healthPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;

      // Get performance metrics to calculate error rate
      const metrics = agent.getPerformanceMetrics();
      
      // Determine health status based on various factors
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (result.status === 'unhealthy') {
        status = 'unhealthy';
      } else if (
        result.status === 'degraded' ||
        responseTime > 5000 || // Slow response
        metrics.errorRate > 0.1 || // High error rate
        metrics.responseTime.p95 > 30000 // Slow P95
      ) {
        status = 'degraded';
      }

      // Calculate uptime (simplified - in production, you'd track actual uptime)
      const previousHealth = this.healthStatus.get(agentId);
      const uptime = previousHealth 
        ? this.calculateUptime(previousHealth, status)
        : 100; // New agent starts at 100% uptime

      health = {
        agentId,
        status,
        lastCheck: new Date().toISOString(),
        responseTime,
        errorRate: metrics.errorRate,
        uptime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const previousHealth = this.healthStatus.get(agentId);
      const uptime = previousHealth 
        ? this.calculateUptime(previousHealth, 'unhealthy')
        : 0;

      health = {
        agentId,
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        errorRate: 1.0, // 100% error rate if health check fails
        uptime
      };

      console.error(`Health check failed for agent ${agentId}:`, error);
    }

    this.healthStatus.set(agentId, health);

    // Emit health change events (in a real implementation, you might use an event system)
    this.handleHealthChange(agentId, health);
  }

  private calculateUptime(previousHealth: AgentHealth, currentStatus: 'healthy' | 'degraded' | 'unhealthy'): number {
    const timeSinceLastCheck = Date.now() - new Date(previousHealth.lastCheck).getTime();
    const intervalInHours = timeSinceLastCheck / (1000 * 60 * 60);
    
    // Simple uptime calculation: if current check is healthy/degraded, count as uptime
    const uptimeContribution = (currentStatus === 'healthy' || currentStatus === 'degraded') ? 1 : 0;
    
    // Rolling average over time (simplified)
    const weight = Math.min(intervalInHours / 24, 1); // Give more weight to recent checks
    return previousHealth.uptime * (1 - weight) + (uptimeContribution * 100 * weight);
  }

  private handleHealthChange(agentId: AgentId, health: AgentHealth): void {
    const previousHealth = this.healthStatus.get(agentId);
    
    // Log significant health changes
    if (!previousHealth || previousHealth.status !== health.status) {
      console.log(`Agent ${agentId} health changed: ${previousHealth?.status || 'unknown'} -> ${health.status}`);
      
      // In a real implementation, you might:
      // - Send alerts for unhealthy agents
      // - Update monitoring dashboards
      // - Trigger automatic recovery procedures
      // - Notify administrators
      
      if (health.status === 'unhealthy') {
        console.warn(`🚨 Agent ${agentId} is unhealthy - response time: ${health.responseTime}ms, error rate: ${(health.errorRate * 100).toFixed(1)}%`);
      } else if (health.status === 'degraded') {
        console.warn(`⚠️ Agent ${agentId} performance is degraded - response time: ${health.responseTime}ms, error rate: ${(health.errorRate * 100).toFixed(1)}%`);
      } else if (previousHealth && previousHealth.status !== 'healthy') {
        console.log(`✅ Agent ${agentId} has recovered to healthy status`);
      }
    }
  }

  /**
   * Get health alerts that need attention
   */
  getHealthAlerts(): Array<{
    agentId: AgentId;
    level: 'warning' | 'critical';
    message: string;
    timestamp: string;
  }> {
    const alerts: Array<{
      agentId: AgentId;
      level: 'warning' | 'critical';
      message: string;
      timestamp: string;
    }> = [];

    for (const [agentId, health] of this.healthStatus.entries()) {
      if (health.status === 'unhealthy') {
        alerts.push({
          agentId,
          level: 'critical',
          message: `Agent is unhealthy - Error rate: ${(health.errorRate * 100).toFixed(1)}%, Response time: ${health.responseTime}ms`,
          timestamp: health.lastCheck
        });
      } else if (health.status === 'degraded') {
        alerts.push({
          agentId,
          level: 'warning',
          message: `Agent performance is degraded - Error rate: ${(health.errorRate * 100).toFixed(1)}%, Response time: ${health.responseTime}ms`,
          timestamp: health.lastCheck
        });
      } else if (health.uptime < 95) {
        alerts.push({
          agentId,
          level: 'warning',
          message: `Low uptime: ${health.uptime.toFixed(1)}%`,
          timestamp: health.lastCheck
        });
      }
    }

    return alerts.sort((a, b) => {
      // Sort by level (critical first) then by timestamp (newest first)
      if (a.level !== b.level) {
        return a.level === 'critical' ? -1 : 1;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  /**
   * Export health data for analysis
   */
  exportHealthData(): Record<AgentId, AgentHealth> {
    const exported: Record<AgentId, AgentHealth> = {};
    for (const [agentId, health] of this.healthStatus.entries()) {
      exported[agentId] = { ...health };
    }
    return exported;
  }

  /**
   * Cleanup - stop all monitoring
   */
  cleanup(): void {
    for (const intervalId of this.healthChecks.values()) {
      clearInterval(intervalId);
    }
    this.healthChecks.clear();
    this.healthStatus.clear();
  }
}