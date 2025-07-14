import React, { createContext, useContext, ReactNode } from 'react';
import { BedrockAgentConfig, AgentInvokeRequest, AgentInvokeResponse } from '../types';

// Conditionally import AWS SDK only when Bedrock is enabled
let BedrockAgentRuntime: any = null;
if (typeof window === 'undefined' || process.env.BEDROCK_ENABLED === 'true') {
  try {
    BedrockAgentRuntime = require('@aws-sdk/client-bedrock-agent-runtime').BedrockAgentRuntime;
  } catch (error) {
    console.warn('AWS SDK not available - using mock agents only');
  }
}

interface BedrockAgentContextValue {
  complianceAgent: BedrockAgent;
  riskAgent: BedrockAgent;
  documentAgent: BedrockAgent;
  isConfigured: boolean;
}

interface BedrockAgent {
  invoke: (request: AgentInvokeRequest) => Promise<AgentInvokeResponse>;
  agentId: string;
  status: 'available' | 'unavailable' | 'error';
}

interface BedrockAgentProviderProps {
  children: ReactNode;
  config?: {
    compliance?: BedrockAgentConfig;
    risk?: BedrockAgentConfig;
    document?: BedrockAgentConfig;
  };
}

const BedrockAgentContext = createContext<BedrockAgentContextValue | null>(null);

// Mock implementation for development/demo purposes
class MockBedrockAgent implements BedrockAgent {
  constructor(public agentId: string, private agentName: string) {}

  status: 'available' | 'unavailable' | 'error' = 'available';

  async invoke(request: AgentInvokeRequest): Promise<AgentInvokeResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Mock responses based on agent type and request
    const mockResponses = this.generateMockResponse(request);
    
    return {
      response: mockResponses,
      sessionId: request.sessionId || `session-${Date.now()}`,
      confidence: 0.85 + Math.random() * 0.15,
      sources: ['EU GMP Guidelines', 'FDA Regulations', 'Supplier Documentation']
    };
  }

  private generateMockResponse(request: AgentInvokeRequest): string {
    const { prompt } = request;
    const lowerPrompt = prompt.toLowerCase();

    if (this.agentName.includes('Compliance')) {
      return this.generateComplianceResponse(request);
    }

    if (this.agentName.includes('Risk')) {
      return this.generateRiskResponse(request);
    }

    if (this.agentName.includes('Document')) {
      return this.generateDocumentResponse(request);
    }

    return `I've analyzed your request and provided recommendations based on current pharmaceutical industry standards and regulatory requirements.`;
  }

  private generateComplianceResponse(request: AgentInvokeRequest): string {
    const { prompt } = request;
    const lowerPrompt = prompt.toLowerCase();
    
    // Extract supplier info from prompt if available
    const supplierMatch = prompt.match(/supplier "([^"]+)"/);
    const supplierName = supplierMatch ? supplierMatch[1] : 'the supplier';
    
    // Generate realistic compliance scores based on supplier name
    const complianceData = this.generateMockComplianceData(supplierName);
    
    return `## Compliance Analysis for ${supplierName}

### Overall Compliance Assessment
**Overall Score: ${complianceData.overall}%** (${complianceData.status.toUpperCase()})
**Trend: ${complianceData.trend.toUpperCase()}** over the last 6 months

### Detailed Breakdown

**🏆 Certifications (40% weight): ${complianceData.certifications}%**
- EU GMP Certification: ${complianceData.certifications >= 90 ? 'Valid until 2025' : 'Requires renewal attention'}
- FDA Registration: ${complianceData.certifications >= 85 ? 'Current and compliant' : 'Needs updates'}
- ISO 15378: ${complianceData.certifications >= 80 ? 'Active certification' : 'Pending renewal'}

**📋 Audit Results (30% weight): ${complianceData.audits}%**
- Last audit score: ${complianceData.audits}%
- ${complianceData.audits >= 90 ? 'No major findings' : complianceData.audits >= 75 ? 'Minor corrective actions required' : 'Significant improvements needed'}
- Next audit scheduled: ${this.getNextAuditDate()}

**📄 Documentation (20% weight): ${complianceData.documentation}%**
- Document completeness: ${complianceData.documentation >= 90 ? 'Excellent' : complianceData.documentation >= 75 ? 'Good' : 'Needs improvement'}
- ${complianceData.documentation >= 85 ? 'All required documents current' : 'Some documents require updates'}

**⚖️ Regulatory History (10% weight): ${complianceData.regulatoryHistory}%**
- ${complianceData.regulatoryHistory >= 85 ? 'Clean regulatory record' : 'Some historical issues noted'}
- ${complianceData.regulatoryHistory >= 90 ? 'No violations in past 3 years' : 'Minor violations addressed'}

### Key Recommendations
${this.generateComplianceRecommendations(complianceData)}

### Next Review
Scheduled for: ${complianceData.nextReview}

*Analysis completed at ${new Date().toLocaleString()} with 94% confidence*`;
  }

  private generateRiskResponse(request: AgentInvokeRequest): string {
    const { prompt } = request;
    const supplierMatch = prompt.match(/supplier "([^"]+)"/);
    const supplierName = supplierMatch ? supplierMatch[1] : 'the supplier';
    
    const riskData = this.generateMockRiskData(supplierName);
    
    return `## Risk Assessment for ${supplierName}

### Overall Risk Profile
**Risk Level: ${riskData.level.toUpperCase()}**
**Overall Risk Score: ${riskData.overall}/100**
**Probability of Issues (12 months): ${riskData.probability}%**
**Trend: ${riskData.trend.toUpperCase()}**

### Risk Factor Analysis

**💰 Financial Risk (25% weight): ${riskData.financial}/100**
${this.getRiskDescription(riskData.financial, 'financial')}

**🏭 Operational Risk (25% weight): ${riskData.operational}/100**
${this.getRiskDescription(riskData.operational, 'operational')}

**📈 Quality Trend Risk (20% weight): ${riskData.qualityTrend}/100**
${this.getRiskDescription(riskData.qualityTrend, 'quality')}

**🚚 Supply Chain Risk (15% weight): ${riskData.supplyChain}/100**
${this.getRiskDescription(riskData.supplyChain, 'supply')}

**📋 Regulatory Risk (15% weight): ${riskData.regulatory}/100**
${this.getRiskDescription(riskData.regulatory, 'regulatory')}

### Risk Mitigation Strategies
${this.generateRiskMitigationStrategies(riskData)}

### Monitoring Recommendations
- **Immediate attention**: ${riskData.level === 'high' ? 'Required - implement enhanced monitoring' : 'Standard monitoring protocols'}
- **Review frequency**: ${riskData.level === 'high' ? 'Weekly' : riskData.level === 'medium' ? 'Monthly' : 'Quarterly'}
- **Key indicators to watch**: ${this.getKeyIndicators(riskData)}

### Next Assessment
Scheduled for: ${riskData.nextAssessment}

*Risk analysis completed at ${new Date().toLocaleString()} with 91% confidence*`;
  }

  private generateDocumentResponse(request: AgentInvokeRequest): string {
    const { prompt } = request;
    const supplierMatch = prompt.match(/supplier "([^"]+)"/);
    const supplierName = supplierMatch ? supplierMatch[1] : 'the supplier';
    
    const docData = this.generateMockDocumentData(supplierName);
    
    return `## Document Validation Report for ${supplierName}

### Validation Summary
**Documents Processed: ${docData.totalDocs}**
**Validation Score: ${docData.validationScore}%**
**Status: ${docData.status.toUpperCase()}**

### Document Status Breakdown

✅ **Valid Documents (${docData.validDocs}/${docData.totalDocs}):**
${docData.validDocuments.map(doc => `- ${doc.name} (Expires: ${doc.expiry})`).join('\n')}

⚠️ **Documents Requiring Attention (${docData.warningDocs}):**
${docData.warningDocuments.map(doc => `- ${doc.name}: ${doc.issue}`).join('\n')}

❌ **Missing/Invalid Documents (${docData.invalidDocs}):**
${docData.invalidDocuments.map(doc => `- ${doc.name}: ${doc.reason}`).join('\n')}

### Compliance Impact
- **Current compliance impact**: ${docData.complianceImpact}
- **Risk to operations**: ${docData.operationalRisk}
- **Regulatory exposure**: ${docData.regulatoryExposure}

### Immediate Actions Required
${docData.immediateActions.map((action, index) => `${index + 1}. ${action}`).join('\n')}

### Document Renewal Schedule
${docData.renewalSchedule.map(item => `- ${item.document}: Due ${item.dueDate}`).join('\n')}

*Document validation completed at ${new Date().toLocaleString()} with 96% confidence*`;
  }

  private generateMockComplianceData(supplierName: string) {
    // Generate realistic data based on supplier name
    const baseScore = supplierName.includes('ABC') ? 70 : supplierName.includes('Global') ? 85 : 92;
    return {
      overall: baseScore + Math.floor(Math.random() * 8),
      certifications: baseScore + Math.floor(Math.random() * 10),
      audits: baseScore + Math.floor(Math.random() * 12),
      documentation: baseScore + Math.floor(Math.random() * 8),
      regulatoryHistory: baseScore + Math.floor(Math.random() * 15),
      status: baseScore >= 85 ? 'compliant' : baseScore >= 70 ? 'warning' : 'critical',
      trend: supplierName.includes('ABC') ? 'down' : 'up',
      nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  }

  private generateMockRiskData(supplierName: string) {
    const baseRisk = supplierName.includes('ABC') ? 45 : supplierName.includes('Global') ? 30 : 20;
    return {
      overall: baseRisk + Math.floor(Math.random() * 15),
      level: baseRisk > 40 ? 'high' : baseRisk > 25 ? 'medium' : 'low',
      financial: baseRisk + Math.floor(Math.random() * 20),
      operational: baseRisk + Math.floor(Math.random() * 15),
      qualityTrend: baseRisk + Math.floor(Math.random() * 25),
      supplyChain: baseRisk + Math.floor(Math.random() * 18),
      regulatory: baseRisk + Math.floor(Math.random() * 22),
      probability: Math.min(baseRisk * 0.8 + Math.floor(Math.random() * 20), 95),
      trend: supplierName.includes('ABC') ? 'deteriorating' : 'improving',
      nextAssessment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  }

  private generateMockDocumentData(supplierName: string) {
    const totalDocs = 10;
    const validDocs = supplierName.includes('ABC') ? 6 : supplierName.includes('Global') ? 8 : 9;
    const warningDocs = Math.floor((totalDocs - validDocs) * 0.6);
    const invalidDocs = totalDocs - validDocs - warningDocs;
    
    return {
      totalDocs,
      validDocs,
      warningDocs,
      invalidDocs,
      validationScore: Math.floor((validDocs / totalDocs) * 100),
      status: validDocs >= 8 ? 'compliant' : validDocs >= 6 ? 'warning' : 'critical',
      complianceImpact: validDocs >= 8 ? 'Minimal impact' : 'Moderate impact on compliance score',
      operationalRisk: validDocs >= 8 ? 'Low' : 'Medium',
      regulatoryExposure: validDocs >= 8 ? 'Minimal' : 'Moderate',
      validDocuments: [
        { name: 'EU GMP Certificate', expiry: '2025-06-15' },
        { name: 'FDA Registration', expiry: '2025-12-01' },
        { name: 'ISO 15378 Certificate', expiry: '2025-09-30' }
      ].slice(0, validDocs),
      warningDocuments: [
        { name: 'REACH Compliance', issue: 'Expires in 3 months' },
        { name: 'Quality Manual', issue: 'Version outdated' }
      ].slice(0, warningDocs),
      invalidDocuments: [
        { name: 'Sustainability Report', reason: 'Missing current year data' },
        { name: 'Risk Assessment', reason: 'Document expired' }
      ].slice(0, invalidDocs),
      immediateActions: [
        'Update REACH compliance documentation',
        'Submit current sustainability report',
        'Schedule quality manual review'
      ].slice(0, Math.max(1, warningDocs + invalidDocs)),
      renewalSchedule: [
        { document: 'EU GMP Certificate', dueDate: '2025-03-15' },
        { document: 'ISO 15378', dueDate: '2025-06-30' }
      ]
    };
  }

  private getRiskDescription(score: number, type: string): string {
    const level = score <= 30 ? 'Low' : score <= 60 ? 'Medium' : 'High';
    const descriptions = {
      financial: {
        Low: '- Strong financial position with stable cash flow\n- Credit rating: A or above\n- Low debt-to-equity ratio',
        Medium: '- Adequate financial stability\n- Some cash flow variations noted\n- Credit rating: B+ to A-',
        High: '- Financial stress indicators present\n- Irregular cash flow patterns\n- Credit rating below B+'
      },
      operational: {
        Low: '- Multiple production facilities\n- Robust backup systems\n- Strong operational procedures',
        Medium: '- Limited facility redundancy\n- Adequate backup procedures\n- Some operational dependencies',
        High: '- Single point of failure risks\n- Limited backup capabilities\n- Operational vulnerabilities identified'
      },
      quality: {
        Low: '- Consistent quality improvements\n- Strong quality management system\n- Minimal quality incidents',
        Medium: '- Stable quality performance\n- Occasional quality variations\n- Standard quality procedures',
        High: '- Declining quality trends\n- Increasing quality incidents\n- Quality system gaps identified'
      },
      supply: {
        Low: '- Diversified supplier base\n- Multiple logistics routes\n- Strong supply chain resilience',
        Medium: '- Some supply chain dependencies\n- Limited alternative routes\n- Moderate supply chain risks',
        High: '- Critical supplier dependencies\n- Single source vulnerabilities\n- Supply chain disruption risks'
      },
      regulatory: {
        Low: '- Proactive regulatory compliance\n- Strong regulatory relationships\n- Minimal regulatory changes impact',
        Medium: '- Reactive regulatory approach\n- Some regulatory uncertainties\n- Moderate change management',
        High: '- Regulatory compliance gaps\n- Significant regulatory changes ahead\n- High regulatory change impact'
      }
    };
    
    return descriptions[type as keyof typeof descriptions][level as keyof typeof descriptions.financial];
  }

  private generateComplianceRecommendations(data: any): string {
    const recommendations = [];
    
    if (data.certifications < 85) {
      recommendations.push('• Prioritize certification renewals and updates');
    }
    if (data.audits < 80) {
      recommendations.push('• Address audit findings and implement corrective actions');
    }
    if (data.documentation < 85) {
      recommendations.push('• Update documentation to current standards');
    }
    if (data.regulatoryHistory < 80) {
      recommendations.push('• Implement enhanced regulatory monitoring');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('• Maintain current excellent compliance standards');
      recommendations.push('• Continue proactive compliance monitoring');
    }
    
    return recommendations.join('\n');
  }

  private generateRiskMitigationStrategies(data: any): string {
    const strategies = [];
    
    if (data.financial > 40) {
      strategies.push('• Implement enhanced financial monitoring and reporting');
    }
    if (data.operational > 40) {
      strategies.push('• Develop operational redundancy and backup procedures');
    }
    if (data.qualityTrend > 40) {
      strategies.push('• Establish quality improvement action plan');
    }
    if (data.supplyChain > 40) {
      strategies.push('• Diversify supply chain and establish alternative sources');
    }
    if (data.regulatory > 40) {
      strategies.push('• Enhance regulatory change management processes');
    }
    
    if (strategies.length === 0) {
      strategies.push('• Continue standard risk monitoring protocols');
      strategies.push('• Maintain current risk mitigation measures');
    }
    
    return strategies.join('\n');
  }

  private getKeyIndicators(data: any): string {
    const indicators = [];
    
    if (data.financial > 30) indicators.push('Financial ratios');
    if (data.operational > 30) indicators.push('Production capacity');
    if (data.qualityTrend > 30) indicators.push('Quality metrics');
    if (data.supplyChain > 30) indicators.push('Supply chain disruptions');
    if (data.regulatory > 30) indicators.push('Regulatory changes');
    
    return indicators.join(', ') || 'Standard performance metrics';
  }

  private getNextAuditDate(): string {
    const nextAudit = new Date();
    nextAudit.setMonth(nextAudit.getMonth() + 6);
    return nextAudit.toISOString().split('T')[0];
  }
}

// Real Bedrock Agent implementation
class RealBedrockAgent implements BedrockAgent {
  private client: any;
  private fallbackAgent: MockBedrockAgent;
  
  constructor(
    public agentId: string,
    private config: BedrockAgentConfig,
    private agentName: string
  ) {
    try {
      if (!BedrockAgentRuntime) {
        throw new Error('AWS SDK not available');
      }
      
      this.client = new BedrockAgentRuntime({
        region: config.region,
        // Credentials configured via AWS SDK credential chain
        // Uses environment variables, IAM roles, or AWS profiles
      });
      
      // Create fallback mock agent
      this.fallbackAgent = new MockBedrockAgent(agentId, agentName);
      
      console.log(`🔗 Real Bedrock agent initialized: ${agentName} (${agentId})`);
    } catch (error) {
      console.error(`❌ Failed to initialize Bedrock agent ${agentName}:`, error);
      this.status = 'error';
      this.fallbackAgent = new MockBedrockAgent(agentId, agentName);
    }
  }

  status: 'available' | 'unavailable' | 'error' = 'available';

  async invoke(request: AgentInvokeRequest): Promise<AgentInvokeResponse> {
    const enableFallback = process.env.BEDROCK_FALLBACK_TO_MOCK === 'true';
    const timeout = parseInt(process.env.BEDROCK_TIMEOUT || '60000');
    const maxRetries = parseInt(process.env.BEDROCK_MAX_RETRIES || '3');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout to the request
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Bedrock agent timeout')), timeout);
        });

        const invokePromise = this.client.invokeAgent({
          agentId: this.config.agentId,
          agentAliasId: this.config.agentAliasId,
          sessionId: request.sessionId || `session-${Date.now()}`,
          inputText: request.prompt,
        });

        const response = await Promise.race([invokePromise, timeoutPromise]);

        // Parse the streaming response
        let completionText = '';
        let sessionId = request.sessionId || `session-${Date.now()}`;
        
        if (response.completion) {
          // Handle streaming response
          for await (const chunk of response.completion) {
            if (chunk.chunk?.bytes) {
              const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
              completionText += chunkText;
            }
            if (chunk.trace?.sessionId) {
              sessionId = chunk.trace.sessionId;
            }
          }
        }

        // Extract sources from trace information if available
        const sources = this.extractSourcesFromTrace(response);
        
        this.status = 'available';
        
        const agentResponse: AgentInvokeResponse = {
          response: completionText || 'No response generated',
          sessionId: sessionId,
          confidence: this.calculateConfidenceFromResponse(completionText),
          sources: sources
        };

        if (process.env.ENABLE_DEBUG_LOGGING === 'true') {
          console.log(`✅ Bedrock agent ${this.agentName} responded (attempt ${attempt}):`, {
            responseLength: completionText.length,
            confidence: agentResponse.confidence,
            sessionId: sessionId
          });
        }

        return agentResponse;

      } catch (error) {
        console.error(`⚠️ Bedrock agent ${this.agentName} error (attempt ${attempt}):`, error);
        
        if (attempt === maxRetries) {
          this.status = 'error';
          
          // Fallback to mock if enabled
          if (enableFallback) {
            console.warn(`🔄 Falling back to mock agent for ${this.agentName}`);
            return await this.fallbackAgent.invoke(request);
          } else {
            throw new Error(`Bedrock agent ${this.agentName} failed after ${maxRetries} attempts: ${error}`);
          }
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error(`Unexpected error in Bedrock agent ${this.agentName}`);
  }

  private extractSourcesFromTrace(response: any): string[] {
    const sources: string[] = [];
    
    // Extract sources from trace information if available
    // This is a simplified implementation - actual trace parsing would be more complex
    if (response.trace) {
      sources.push('AWS Bedrock Agent Response');
    }
    
    // Add default sources based on agent type
    if (this.agentName.includes('Compliance')) {
      sources.push('EU GMP Guidelines', 'FDA Regulations', 'ISO Standards');
    } else if (this.agentName.includes('Risk')) {
      sources.push('Risk Assessment Models', 'Industry Benchmarks', 'Financial Data');
    } else if (this.agentName.includes('Document')) {
      sources.push('Document Analysis Engine', 'Regulatory Requirements', 'Validation Rules');
    }
    
    return sources;
  }

  private calculateConfidenceFromResponse(response: string): number {
    // Simple confidence calculation based on response completeness
    let confidence = 0.8; // Base confidence for real Bedrock responses
    
    if (response.length > 500) confidence += 0.1;
    if (response.includes('##') || response.includes('**')) confidence += 0.05;
    if (response.includes('recommendation')) confidence += 0.05;
    
    return Math.min(0.98, confidence);
  }
}

export function BedrockAgentProvider({ children, config }: BedrockAgentProviderProps) {
  // Check if real Bedrock should be used
  const bedrockEnabled = process.env.BEDROCK_ENABLED === 'true';
  const hasAwsSdk = BedrockAgentRuntime !== null;
  const hasAgentConfig = !!(config?.compliance?.agentId && config?.risk?.agentId && config?.document?.agentId);
  const hasEnvConfig = !!(process.env.BEDROCK_COMPLIANCE_AGENT_ID && process.env.BEDROCK_RISK_AGENT_ID && process.env.BEDROCK_DOCUMENT_AGENT_ID);
  
  const useRealBedrock = bedrockEnabled && hasAwsSdk && (hasAgentConfig || hasEnvConfig);

  // Configuration priority: props > environment variables > defaults
  const getAgentConfig = (agentType: 'compliance' | 'risk' | 'document'): BedrockAgentConfig => {
    const envMap = {
      compliance: {
        agentId: process.env.BEDROCK_COMPLIANCE_AGENT_ID,
        agentAliasId: process.env.BEDROCK_COMPLIANCE_AGENT_ALIAS_ID || 'TSTALIASID'
      },
      risk: {
        agentId: process.env.BEDROCK_RISK_AGENT_ID,
        agentAliasId: process.env.BEDROCK_RISK_AGENT_ALIAS_ID || 'TSTALIASID'
      },
      document: {
        agentId: process.env.BEDROCK_DOCUMENT_AGENT_ID,
        agentAliasId: process.env.BEDROCK_DOCUMENT_AGENT_ALIAS_ID || 'TSTALIASID'
      }
    };

    return {
      region: config?.[agentType]?.region || process.env.AWS_REGION || 'us-east-1',
      agentId: config?.[agentType]?.agentId || envMap[agentType].agentId || `mock-${agentType}-agent`,
      agentAliasId: config?.[agentType]?.agentAliasId || envMap[agentType].agentAliasId || 'TSTALIASID'
    };
  };

  console.log(`🤖 Initializing Bedrock agents - Real Bedrock: ${useRealBedrock ? 'ENABLED' : 'DISABLED'}`);
  if (!hasAwsSdk && bedrockEnabled) {
    console.warn('⚠️ AWS SDK not available - falling back to mock agents');
  }

  let complianceAgent: BedrockAgent;
  let riskAgent: BedrockAgent;
  let documentAgent: BedrockAgent;

  if (useRealBedrock) {
    try {
      // Create real Bedrock agents
      complianceAgent = new RealBedrockAgent(
        getAgentConfig('compliance').agentId,
        getAgentConfig('compliance'),
        'EU GMP Compliance Analyzer'
      );

      riskAgent = new RealBedrockAgent(
        getAgentConfig('risk').agentId,
        getAgentConfig('risk'),
        'Predictive Risk Assessor'
      );

      documentAgent = new RealBedrockAgent(
        getAgentConfig('document').agentId,
        getAgentConfig('document'),
        'Document Validation Engine'
      );

      console.log('✅ Real Bedrock agents initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize real Bedrock agents, falling back to mock:', error);
      
      // Fallback to mock agents if real ones fail
      complianceAgent = new MockBedrockAgent(
        getAgentConfig('compliance').agentId,
        'EU GMP Compliance Analyzer'
      );

      riskAgent = new MockBedrockAgent(
        getAgentConfig('risk').agentId,
        'Predictive Risk Assessor'
      );

      documentAgent = new MockBedrockAgent(
        getAgentConfig('document').agentId,
        'Document Validation Engine'
      );
    }
  } else {
    // Use mock agents for development or when Bedrock is disabled
    const reason = !bedrockEnabled ? 'Bedrock disabled' : 
                   !hasAwsSdk ? 'AWS SDK not available' :
                   !hasAgentConfig && !hasEnvConfig ? 'Agent configuration missing' :
                   'development/testing';
    
    console.log(`🔧 Using mock agents (${reason})`);
    
    complianceAgent = new MockBedrockAgent(
      getAgentConfig('compliance').agentId,
      'EU GMP Compliance Analyzer'
    );

    riskAgent = new MockBedrockAgent(
      getAgentConfig('risk').agentId,
      'Predictive Risk Assessor'
    );

    documentAgent = new MockBedrockAgent(
      getAgentConfig('document').agentId,
      'Document Validation Engine'
    );
  }

  const isConfigured = useRealBedrock || process.env.NODE_ENV === 'development';

  const value: BedrockAgentContextValue = {
    complianceAgent,
    riskAgent,
    documentAgent,
    isConfigured
  };

  return (
    <BedrockAgentContext.Provider value={value}>
      {children}
    </BedrockAgentContext.Provider>
  );
}

export function useBedrockAgents() {
  const context = useContext(BedrockAgentContext);
  if (!context) {
    throw new Error('useBedrockAgents must be used within a BedrockAgentProvider');
  }
  return context;
}

// Individual agent hooks for convenience
export function useComplianceAgent() {
  const { complianceAgent } = useBedrockAgents();
  return complianceAgent;
}

export function useRiskAgent() {
  const { riskAgent } = useBedrockAgents();
  return riskAgent;
}

export function useDocumentAgent() {
  const { documentAgent } = useBedrockAgents();
  return documentAgent;
}