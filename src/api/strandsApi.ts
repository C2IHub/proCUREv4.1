/**
 * AWS Strands API Client for proCURE Platform
 * 
 * This module provides the API layer for communicating with AWS Strands agents.
 * It supports both direct API Gateway endpoints and AWS SDK calls to Bedrock agents.
 * Falls back to mock implementations when AWS endpoints are not configured.
 */

import { 
  Supplier, 
  AgentStatus,
  Metric,
  ComplianceData,
  AuditEvent,
  RecentActivityItem,
  ApiResponse,
  PaginatedResponse
} from '../types';

// Import mock data as fallback
import { 
  supplierApi as mockSupplierApi,
  agentApi as mockAgentApi,
  metricsApi as mockMetricsApi,
  auditApi as mockAuditApi,
  activityApi as mockActivityApi
} from './mockApi';

// Environment configuration
const config = {
  complianceMonitorEndpoint: import.meta.env.VITE_COMPLIANCE_MONITOR_ENDPOINT || '',
  riskPredictorEndpoint: import.meta.env.VITE_RISK_PREDICTOR_ENDPOINT || '',
  documentIntelligenceEndpoint: import.meta.env.VITE_DOCUMENT_INTELLIGENCE_ENDPOINT || '',
  awsRegion: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true' || !import.meta.env.VITE_COMPLIANCE_MONITOR_ENDPOINT,
  environment: import.meta.env.VITE_ENVIRONMENT || 'development'
};

// Agent endpoint mapping
const agentEndpoints = {
  'compliance-monitor': config.complianceMonitorEndpoint,
  'risk-predictor': config.riskPredictorEndpoint,
  'document-intelligence': config.documentIntelligenceEndpoint
};

/**
 * Generic function to call AWS Strands agents
 */
