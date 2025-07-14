import { WorkflowDefinition } from '../../types';

export const SupplierOnboardingWorkflow: WorkflowDefinition = {
  id: 'supplier-onboarding',
  name: 'Supplier Onboarding Workflow',
  description: 'Comprehensive supplier onboarding process including document validation, compliance assessment, and risk evaluation',
  version: '1.0.0',
  coordination: 'sequential',
  maxDuration: 300000, // 5 minutes
  retryPolicy: {
    maxRetries: 2,
    backoffMultiplier: 1.5
  },
  steps: [
    {
      id: 'document-validation',
      agentId: 'document-intelligence',
      name: 'Document Validation',
      description: 'Validate and extract information from supplier documents',
      inputs: {
        documentType: '${supplierDocuments.certificationType}',
        supplierName: '${supplier.name}',
        regulatoryStandard: '${supplier.regulatoryStandard}',
        documentMetadata: '${supplierDocuments.metadata}'
      },
      outputs: ['validationScore', 'extractedData', 'complianceStatus'],
      timeout: 60000, // 1 minute
      dependencies: []
    },
    {
      id: 'compliance-assessment',
      agentId: 'compliance-monitor',
      name: 'Compliance Assessment',
      description: 'Assess supplier compliance against regulatory requirements',
      inputs: {
        supplierName: '${supplier.name}',
        supplierId: '${supplier.id}',
        region: '${supplier.region}',
        category: '${supplier.category}',
        documentValidation: '${document-validation.extractedData}'
      },
      outputs: ['complianceScore', 'riskFactors', 'recommendations'],
      timeout: 45000, // 45 seconds
      dependencies: ['document-validation'],
      conditions: [
        {
          field: 'document-validation.validationScore',
          operator: 'greater_than',
          value: 70
        }
      ]
    },
    {
      id: 'risk-assessment',
      agentId: 'risk-predictor',
      name: 'Risk Assessment',
      description: 'Evaluate supplier risk profile and predictive factors',
      inputs: {
        supplierName: '${supplier.name}',
        supplierId: '${supplier.id}',
        region: '${supplier.region}',
        category: '${supplier.category}',
        complianceScore: '${compliance-assessment.complianceScore}',
        financialData: '${supplier.financialData}',
        historicalData: '${supplier.historicalData}'
      },
      outputs: ['riskScore', 'riskLevel', 'mitigationStrategies'],
      timeout: 60000, // 1 minute
      dependencies: ['compliance-assessment'],
      conditions: [
        {
          field: 'compliance-assessment.complianceScore',
          operator: 'greater_than',
          value: 60
        }
      ]
    },
    {
      id: 'final-evaluation',
      agentId: 'compliance-monitor',
      name: 'Final Evaluation',
      description: 'Generate final onboarding recommendation based on all assessments',
      inputs: {
        supplierName: '${supplier.name}',
        documentValidation: '${document-validation.validationScore}',
        complianceAssessment: '${compliance-assessment.complianceScore}',
        riskAssessment: '${risk-assessment.riskScore}',
        overallContext: {
          'documentScore': '${document-validation.validationScore}',
          'complianceScore': '${compliance-assessment.complianceScore}',
          'riskScore': '${risk-assessment.riskScore}'
        }
      },
      outputs: ['finalRecommendation', 'onboardingDecision', 'actionPlan'],
      timeout: 30000, // 30 seconds
      dependencies: ['risk-assessment']
    }
  ]
};

export const ComplianceReviewWorkflow: WorkflowDefinition = {
  id: 'compliance-review',
  name: 'Compliance Review Workflow',
  description: 'Periodic compliance review and risk update for existing suppliers',
  version: '1.0.0',
  coordination: 'parallel',
  maxDuration: 180000, // 3 minutes
  retryPolicy: {
    maxRetries: 1,
    backoffMultiplier: 2.0
  },
  steps: [
    {
      id: 'compliance-check',
      agentId: 'compliance-monitor',
      name: 'Compliance Check',
      description: 'Review current compliance status and identify any gaps',
      inputs: {
        supplierName: '${supplier.name}',
        supplierId: '${supplier.id}',
        region: '${supplier.region}',
        lastReviewDate: '${supplier.lastReviewDate}'
      },
      outputs: ['currentComplianceScore', 'complianceGaps', 'urgentActions'],
      timeout: 45000,
      dependencies: []
    },
    {
      id: 'risk-update',
      agentId: 'risk-predictor',
      name: 'Risk Profile Update',
      description: 'Update risk assessment based on recent performance and market conditions',
      inputs: {
        supplierName: '${supplier.name}',
        supplierId: '${supplier.id}',
        region: '${supplier.region}',
        currentRiskScore: '${supplier.currentRiskScore}',
        recentPerformance: '${supplier.recentPerformance}'
      },
      outputs: ['updatedRiskScore', 'trendAnalysis', 'earlyWarnings'],
      timeout: 60000,
      dependencies: []
    }
  ]
};

