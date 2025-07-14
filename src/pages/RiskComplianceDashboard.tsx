import React, { useState } from 'react';
import { AlertTriangle, TrendingUp, Shield, FileCheck, ChevronDown, ChevronRight } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  supplier?: string;
  probability?: number;
  impact?: number;
  category?: string;
}

const RiskComplianceDashboard: React.FC = () => {
  const [expandedRiskAlert, setExpandedRiskAlert] = useState<string | null>(null);
  const [expandedComplianceAlert, setExpandedComplianceAlert] = useState<string | null>(null);

  const riskAlerts: Alert[] = [
    {
      id: '1',
      title: 'Supply Chain Disruption Risk',
      description: 'Potential delays in raw material delivery from Supplier A due to geopolitical tensions',
      severity: 'high',
      timestamp: '2 hours ago',
      supplier: 'Supplier A',
      probability: 75,
      impact: 85,
      category: 'Supply Chain'
    },
    {
      id: '2',
      title: 'Quality Control Issue',
      description: 'Recent batch quality metrics below threshold for critical component',
      severity: 'medium',
      timestamp: '4 hours ago',
      supplier: 'Supplier B',
      probability: 60,
      impact: 70,
      category: 'Quality'
    },
    {
      id: '3',
      title: 'Financial Stability Concern',
      description: 'Credit rating downgrade for key supplier affecting delivery capacity',
      severity: 'high',
      timestamp: '6 hours ago',
      supplier: 'Supplier C',
      probability: 80,
      impact: 90,
      category: 'Financial'
    }
  ];

  const complianceAlerts: Alert[] = [
    {
      id: '1',
      title: 'FDA Registration Expiring',
      description: 'Supplier D FDA registration expires in 30 days',
      severity: 'high',
      timestamp: '1 hour ago',
      supplier: 'Supplier D'
    },
    {
      id: '2',
      title: 'Missing Documentation',
      description: 'ISO 9001 certificate not uploaded for Supplier E',
      severity: 'medium',
      timestamp: '3 hours ago',
      supplier: 'Supplier E'
    },
    {
      id: '3',
      title: 'Audit Requirement',
      description: 'Annual compliance audit due for Supplier F',
      severity: 'low',
      timestamp: '5 hours ago',
      supplier: 'Supplier F'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const toggleRiskAlert = (alertId: string) => {
    setExpandedRiskAlert(expandedRiskAlert === alertId ? null : alertId);
  };

  const toggleComplianceAlert = (alertId: string) => {
    setExpandedComplianceAlert(expandedComplianceAlert === alertId ? null : alertId);
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Risk & Compliance Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor supplier risks and compliance status in real-time</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Risk Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Risk Score</p>
              <p className="text-2xl font-bold text-gray-900">7.2</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
              <p className="text-2xl font-bold text-gray-900">94%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileCheck className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {/* Risk Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Active Risk Alerts
            </h2>
          </div>
          <div className="p-3 md:p-4 space-y-2 md:space-y-3 max-h-80 md:max-h-96 overflow-y-auto">
            {riskAlerts.map((alert) => (
              <div key={alert.id} className="border border-gray-200 rounded-lg">
                <div 
                  className="p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleRiskAlert(alert.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {expandedRiskAlert === alert.id ? 
                          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : 
                          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        }
                        <h3 className="text-sm font-medium text-gray-900 truncate">{alert.title}</h3>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 ml-6">{alert.description}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1 ml-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{alert.timestamp}</span>
                    </div>
                  </div>
                </div>
                
                {expandedRiskAlert === alert.id && (
                  <div className="px-3 pb-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Supplier</p>
                        <p className="text-xs text-gray-900">{alert.supplier}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">Category</p>
                        <p className="text-xs text-gray-900">{alert.category}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">Probability</p>
                        <p className="text-xs text-gray-900">{alert.probability}%</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">Impact</p>
                        <p className="text-xs text-gray-900">{alert.impact}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Risk Trends */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
              Risk Trends
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Supply Chain Risk</span>
                  <span className="text-sm text-red-600 font-medium">68% (↑ 12%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-red-500 h-3 rounded-full" style={{ width: '68%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Financial Risk</span>
                  <span className="text-sm text-yellow-600 font-medium">45% (↓ 8%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-yellow-500 h-3 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Quality Risk</span>
                  <span className="text-sm text-orange-600 font-medium">32% (↑ 5%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-orange-500 h-3 rounded-full" style={{ width: '32%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Operational Risk</span>
                  <span className="text-sm text-green-600 font-medium">28% (→ 0%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: '28%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Shield className="h-5 w-5 text-green-500 mr-2" />
              Active Compliance Alerts
            </h2>
          </div>
          <div className="p-3 md:p-4 space-y-2 md:space-y-3 max-h-80 md:max-h-96 overflow-y-auto">
            {complianceAlerts.map((alert) => (
              <div key={alert.id} className="border border-gray-200 rounded-lg">
                <div 
                  className="p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleComplianceAlert(alert.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {expandedComplianceAlert === alert.id ? 
                          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : 
                          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        }
                        <h3 className="text-sm font-medium text-gray-900 truncate">{alert.title}</h3>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 ml-6">{alert.description}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1 ml-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{alert.timestamp}</span>
                    </div>
                  </div>
                </div>
                
                {expandedComplianceAlert === alert.id && (
                  <div className="px-3 pb-3 border-t border-gray-100">
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-600">Supplier</p>
                      <p className="text-xs text-gray-900">{alert.supplier}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Trends */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileCheck className="h-5 w-5 text-green-500 mr-2" />
              Compliance Trends
            </h2>
          </div>
          <div className="p-4 md:p-6">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">EU GMP Compliance</span>
                  <span className="text-sm text-green-600 font-medium">92% (↑ 5%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">FDA Registration</span>
                  <span className="text-sm text-red-600 font-medium">78% (↓ 12%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-red-500 h-3 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">ISO Certifications</span>
                  <span className="text-sm text-green-600 font-medium">88% (↑ 8%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: '88%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Documentation</span>
                  <span className="text-sm text-blue-600 font-medium">85% (→ 0%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskComplianceDashboard;