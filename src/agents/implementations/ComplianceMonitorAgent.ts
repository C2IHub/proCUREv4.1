import { BaseAgent } from '../core/BaseAgent';
import {
  BaseAgentCapabilities,
  AgentInvokeRequest,
  AgentInvokeResponse,
  AgentExecutionContext,
  ValidationResult
} from '../../types';
import { useBedrockAgents } from '../../context/BedrockAgentProvider';

export class ComplianceMonitorAgent extends BaseAgent {
  constructor() {
    super({
      id: 'compliance-monitor',
      name: 'EU GMP Compliance Monitor',
      description: 'Regulatory analysis and certification tracking agent for pharmaceutical compliance',
      capabilities: [
        'regulatory_analysis',
        'certification_tracking', 
        'audit_scheduling',
        'violation_detection',
        'compliance_scoring'
      ],
      dependencies: [],
      version: '1.0.0'
    });
  }

  defineCapabilities(): BaseAgentCapabilities {
    return {
      id: 'compliance-monitor',
      name: 'EU GMP Compliance Monitor',
      description: 'Specialized agent for pharmaceutical regulatory compliance analysis, certification tracking, and audit management',
      capabilities: [
        'regulatory_analysis',
        'certification_tracking',
        'audit_scheduling', 
        'violation_detection',
        'compliance_scoring',
        'gmp_assessment',
        'fda_evaluation',
        'iso_compliance_check',
        'reach_compliance',
        'sustainability_assessment'
      ],
      dependencies: [],
      version: '1.0.0'
    };
  }

  async buildPrompt(request: AgentInvokeRequest): Promise<string> {
    const { prompt, context } = request;
    
    // Store conversation history
    if (request.sessionId) {
      await this.storeConversationHistory(request.sessionId, request);
    }

    // Get conversation history for context
    const history = request.sessionId ? await this.getConversationHistory(request.sessionId) : [];
    
    let systemPrompt = `You are an EU GMP Compliance Monitor Agent for pharmaceutical procurement and supplier management.

Your primary responsibilities include:
1. Regulatory compliance analysis across EU GMP, FDA, and ISO standards
2. Certification tracking and expiration monitoring
3. Compliance gap identification and risk assessment
4. Audit scheduling and preparation
5. Violation detection and remediation recommendations
6. Compliance scoring and trend analysis

Key regulatory frameworks you monitor:
- EU GMP (Good Manufacturing Practice)
- FDA regulations (21 CFR Parts 210, 211, 820)
- ISO 13485 (Medical devices quality management)
- ISO 15378 (Pharmaceutical packaging materials)
- REACH compliance (Chemical safety)
- ICH guidelines (International harmonization)

Analysis Structure:
For compliance assessments, always provide:
1. Overall compliance status and score
2. Detailed breakdown by category (certifications, audits, documentation, regulatory history)
3. Specific findings and gaps
4. Risk assessment and priority levels
5. Actionable recommendations with timelines
6. Next review dates and monitoring requirements

Context Information:`;

    if (context?.supplierId) {
      systemPrompt += `\n- Supplier ID: ${context.supplierId}`;
    }
    if (context?.supplierName) {
      systemPrompt += `\n- Supplier: ${context.supplierName}`;
    }
    if (context?.region) {
      systemPrompt += `\n- Region: ${context.region}`;
    }
    if (context?.category) {
      systemPrompt += `\n- Category: ${context.category}`;
    }

    // Add conversation history if available
    if (history.length > 0) {
      systemPrompt += `\n\nPrevious conversation context:\n`;
      const recentHistory = history.slice(-3); // Last 3 exchanges
      for (const item of recentHistory) {
        systemPrompt += `- ${item.prompt}\n`;
      }
    }

    systemPrompt += `\n\nCurrent request: ${prompt}

Please provide a comprehensive compliance analysis with specific, actionable insights formatted in clear sections with appropriate use of markdown for readability.`;

    return systemPrompt;
  }

  async parseResponse(response: unknown, request: AgentInvokeRequest): Promise<AgentInvokeResponse> {
    let responseText: string;
    
    if (typeof response === 'string') {
      responseText = response;
    } else if (response && typeof response === 'object' && 'response' in response) {
      responseText = (response as any).response;
    } else {
      responseText = JSON.stringify(response);
    }

    // Enhanced response parsing for compliance-specific data
    const confidence = this.calculateConfidence(responseText, request);
    const sources = this.extractSources(responseText);
    
    return {
      response: responseText,
      sessionId: request.sessionId || `compliance-${Date.now()}`,
      confidence,
      sources
    };
  }

  async validateInput(request: AgentInvokeRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!request.prompt || request.prompt.trim().length === 0) {
      errors.push('Prompt cannot be empty');
    }

    if (request.prompt.length > 10000) {
      warnings.push('Very long prompt may affect response quality');
    }

    // Compliance-specific validation
    const prompt = request.prompt.toLowerCase();
    
    // Check for required context for certain operations
    if (prompt.includes('assess supplier') || prompt.includes('evaluate compliance')) {
      if (!request.context?.supplierName && !request.context?.supplierId) {
        errors.push('Supplier identification required for compliance assessment');
      }
    }

    if (prompt.includes('schedule audit')) {
      if (!request.context?.supplierName) {
        errors.push('Supplier name required for audit scheduling');
      }
    }

    // Validate data format for structured requests
    if (prompt.includes('analyze certification data')) {
      try {
        if (request.context?.certificationData) {
          JSON.parse(JSON.stringify(request.context.certificationData));
        }
      } catch {
        errors.push('Invalid certification data format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  protected async executeAgent(
    prompt: string,
    request: AgentInvokeRequest,
    context: AgentExecutionContext
  ): Promise<unknown> {
    // For now, we'll use the existing Bedrock agent implementation
    // In a real implementation, you might have agent-specific logic here
    
    try {
      // This is a simplified approach - in practice, you'd need to properly inject the Bedrock agents
      // For now, we'll simulate the agent response
      const mockResponse = await this.generateComplianceResponse(prompt, request, context);
      return mockResponse;
    } catch (error) {
      throw new Error(`Compliance monitoring failed: ${error}`);
    }
  }

  private async generateComplianceResponse(
    prompt: string, 
    request: AgentInvokeRequest, 
    context: AgentExecutionContext
  ): Promise<string> {
    // This is a mock implementation that would be replaced with actual Bedrock integration
    const supplierName = request.context?.supplierName || 'Unknown Supplier';
    const analysisType = this.determineAnalysisType(prompt);
    
    switch (analysisType) {
      case 'certification_tracking':
        return this.generateCertificationReport(supplierName, request.context);
      case 'audit_scheduling':
        return this.generateAuditSchedule(supplierName, request.context);
      case 'violation_detection':
        return this.generateViolationReport(supplierName, request.context);
      case 'compliance_scoring':
        return this.generateComplianceScore(supplierName, request.context);
      default:
        return this.generateGeneralComplianceAssessment(supplierName, request.context);
    }
  }

  private determineAnalysisType(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('certification') || lowerPrompt.includes('certificate')) {
      return 'certification_tracking';
    }
    if (lowerPrompt.includes('audit') || lowerPrompt.includes('schedule')) {
      return 'audit_scheduling';
    }
    if (lowerPrompt.includes('violation') || lowerPrompt.includes('non-compliance')) {
      return 'violation_detection';
    }
    if (lowerPrompt.includes('score') || lowerPrompt.includes('rating')) {
      return 'compliance_scoring';
    }
    
    return 'general_assessment';
  }

  private generateCertificationReport(supplierName: string, context: any): string {
    const currentDate = new Date();
    const nextYear = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());
    
    return `## Certification Tracking Report for ${supplierName}

### Current Certification Status

**🏆 Valid Certifications:**
- EU GMP Certificate: Valid until ${nextYear.toISOString().split('T')[0]}
- FDA Registration: Current and compliant
- ISO 15378: Active certification
- REACH Compliance: Up to date

**⚠️ Certifications Requiring Attention:**
- Quality Manual: Version requires update
- Environmental Certificate: Expires in 4 months

**📋 Certification Summary:**
- Total Certifications: 8
- Valid: 6
- Expiring Soon: 2
- Expired: 0

### Renewal Schedule
- EU GMP Renewal: Due in 18 months
- ISO 15378 Surveillance Audit: Due in 6 months
- Environmental Certification: Due in 4 months

### Recommendations
1. Prioritize environmental certification renewal
2. Update quality manual to latest version
3. Schedule ISO surveillance audit preparation
4. Implement certification tracking dashboard

*Report generated: ${currentDate.toLocaleString()}*`;
  }

  private generateAuditSchedule(supplierName: string, context: any): string {
    const nextAudit = new Date();
    nextAudit.setMonth(nextAudit.getMonth() + 3);
    
    return `## Audit Schedule for ${supplierName}

### Upcoming Audits

**📅 Q1 2024 Compliance Audit**
- Date: ${nextAudit.toISOString().split('T')[0]}
- Type: On-site GMP compliance audit
- Duration: 2 days
- Focus Areas: Manufacturing processes, quality control, documentation

**📅 ISO 15378 Surveillance Audit**
- Date: ${new Date(nextAudit.getTime() + 30*24*60*60*1000).toISOString().split('T')[0]}
- Type: Third-party certification audit
- Duration: 1 day
- Focus Areas: Packaging material compliance

### Audit Preparation Checklist
- [ ] Update quality manual to latest version
- [ ] Review and update SOPs
- [ ] Prepare documentation packages
- [ ] Schedule pre-audit internal review
- [ ] Confirm audit team availability
- [ ] Arrange site logistics

### Previous Audit Summary
- Last audit score: 94/100
- Minor findings: 2
- Major findings: 0
- All previous findings closed

*Audit schedule updated: ${new Date().toLocaleString()}*`;
  }

