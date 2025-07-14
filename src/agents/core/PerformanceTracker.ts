import { PerformanceMetrics } from '../../types';

interface ExecutionRecord {
  timestamp: number;
  duration: number;
  success: boolean;
  tokenCount?: number;
  cost?: number;
}

export class PerformanceTracker {
  private executions: ExecutionRecord[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private readonly maxRecords = 10000;

  constructor(private agentId: string) {
    // Cleanup old records periodically
    setInterval(() => this.cleanup(), 10 * 60 * 1000); // Every 10 minutes
  }

  recordExecution(duration: number, success: boolean, tokenCount?: number, cost?: number): void {
    const record: ExecutionRecord = {
      timestamp: Date.now(),
      duration,
      success,
      tokenCount,
      cost
    };

    this.executions.push(record);

    if (!success) {
      this.cacheMisses++;
    }

    // Keep only the most recent records
    if (this.executions.length > this.maxRecords) {
      this.executions = this.executions.slice(-this.maxRecords);
    }
  }

  recordCacheHit(): void {
    this.cacheHits++;
  }

  getMetrics(periodHours = 24): PerformanceMetrics {
    const cutoffTime = Date.now() - (periodHours * 60 * 60 * 1000);
    const recentExecutions = this.executions.filter(exec => exec.timestamp > cutoffTime);

    if (recentExecutions.length === 0) {
      return this.getEmptyMetrics(periodHours);
    }

    const successfulExecutions = recentExecutions.filter(exec => exec.success);
    const failedExecutions = recentExecutions.filter(exec => !exec.success);

    const durations = successfulExecutions.map(exec => exec.duration).sort((a, b) => a - b);
    const responseTime = this.calculatePercentiles(durations);

    const totalExecutions = recentExecutions.length;
    const totalCache = this.cacheHits + this.cacheMisses;
    const throughput = totalExecutions / periodHours;
    const errorRate = failedExecutions.length / totalExecutions;
    const successRate = successfulExecutions.length / totalExecutions;

    const totalTokens = recentExecutions.reduce((sum, exec) => sum + (exec.tokenCount || 0), 0);
    const totalCost = recentExecutions.reduce((sum, exec) => sum + (exec.cost || 0), 0);

    return {
      agentId: this.agentId,
      responseTime,
      throughput,
      errorRate,
      successRate,
      tokenUsage: totalTokens,
      cost: totalCost,
      period: `${periodHours}h`
    };
  }

  private calculatePercentiles(sortedDurations: number[]): { p50: number; p95: number; p99: number } {
    if (sortedDurations.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const getPercentile = (p: number): number => {
      const index = Math.ceil((p / 100) * sortedDurations.length) - 1;
      return sortedDurations[Math.max(0, Math.min(index, sortedDurations.length - 1))];
    };

    return {
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99)
    };
  }

  private getEmptyMetrics(periodHours: number): PerformanceMetrics {
    return {
      agentId: this.agentId,
      responseTime: { p50: 0, p95: 0, p99: 0 },
      throughput: 0,
      errorRate: 0,
      successRate: 0,
      tokenUsage: 0,
      cost: 0,
      period: `${periodHours}h`
    };
  }

  private cleanup(): void {
    // Remove records older than 7 days
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.executions = this.executions.filter(exec => exec.timestamp > cutoffTime);
  }

  /**
   * Get real-time performance statistics
   */
  getRealTimeStats(): {
    activeExecutions: number;
    averageResponseTime: number;
    recentErrorRate: number;
    cacheHitRate: number;
  } {
    const now = Date.now();
    const lastMinute = now - 60000;
    const recentExecutions = this.executions.filter(exec => exec.timestamp > lastMinute);

    const averageResponseTime = recentExecutions.length > 0
      ? recentExecutions.reduce((sum, exec) => sum + exec.duration, 0) / recentExecutions.length
      : 0;

    const recentErrors = recentExecutions.filter(exec => !exec.success).length;
    const recentErrorRate = recentExecutions.length > 0 ? recentErrors / recentExecutions.length : 0;

    const totalCache = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalCache > 0 ? this.cacheHits / totalCache : 0;

    return {
      activeExecutions: recentExecutions.length,
      averageResponseTime,
      recentErrorRate,
      cacheHitRate
    };
  }

  /**
   * Check if agent performance is degraded
   */
  isPerformanceDegraded(): boolean {
    const metrics = this.getMetrics(1); // Last hour
    const realtimeStats = this.getRealTimeStats();

    // Performance is considered degraded if:
    // 1. Error rate > 10%
    // 2. P95 response time > 30 seconds
    // 3. No successful executions in the last hour
    return (
      metrics.errorRate > 0.1 ||
      metrics.responseTime.p95 > 30000 ||
      (metrics.successRate === 0 && this.executions.length > 0)
    );
  }

  /**
   * Get performance alerts
   */
  getPerformanceAlerts(): string[] {
    const alerts: string[] = [];
    const metrics = this.getMetrics(1);
    const realtimeStats = this.getRealTimeStats();

    if (metrics.errorRate > 0.05) {
      alerts.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    }

    if (metrics.responseTime.p95 > 20000) {
      alerts.push(`Slow response time: P95 ${(metrics.responseTime.p95 / 1000).toFixed(1)}s`);
    }

    if (realtimeStats.cacheHitRate < 0.5 && this.cacheHits + this.cacheMisses > 10) {
      alerts.push(`Low cache hit rate: ${(realtimeStats.cacheHitRate * 100).toFixed(1)}%`);
    }

    if (metrics.throughput > 50) {
      alerts.push(`High load: ${metrics.throughput.toFixed(1)} requests/hour`);
    }

    return alerts;
  }

  /**
   * Export performance data for analysis
   */
  exportData(periodHours = 24): ExecutionRecord[] {
    const cutoffTime = Date.now() - (periodHours * 60 * 60 * 1000);
    return this.executions
      .filter(exec => exec.timestamp > cutoffTime)
      .map(exec => ({ ...exec })); // Return copy to prevent mutation
  }

  /**
   * Reset all performance data
   */
  reset(): void {
    this.executions = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}