async function callStrandsAgent(
  agentType: keyof typeof agentEndpoints,
  action: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  const endpoint = agentEndpoints[agentType];
  
  if (!endpoint || config.useMockApi) {
    // Return mock response based on agent type and action
    return getMockAgentResponse(agentType, action, payload);
  }

  try {
    const response = await fetch(`${endpoint}/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_AWS_API_KEY || ''
      },
      body: JSON.stringify({
        action,
        payload,
        sessionId: generateSessionId(),
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Agent call failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.warn(`Failed to call ${agentType} agent, falling back to mock:`, error);
    return getMockAgentResponse(agentType, action, payload);
  }
}

/**
 * Get mock response for agent calls when AWS is not available
 */
function getMockAgentResponse(
  agentType: keyof typeof agentEndpoints,
  action: string,
  payload: Record<string, unknown>
): unknown {
  // Return appropriate mock responses based on agent type and action
  switch (agentType) {
    case 'compliance-monitor':
      return getMockComplianceResponse(action, payload);
    case 'risk-predictor':
      return getMockRiskResponse(action, payload);
    case 'document-intelligence':
      return getMockDocumentResponse(action, payload);
    default:
      return { message: 'Mock response', success: true };
  }
}

function getMockComplianceResponse(action: string, payload: Record<string, unknown>): unknown {
  switch (action) {
    case 'assess_compliance_status':
      return {
        supplierId: payload.supplier_id,
        complianceScore: 87,
        status: 'compliant',
        breakdown: {
          certifications: 92,
          audits: 85,
          documentation: 88,
          regulatoryHistory: 90
        },
        recommendations: [
          'Update ISO 13485 certification before expiration',
          'Schedule quarterly compliance review'
        ]
      };
    default:
      return { message: 'Mock compliance response', success: true };
  }
}

function getMockRiskResponse(action: string, payload: Record<string, unknown>): unknown {
  switch (action) {
    case 'assess_risk_factors':
      return {
        supplierId: payload.supplier_id,
        overallRisk: 35,
        riskLevel: 'medium',
        factors: {
          financial: 30,
          operational: 25,
          qualityTrend: 40,
          supplyChain: 35,
          regulatory: 20
        },
        recommendations: [
          'Monitor financial performance quarterly',
          'Implement backup supplier for critical components'
        ]
      };
    default:
      return { message: 'Mock risk response', success: true };
  }
}

function getMockDocumentResponse(action: string, payload: Record<string, unknown>): unknown {
  switch (action) {
    case 'validate_documents':
      return {
        supplierId: payload.supplier_id,
        validationScore: 94,
        documentsChecked: payload.document_count || 5,
        issuesFound: 1,
        findings: [
          'Certificate expiry date approaching within 90 days'
        ]
      };
    default:
      return { message: 'Mock document response', success: true };
  }
}

/**
 * Generate a unique session ID for agent calls
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Enhanced supplier API with AWS Strands integration
 */
export const supplierApi = {
  async getSuppliers(): Promise<ApiResponse<Supplier[]>> {
    // For now, use mock data but enhance with Strands agent analysis
    const mockResponse = await mockSupplierApi.getSuppliers();
    
    // In production, this would call Strands agents to analyze each supplier
    if (!config.useMockApi) {
      // Enhance supplier data with real-time compliance and risk analysis
      for (const supplier of mockResponse.data) {
        try {
          // Get enhanced compliance analysis from Strands agent
          const complianceAnalysis = await callStrandsAgent('compliance-monitor', 'assess_compliance_status', {
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            assessment_scope: ['GMP', 'FDA', 'ISO']
          });
          
          // Get enhanced risk analysis from Strands agent
          const riskAnalysis = await callStrandsAgent('risk-predictor', 'assess_risk_factors', {
            supplier_id: supplier.id,
            time_period: '12_MONTHS'
          });
          
          // Update supplier data with enhanced analysis
          if (complianceAnalysis && typeof complianceAnalysis === 'object') {
            // Update compliance score based on Strands analysis
            supplier.complianceScore.overall = (complianceAnalysis as any).complianceScore || supplier.complianceScore.overall;
          }
          
          if (riskAnalysis && typeof riskAnalysis === 'object') {
            // Update risk score based on Strands analysis
            supplier.riskScore.overall = (riskAnalysis as any).overallRisk || supplier.riskScore.overall;
          }
        } catch (error) {
          console.warn(`Failed to enhance supplier ${supplier.id} with Strands analysis:`, error);
        }
      }
    }
    
    return mockResponse;
  },

  async getSupplier(id: string): Promise<ApiResponse<Supplier>> {
    const mockResponse = await mockSupplierApi.getSupplier(id);
    
    // Enhance with real-time Strands analysis in production
    if (!config.useMockApi) {
      try {
        const supplier = mockResponse.data;
        
        // Get detailed compliance analysis
        const complianceAnalysis = await callStrandsAgent('compliance-monitor', 'assess_compliance_status', {
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          assessment_scope: ['GMP', 'FDA', 'ISO', 'REACH']
        });
        
        // Get detailed risk analysis
        const riskAnalysis = await callStrandsAgent('risk-predictor', 'assess_risk_factors', {
          supplier_id: supplier.id,
          time_period: '12_MONTHS'
        });
        
        // Update with enhanced data
        if (complianceAnalysis && typeof complianceAnalysis === 'object') {
          const analysis = complianceAnalysis as any;
          supplier.complianceScore.overall = analysis.complianceScore || supplier.complianceScore.overall;
          supplier.complianceScore.status = analysis.status || supplier.complianceScore.status;
        }
        
        if (riskAnalysis && typeof riskAnalysis === 'object') {
          const analysis = riskAnalysis as any;
          supplier.riskScore.overall = analysis.overallRisk || supplier.riskScore.overall;
          supplier.riskScore.level = analysis.riskLevel || supplier.riskScore.level;
        }
      } catch (error) {
        console.warn(`Failed to enhance supplier ${id} with Strands analysis:`, error);
      }
    }
    
    return mockResponse;
  },

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    return mockSupplierApi.updateSupplier(id, updates);
  }
};

/**
 * Agent status API with Strands integration
 */
export const agentApi = {
  async getAgents(): Promise<ApiResponse<AgentStatus[]>> {
    const mockResponse = await mockAgentApi.getAgents();
    
    // In production, get real status from deployed Strands agents
    if (!config.useMockApi) {
      try {
        // Check health of each Strands agent
        for (const agent of mockResponse.data) {
          const agentType = agent.id as keyof typeof agentEndpoints;
          if (agentEndpoints[agentType]) {
            try {
              const healthCheck = await fetch(`${agentEndpoints[agentType]}/health`);
              agent.status = healthCheck.ok ? 'active' : 'error';
              agent.lastUpdate = new Date().toISOString();
            } catch (error) {
              agent.status = 'error';
              agent.lastUpdate = new Date().toISOString();
            }
          }
        }
      } catch (error) {
        console.warn('Failed to get real agent status:', error);
      }
    }
    
    return mockResponse;
  },

  async getAgent(id: string): Promise<ApiResponse<AgentStatus>> {
    return mockAgentApi.getAgent(id);
  }
};

/**
 * Export other APIs with mock fallback for now
 * These could be enhanced with Strands integration later
 */
export const metricsApi = mockMetricsApi;
export const auditApi = mockAuditApi;
export const activityApi = mockActivityApi;

// Export for compatibility
export { supplierApi as masterSupplierApi };