export const DocumentValidationWorkflow: WorkflowDefinition = {
  id: 'document-validation',
  name: 'Document Validation Workflow',
  description: 'Comprehensive document validation and content extraction workflow',
  version: '1.0.0',
  coordination: 'sequential',
  maxDuration: 120000, // 2 minutes
  retryPolicy: {
    maxRetries: 2,
    backoffMultiplier: 1.2
  },
  steps: [
    {
      id: 'document-classification',
      agentId: 'document-intelligence',
      name: 'Document Classification',
      description: 'Classify document type and determine processing requirements',
      inputs: {
        documentMetadata: '${document.metadata}',
        supplierName: '${supplier.name}'
      },
      outputs: ['documentType', 'classificationConfidence', 'processingRequirements'],
      timeout: 30000,
      dependencies: []
    },
    {
      id: 'content-extraction',
      agentId: 'document-intelligence',
      name: 'Content Extraction',
      description: 'Extract structured content and validate document integrity',
      inputs: {
        documentType: '${document-classification.documentType}',
        supplierName: '${supplier.name}',
        documentMetadata: '${document.metadata}'
      },
      outputs: ['extractedContent', 'extractionAccuracy', 'validationResults'],
      timeout: 60000,
      dependencies: ['document-classification']
    },
    {
      id: 'compliance-validation',
      agentId: 'compliance-monitor',
      name: 'Compliance Validation',
      description: 'Validate document compliance against regulatory standards',
      inputs: {
        documentType: '${document-classification.documentType}',
        extractedContent: '${content-extraction.extractedContent}',
        supplierName: '${supplier.name}',
        regulatoryStandard: '${supplier.regulatoryStandard}'
      },
      outputs: ['complianceValidation', 'regulatoryGaps', 'correctionRequirements'],
      timeout: 45000,
      dependencies: ['content-extraction']
    }
  ]
};

export const RiskAssessmentWorkflow: WorkflowDefinition = {
  id: 'risk-assessment',
  name: 'Comprehensive Risk Assessment Workflow',
  description: 'Multi-dimensional risk assessment including financial, operational, and compliance risks',
  version: '1.0.0',
  coordination: 'sequential',
  maxDuration: 240000, // 4 minutes
  retryPolicy: {
    maxRetries: 1,
    backoffMultiplier: 2.0
  },
  steps: [
    {
      id: 'financial-risk-analysis',
      agentId: 'risk-predictor',
      name: 'Financial Risk Analysis',
      description: 'Analyze financial stability and credit risk factors',
      inputs: {
        supplierName: '${supplier.name}',
        financialData: '${supplier.financialData}',
        region: '${supplier.region}'
      },
      outputs: ['financialRiskScore', 'creditRating', 'financialTrends'],
      timeout: 60000,
      dependencies: []
    },
    {
      id: 'operational-risk-analysis',
      agentId: 'risk-predictor',
      name: 'Operational Risk Analysis',
      description: 'Evaluate operational capabilities and business continuity risks',
      inputs: {
        supplierName: '${supplier.name}',
        operationalData: '${supplier.operationalData}',
        region: '${supplier.region}'
      },
      outputs: ['operationalRiskScore', 'capacityAssessment', 'continuityRisks'],
      timeout: 60000,
      dependencies: []
    },
    {
      id: 'compliance-risk-analysis',
      agentId: 'compliance-monitor',
      name: 'Compliance Risk Analysis',
      description: 'Assess regulatory compliance risks and violation probability',
      inputs: {
        supplierName: '${supplier.name}',
        complianceHistory: '${supplier.complianceHistory}',
        region: '${supplier.region}',
        regulatoryStandard: '${supplier.regulatoryStandard}'
      },
      outputs: ['complianceRiskScore', 'violationProbability', 'mitigationActions'],
      timeout: 45000,
      dependencies: []
    },
    {
      id: 'integrated-risk-assessment',
      agentId: 'risk-predictor',
      name: 'Integrated Risk Assessment',
      description: 'Combine all risk factors into comprehensive risk profile',
      inputs: {
        supplierName: '${supplier.name}',
        financialRisk: '${financial-risk-analysis.financialRiskScore}',
        operationalRisk: '${operational-risk-analysis.operationalRiskScore}',
        complianceRisk: '${compliance-risk-analysis.complianceRiskScore}'
      },
      outputs: ['overallRiskScore', 'riskProfile', 'strategicRecommendations'],
      timeout: 45000,
      dependencies: ['financial-risk-analysis', 'operational-risk-analysis', 'compliance-risk-analysis']
    }
  ]
};

// Workflow registry for easy access
export const WorkflowRegistry = {
  'supplier-onboarding': SupplierOnboardingWorkflow,
  'compliance-review': ComplianceReviewWorkflow,
  'document-validation': DocumentValidationWorkflow,
  'risk-assessment': RiskAssessmentWorkflow
};

// Helper function to get workflow by ID
export function getWorkflowById(workflowId: string): WorkflowDefinition | null {
  return WorkflowRegistry[workflowId as keyof typeof WorkflowRegistry] || null;
}

// Helper function to get all available workflows
export function getAllWorkflows(): WorkflowDefinition[] {
  return Object.values(WorkflowRegistry);
}

// Helper function to get workflows by coordination type
export function getWorkflowsByCoordination(coordination: 'sequential' | 'parallel' | 'conditional' | 'event-driven'): WorkflowDefinition[] {
  return getAllWorkflows().filter(workflow => workflow.coordination === coordination);
}