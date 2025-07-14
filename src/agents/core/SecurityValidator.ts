import { AgentInvokeRequest, AgentExecutionContext, SecurityValidationResult } from '../../types';

export class SecurityValidator {
  private readonly patterns = {
    sqlInjection: [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*['"`;])/i,
      /((\%27)|(\'))\s*((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /(\b(OR|AND)\b\s*['"`;]*\s*\d+\s*[=<>]+\s*\d+)/i
    ],
    scriptInjection: [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi
    ],
    commandInjection: [
      /[;&|`$(){}[\]\\]/,
      /\b(eval|exec|system|shell_exec)\s*\(/i
    ],
    pathTraversal: [
      /\.\.\/|\.\.\\|\.\.\%2F|\.\.\%5C/,
      /(\/|\\)(etc|windows|system32)(\/|\\)/i
    ],
    ldapInjection: [
      /[*)(|=!><!&]/,
      /\(\s*\|\s*\(/
    ],
    xpathInjection: [
      /['"]\s*\[\s*\]\s*\|\s*\[\s*\]\s*['"]/,
      /(or|and)\s+[^=]*\s*=\s*[^=]*/i
    ]
  };

  private readonly maxPromptLength = 50000;
  private readonly maxContextSize = 100000;
  private readonly blockedKeywords = [
    'password', 'secret', 'token', 'key', 'credential',
    'admin', 'root', 'sudo', 'chmod', 'rm -rf'
  ];

  async validate(
    request: AgentInvokeRequest,
    context: AgentExecutionContext
  ): Promise<SecurityValidationResult> {
    const violations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // 1. Input length validation
    if (request.prompt.length > this.maxPromptLength) {
      violations.push(`Prompt exceeds maximum length of ${this.maxPromptLength} characters`);
      riskLevel = this.escalateRisk(riskLevel, 'medium');
    }

    if (JSON.stringify(request.context || {}).length > this.maxContextSize) {
      violations.push(`Context exceeds maximum size of ${this.maxContextSize} characters`);
      riskLevel = this.escalateRisk(riskLevel, 'medium');
    }

    // 2. Injection attack detection
    const injectionResults = this.detectInjectionAttacks(request.prompt);
    if (injectionResults.length > 0) {
      violations.push(...injectionResults);
      riskLevel = this.escalateRisk(riskLevel, 'critical');
    }

    // 3. Blocked keywords check
    const keywordViolations = this.checkBlockedKeywords(request.prompt);
    if (keywordViolations.length > 0) {
      violations.push(...keywordViolations);
      riskLevel = this.escalateRisk(riskLevel, 'high');
    }

    // 4. Content policy validation
    const contentViolations = this.validateContentPolicy(request.prompt);
    if (contentViolations.length > 0) {
      violations.push(...contentViolations);
      riskLevel = this.escalateRisk(riskLevel, 'medium');
    }

    // 5. User permission validation
    const permissionResult = await this.validateUserPermissions(context);
    if (!permissionResult.isValid) {
      violations.push('User lacks required permissions for this operation');
      riskLevel = this.escalateRisk(riskLevel, 'high');
    }

    return {
      passed: violations.length === 0,
      violations,
      riskLevel
    };
  }

  private detectInjectionAttacks(input: string): string[] {
    const violations: string[] = [];

    // SQL Injection
    if (this.matchesPatterns(input, this.patterns.sqlInjection)) {
      violations.push('Potential SQL injection detected');
    }

    // Script Injection
    if (this.matchesPatterns(input, this.patterns.scriptInjection)) {
      violations.push('Potential script injection detected');
    }

    // Command Injection
    if (this.matchesPatterns(input, this.patterns.commandInjection)) {
      violations.push('Potential command injection detected');
    }

    // Path Traversal
    if (this.matchesPatterns(input, this.patterns.pathTraversal)) {
      violations.push('Potential path traversal detected');
    }

    // LDAP Injection
    if (this.matchesPatterns(input, this.patterns.ldapInjection)) {
      violations.push('Potential LDAP injection detected');
    }

    // XPath Injection
    if (this.matchesPatterns(input, this.patterns.xpathInjection)) {
      violations.push('Potential XPath injection detected');
    }

    return violations;
  }

  private matchesPatterns(input: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(input));
  }

  private checkBlockedKeywords(input: string): string[] {
    const violations: string[] = [];
    const lowerInput = input.toLowerCase();

    for (const keyword of this.blockedKeywords) {
      if (lowerInput.includes(keyword)) {
        violations.push(`Blocked keyword detected: ${keyword}`);
      }
    }

    return violations;
  }

  private validateContentPolicy(input: string): string[] {
    const violations: string[] = [];

    // Check for excessive profanity or inappropriate content
    // This is a simplified implementation - in production, you'd use more sophisticated content filtering
    const inappropriatePatterns = [
      /\b(hate|violence|harm)\b.*\b(promote|encourage|incite)\b/i,
      /\b(illegal|fraud|scam)\b.*\b(instructions|how to|guide)\b/i
    ];

    if (this.matchesPatterns(input, inappropriatePatterns)) {
      violations.push('Content policy violation detected');
    }

    return violations;
  }

  private async validateUserPermissions(context: AgentExecutionContext): Promise<{ isValid: boolean }> {
    // In a real implementation, this would check against a user permissions system
    // For now, we'll just validate that required fields are present
    if (!context.userId || !context.sessionId) {
      return { isValid: false };
    }

    // Additional permission checks could be added here
    // e.g., checking if user has access to specific agents or capabilities

    return { isValid: true };
  }

  private escalateRisk(
    current: 'low' | 'medium' | 'high' | 'critical',
    newLevel: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(current);
    const newIndex = levels.indexOf(newLevel);
    
    return levels[Math.max(currentIndex, newIndex)] as 'low' | 'medium' | 'high' | 'critical';
  }

  /**
   * Sanitize input by removing potentially dangerous content
   */
  sanitizeInput(input: string): string {
    let sanitized = input;

    // Remove script tags
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    
    // Remove javascript: and vbscript: protocols
    sanitized = sanitized.replace(/javascript:|vbscript:/gi, '');
    
    // Remove SQL comment patterns
    sanitized = sanitized.replace(/--.*$/gm, '');
    sanitized = sanitized.replace(/\/\*.*?\*\//gs, '');

    // Encode special characters
    sanitized = sanitized.replace(/[<>'"&]/g, (match) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match] || match;
    });

    return sanitized;
  }
}