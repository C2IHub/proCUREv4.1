import { RateLimitResult } from '../../types';

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  burstWindowMs: number;
}

interface UserLimits {
  requestsThisMinute: number;
  requestsThisHour: number;
  minuteWindowStart: number;
  hourWindowStart: number;
  burstRequests: number;
  burstWindowStart: number;
}

export class RateLimiter {
  private userLimits = new Map<string, UserLimits>();
  private agentLimits = new Map<string, UserLimits>();
  
  private readonly defaultConfig: RateLimitConfig = {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    burstLimit: 10,
    burstWindowMs: 1000
  };

  private readonly agentConfigs = new Map<string, RateLimitConfig>();

  constructor() {
    // Set specific limits for different agent types
    this.agentConfigs.set('compliance-monitor', {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      burstLimit: 5,
      burstWindowMs: 2000
    });

    this.agentConfigs.set('risk-predictor', {
      requestsPerMinute: 20,
      requestsPerHour: 300,
      burstLimit: 3,
      burstWindowMs: 3000
    });

    this.agentConfigs.set('document-intelligence', {
      requestsPerMinute: 40,
      requestsPerHour: 600,
      burstLimit: 8,
      burstWindowMs: 1500
    });

    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async checkLimit(userId: string, agentId: string): Promise<RateLimitResult> {
    const now = Date.now();
    const config = this.agentConfigs.get(agentId) || this.defaultConfig;

    // Check user-level limits
    const userResult = this.checkUserLimit(userId, config, now);
    if (!userResult.allowed) {
      return userResult;
    }

    // Check agent-level limits
    const agentResult = this.checkAgentLimit(agentId, config, now);
    if (!agentResult.allowed) {
      return agentResult;
    }

    // Both limits passed - update counters
    this.updateCounters(userId, agentId, now);

    return {
      allowed: true,
      remaining: Math.min(userResult.remaining, agentResult.remaining),
      resetTime: Math.max(userResult.resetTime, agentResult.resetTime)
    };
  }

  private checkUserLimit(userId: string, config: RateLimitConfig, now: number): RateLimitResult {
    const userKey = `user:${userId}`;
    let limits = this.userLimits.get(userKey);

    if (!limits) {
      limits = this.initializeLimits(now);
      this.userLimits.set(userKey, limits);
    }

    return this.evaluateLimits(limits, config, now);
  }

  private checkAgentLimit(agentId: string, config: RateLimitConfig, now: number): RateLimitResult {
    const agentKey = `agent:${agentId}`;
    let limits = this.agentLimits.get(agentKey);

    if (!limits) {
      limits = this.initializeLimits(now);
      this.agentLimits.set(agentKey, limits);
    }

    return this.evaluateLimits(limits, config, now);
  }

  private initializeLimits(now: number): UserLimits {
    return {
      requestsThisMinute: 0,
      requestsThisHour: 0,
      minuteWindowStart: now,
      hourWindowStart: now,
      burstRequests: 0,
      burstWindowStart: now
    };
  }

  private evaluateLimits(limits: UserLimits, config: RateLimitConfig, now: number): RateLimitResult {
    // Reset windows if needed
    this.resetWindowsIfNeeded(limits, now);

    // Check burst limit
    if (now - limits.burstWindowStart < config.burstWindowMs) {
      if (limits.burstRequests >= config.burstLimit) {
        const retryAfter = Math.ceil((config.burstWindowMs - (now - limits.burstWindowStart)) / 1000);
        return {
          allowed: false,
          remaining: 0,
          resetTime: limits.burstWindowStart + config.burstWindowMs,
          retryAfter
        };
      }
    } else {
      // Reset burst window
      limits.burstRequests = 0;
      limits.burstWindowStart = now;
    }

    // Check minute limit
    if (limits.requestsThisMinute >= config.requestsPerMinute) {
      const retryAfter = Math.ceil((60000 - (now - limits.minuteWindowStart)) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: limits.minuteWindowStart + 60000,
        retryAfter
      };
    }

    // Check hour limit
    if (limits.requestsThisHour >= config.requestsPerHour) {
      const retryAfter = Math.ceil((3600000 - (now - limits.hourWindowStart)) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: limits.hourWindowStart + 3600000,
        retryAfter
      };
    }

    // All limits passed
    const remaining = Math.min(
      config.requestsPerMinute - limits.requestsThisMinute,
      config.requestsPerHour - limits.requestsThisHour,
      config.burstLimit - limits.burstRequests
    );

    return {
      allowed: true,
      remaining,
      resetTime: Math.max(
        limits.minuteWindowStart + 60000,
        limits.hourWindowStart + 3600000,
        limits.burstWindowStart + config.burstWindowMs
      )
    };
  }

  private resetWindowsIfNeeded(limits: UserLimits, now: number): void {
    // Reset minute window
    if (now - limits.minuteWindowStart >= 60000) {
      limits.requestsThisMinute = 0;
      limits.minuteWindowStart = now;
    }

    // Reset hour window
    if (now - limits.hourWindowStart >= 3600000) {
      limits.requestsThisHour = 0;
      limits.hourWindowStart = now;
    }
  }

  private updateCounters(userId: string, agentId: string, now: number): void {
    // Update user counters
    const userKey = `user:${userId}`;
    const userLimits = this.userLimits.get(userKey)!;
    userLimits.requestsThisMinute++;
    userLimits.requestsThisHour++;
    userLimits.burstRequests++;

    // Update agent counters
    const agentKey = `agent:${agentId}`;
    const agentLimits = this.agentLimits.get(agentKey)!;
    agentLimits.requestsThisMinute++;
    agentLimits.requestsThisHour++;
    agentLimits.burstRequests++;
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 2 * 3600000; // 2 hours

    // Cleanup user limits
    for (const [key, limits] of this.userLimits.entries()) {
      if (now - limits.hourWindowStart > maxAge) {
        this.userLimits.delete(key);
      }
    }

    // Cleanup agent limits
    for (const [key, limits] of this.agentLimits.entries()) {
      if (now - limits.hourWindowStart > maxAge) {
        this.agentLimits.delete(key);
      }
    }
  }

  /**
   * Get current limit status for a user and agent
   */
  getLimitStatus(userId: string, agentId: string): {
    user: { minuteRemaining: number; hourRemaining: number };
    agent: { minuteRemaining: number; hourRemaining: number };
  } {
    const config = this.agentConfigs.get(agentId) || this.defaultConfig;
    const now = Date.now();

    const userLimits = this.userLimits.get(`user:${userId}`);
    const agentLimits = this.agentLimits.get(`agent:${agentId}`);

    const getUserRemaining = () => {
      if (!userLimits) return { minuteRemaining: config.requestsPerMinute, hourRemaining: config.requestsPerHour };
      
      this.resetWindowsIfNeeded(userLimits, now);
      return {
        minuteRemaining: config.requestsPerMinute - userLimits.requestsThisMinute,
        hourRemaining: config.requestsPerHour - userLimits.requestsThisHour
      };
    };

    const getAgentRemaining = () => {
      if (!agentLimits) return { minuteRemaining: config.requestsPerMinute, hourRemaining: config.requestsPerHour };
      
      this.resetWindowsIfNeeded(agentLimits, now);
      return {
        minuteRemaining: config.requestsPerMinute - agentLimits.requestsThisMinute,
        hourRemaining: config.requestsPerHour - agentLimits.requestsThisHour
      };
    };

    return {
      user: getUserRemaining(),
      agent: getAgentRemaining()
    };
  }

  /**
   * Reset limits for a specific user (admin function)
   */
  resetUserLimits(userId: string): void {
    this.userLimits.delete(`user:${userId}`);
  }

  /**
   * Reset limits for a specific agent (admin function)
   */
  resetAgentLimits(agentId: string): void {
    this.agentLimits.delete(`agent:${agentId}`);
  }

  /**
   * Set custom limits for a specific agent
   */
  setAgentLimits(agentId: string, config: RateLimitConfig): void {
    this.agentConfigs.set(agentId, config);
  }
}