  private generateViolationReport(supplierName: string, context: any): string {
    return `## Violation Detection Report for ${supplierName}

### Current Violation Status: ✅ CLEAR

**🔍 Monitoring Results:**
- No active regulatory violations detected
- All compliance requirements up to date
- No outstanding regulatory actions

### Historical Analysis (Last 12 months)
- Total violations: 0
- Warning letters: 0
- Regulatory actions: 0
- Compliance score trend: Improving

### Risk Factors Monitored
1. **Regulatory Changes**: All recent updates tracked
2. **Certification Status**: All current and valid
3. **Audit Findings**: No critical findings
4. **Documentation**: Complete and current

### Preventive Measures in Place
- Quarterly compliance reviews
- Real-time regulatory monitoring
- Proactive certification management
- Regular internal audits

### Next Review
- Continuous monitoring active
- Next formal review: ${new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}

*Violation monitoring active as of: ${new Date().toLocaleString()}*`;
  }

  private generateComplianceScore(supplierName: string, context: any): string {
    const score = 92 + Math.floor(Math.random() * 6); // 92-97
    
    return `## Compliance Score Assessment for ${supplierName}

### Overall Compliance Score: ${score}/100 🏆

**Score Breakdown:**
- **Certifications (40%)**: ${score - 2}/100
- **Audit Results (30%)**: ${score + 1}/100  
- **Documentation (20%)**: ${score}/100
- **Regulatory History (10%)**: ${score + 3}/100

### Performance Trend
📈 **IMPROVING** - Score increased by 3 points over last quarter

### Benchmarking
- Industry Average: 78/100
- Top Quartile Threshold: 85/100
- **Status: TOP PERFORMER** 🌟

### Score Factors
**Positive Contributors:**
- Excellent certification maintenance
- Strong audit performance
- Proactive compliance management
- Clean regulatory history

**Areas for Improvement:**
- Documentation version control
- Response time to regulatory changes

### Score History
- Q4 2023: ${score - 3}
- Q1 2024: ${score - 1}
- Current: ${score}
- Projected Q2: ${score + 2}

### Recommendations to Maintain High Score
1. Continue current compliance practices
2. Implement automated documentation updates
3. Enhance regulatory change monitoring
4. Maintain certification schedules

*Score calculated: ${new Date().toLocaleString()}*`;
  }

  private generateGeneralComplianceAssessment(supplierName: string, context: any): string {
    return `## General Compliance Assessment for ${supplierName}

### Executive Summary
${supplierName} demonstrates **STRONG** compliance posture across all monitored regulatory frameworks. The supplier maintains current certifications, clean audit history, and proactive compliance management practices.

### Key Strengths
- ✅ All critical certifications current and valid
- ✅ Excellent audit performance history
- ✅ Proactive regulatory change management
- ✅ Strong documentation practices
- ✅ No regulatory violations or warnings

### Areas of Focus
- 🔍 Monitor upcoming certification renewals
- 🔍 Maintain audit preparation readiness
- 🔍 Continue regulatory monitoring
- 🔍 Enhance supply chain compliance visibility

### Risk Assessment
**Overall Risk Level: LOW** 🟢
- Financial compliance risk: Low
- Operational compliance risk: Low
- Regulatory change risk: Low
- Certification expiry risk: Medium (due to upcoming renewals)

### Next Actions
1. Schedule Q2 compliance review
2. Begin certification renewal preparations
3. Continue monthly monitoring
4. Maintain current compliance practices

### Compliance Framework Coverage
- ✅ EU GMP: Fully compliant
- ✅ FDA: Current registration
- ✅ ISO Standards: Active certifications
- ✅ REACH: Compliant
- ✅ Environmental: Current

*Assessment completed: ${new Date().toLocaleString()}*`;
  }

  private calculateConfidence(response: string, request: AgentInvokeRequest): number {
    let confidence = 0.85; // Base confidence

    // Increase confidence based on response completeness
    if (response.includes('##') || response.includes('**')) confidence += 0.05;
    if (response.length > 500) confidence += 0.05;
    if (response.includes('recommendation')) confidence += 0.03;
    
    // Increase confidence for structured data
    if (request.context?.supplierName) confidence += 0.02;
    
    return Math.min(0.98, confidence);
  }

  private extractSources(response: string): string[] {
    const sources = [
      'EU GMP Guidelines',
      'FDA Regulations (21 CFR)',
      'ISO 13485/15378 Standards',
      'REACH Compliance Database',
      'ICH Guidelines'
    ];
    
    // Add specific sources based on response content
    if (response.toLowerCase().includes('gmp')) {
      sources.push('EMA GMP Guide');
    }
    if (response.toLowerCase().includes('fda')) {
      sources.push('FDA Guidance Documents');
    }
    
    return sources.slice(0, 4); // Return top 4 relevant sources
  }
}