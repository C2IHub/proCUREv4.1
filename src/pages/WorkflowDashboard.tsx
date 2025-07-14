import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, CheckCircle, XCircle, AlertTriangle, Activity, Users, Workflow } from 'lucide-react';
import { useAgentSystem, useAgentHealth, useAgentCapabilities } from '../context/AgentSystemProvider';
import { SupplierOnboardingWorkflow, ComplianceReviewWorkflow, getWorkflowById } from '../agents/workflows/SupplierOnboardingWorkflow';
import { AgentExecutionContext, WorkflowExecution } from '../types';

const WorkflowDashboard: React.FC = () => {
  const { 
    isSystemReady, 
    executeWorkflow, 
    orchestrator 
  } = useAgentSystem();
  
  const { getHealthSummary } = useAgentHealth();
  const { getAvailableAgents, getAllCapabilities } = useAgentCapabilities();
  
  const [activeWorkflows, setActiveWorkflows] = useState<WorkflowExecution[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('supplier-onboarding');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<WorkflowExecution[]>([]);

  // Mock supplier data for testing
  const mockSupplierData = {
    supplier: {
      id: 'SUP-001',
      name: 'Global Pharma Solutions',
      region: 'Europe',
      category: 'Active Pharmaceutical Ingredients',
      regulatoryStandard: 'EU GMP',
      financialData: {
        revenue: 50000000,
        assets: 75000000,
        debt: 15000000
      },
      lastReviewDate: '2024-01-15'
    },
    supplierDocuments: {
      certificationType: 'EU GMP Certificate',
      metadata: {
        filename: 'gmp_certificate_2024.pdf',
        uploadDate: '2024-01-15',
        documentId: 'DOC-GMP-001'
      }
    }
  };

  useEffect(() => {
    // Update active workflows periodically
    const interval = setInterval(() => {
      if (orchestrator) {
        const active = orchestrator.getWorkflowEngine().getActiveWorkflows();
        setActiveWorkflows(active);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [orchestrator]);

  const handleExecuteWorkflow = async () => {
    if (!isSystemReady || isExecuting) return;

    setIsExecuting(true);
    try {
      const workflow = getWorkflowById(selectedWorkflow);
      if (!workflow) {
        throw new Error(`Workflow ${selectedWorkflow} not found`);
      }

      const context: AgentExecutionContext = {
        sessionId: `workflow-${Date.now()}`,
        userId: 'demo-user',
        requestId: `req-${Date.now()}`,
        timestamp: new Date().toISOString(),
        metadata: {
          workflowId: workflow.id,
          ...mockSupplierData
        }
      };

      const execution = await executeWorkflow(workflow, context);
      setExecutionResults(prev => [execution, ...prev.slice(0, 9)]); // Keep last 10 results
      
    } catch (error) {
      console.error('Workflow execution failed:', error);
      alert(`Workflow execution failed: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const healthSummary = getHealthSummary();
  const availableAgents = getAvailableAgents();
  const allCapabilities = getAllCapabilities();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running': return <Activity className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isSystemReady) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Initializing Agent System</h3>
            <p className="text-gray-600">Please wait while we set up the agent infrastructure...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Workflow className="h-8 w-8 text-blue-600 mr-3" />
            Workflow Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Manage and monitor agentic workflows</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            healthSummary.healthPercentage >= 80 ? 'bg-green-100 text-green-800' :
            healthSummary.healthPercentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            System Health: {healthSummary.healthPercentage.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Available Agents</p>
              <p className="text-2xl font-bold text-gray-900">{availableAgents.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Healthy Agents</p>
              <p className="text-2xl font-bold text-gray-900">{healthSummary.healthy}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <Workflow className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Workflows</p>
              <p className="text-2xl font-bold text-gray-900">{activeWorkflows.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-indigo-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Capabilities</p>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(allCapabilities).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Execution */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Execute Workflow</h2>
          <p className="text-gray-600 mt-1">Run predefined workflows for supplier management</p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Workflow
              </label>
              <select
                value={selectedWorkflow}
                onChange={(e) => setSelectedWorkflow(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={isExecuting}
              >
                <option value="supplier-onboarding">Supplier Onboarding</option>
                <option value="compliance-review">Compliance Review</option>
                <option value="document-validation">Document Validation</option>
                <option value="risk-assessment">Risk Assessment</option>
              </select>
            </div>
            
            <div className="pt-6">
              <button
                onClick={handleExecuteWorkflow}
                disabled={isExecuting || !isSystemReady}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecuting ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Execute Workflow
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Mock supplier data display */}
          <div className="bg-gray-50 rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Test Data (Mock Supplier)</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <p><span className="font-medium">Supplier:</span> {mockSupplierData.supplier.name}</p>
              <p><span className="font-medium">Region:</span> {mockSupplierData.supplier.region}</p>
              <p><span className="font-medium">Category:</span> {mockSupplierData.supplier.category}</p>
              <p><span className="font-medium">Standard:</span> {mockSupplierData.supplier.regulatoryStandard}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Workflows */}
      {activeWorkflows.length > 0 && (
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Active Workflows</h2>
            <p className="text-gray-600 mt-1">Currently running workflow executions</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {activeWorkflows.map((workflow) => (
              <div key={workflow.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(workflow.status)}
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">{workflow.workflowId}</h4>
                      <p className="text-sm text-gray-600">Started: {new Date(workflow.startTime).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(workflow.status)}`}>
                      {workflow.status.toUpperCase()}
                    </span>
                    <div className="text-sm text-gray-600">
                      Steps: {workflow.stepResults.filter(s => s.status === 'completed').length}/{workflow.stepResults.length}
                    </div>
                  </div>
                </div>
                
                {/* Step progress */}
                <div className="mt-4">
                  <div className="flex space-x-2">
                    {workflow.stepResults.map((step, index) => (
                      <div
                        key={step.stepId}
                        className={`flex-1 h-2 rounded-full ${
                          step.status === 'completed' ? 'bg-green-500' :
                          step.status === 'running' ? 'bg-blue-500' :
                          step.status === 'failed' ? 'bg-red-500' :
                          'bg-gray-200'
                        }`}
                        title={step.stepId}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution History */}
      {executionResults.length > 0 && (
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Execution History</h2>
            <p className="text-gray-600 mt-1">Recent workflow execution results</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {executionResults.map((execution) => (
              <div key={execution.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(execution.status)}
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">{execution.workflowId}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(execution.startTime).toLocaleString()}
                        {execution.endTime && (
                          <span className="ml-2">
                            (Duration: {Math.round((new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime()) / 1000)}s)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(execution.status)}`}>
                      {execution.status.toUpperCase()}
                    </span>
                    <div className="text-sm text-gray-600">
                      {execution.stepResults.filter(s => s.status === 'completed').length}/{execution.stepResults.length} steps
                    </div>
                  </div>
                </div>
                
                {execution.error && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{execution.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Capabilities Overview */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Agent Capabilities</h2>
          <p className="text-gray-600 mt-1">Available capabilities across all agents</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(allCapabilities).map(([capability, agents]) => (
              <div key={capability} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                <div className="space-y-1">
                  {agents.map(agent => (
                    <div key={agent} className="flex items-center text-sm text-gray-600">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        healthSummary.healthy > 0 ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      {agent}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowDashboard;