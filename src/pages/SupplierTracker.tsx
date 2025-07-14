import React, { useState } from 'react';
import { Building2, Shield, AlertTriangle, CheckCircle, ExternalLink, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Supplier {
  id: string;
  name: string;
  category: string;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  certifications: string[];
  lastAudit: string;
  status: 'active' | 'pending' | 'suspended';
}


import { useSuppliers } from '../hooks/useApi';

const SupplierTracker: React.FC = () => {
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>('SUP001'); // First supplier selected by default
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const { data: suppliers = [], isLoading, error } = useSuppliers();

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getComplianceColor = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preferred': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'conditional': return 'bg-yellow-100 text-yellow-800';
      case 'restricted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const handleViewPortal = () => {
    if (selectedSupplier) {
      console.log('Navigating to portal for supplier:', selectedSupplier);
      navigate(`/supplier/${selectedSupplier}/portal`);
    }
  };

  const handleAnalyzeCompliance = () => {
    if (selectedSupplier) {
      navigate(`/supplier/${selectedSupplier}/reasoning`);
    }
  };

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.supplierRating === 'preferred' || s.supplierRating === 'approved').length;
  const highRiskSuppliers = suppliers.filter(s => s.riskScore.level === 'high').length;
  const avgComplianceScore = suppliers.length > 0 ? Math.round(suppliers.reduce((sum, s) => sum + s.complianceScore.overall, 0) / totalSuppliers) : 0;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Supplier Tracker</h1>
          <p className="text-gray-600">Loading supplier data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Supplier Tracker</h1>
          <p className="text-red-600">Error loading supplier data. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Tracker</h1>
          <p className="text-gray-600">Monitor and manage supplier compliance and risk</p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">{totalSuppliers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">{activeSuppliers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-gray-900">{highRiskSuppliers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Compliance</p>
              <p className="text-2xl font-bold text-gray-900">{avgComplianceScore}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Selected Supplier Actions - Moved to Top */}
      {selectedSupplier && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 md:mb-6">
          <div className="p-3 md:p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Selected: {suppliers.find(s => s.id === selectedSupplier)?.name}
                </h3>
                <p className="text-xs text-gray-600">Choose an action for this supplier</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleViewPortal}
                  className="flex items-center px-2 sm:px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Portal
                </button> 
                <button 
                  onClick={handleAnalyzeCompliance}
                  className="flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Analyze Compliance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suppliers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto w-full rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compliance Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Certifications
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Audit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSuppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  onClick={() => setSelectedSupplier(supplier.id)}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedSupplier === supplier.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-[120px] md:max-w-[150px]">{supplier.category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getComplianceColor(supplier.complianceScore.overall)}`}>
                      {supplier.complianceScore.overall}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getRiskColor(supplier.riskScore.level)}`}>
                      {supplier.riskScore.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {supplier.certifications.length} certifications
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="hidden sm:inline">{new Date(supplier.lastAudit).toLocaleDateString()}</span>
                    <span className="sm:hidden">{new Date(supplier.lastAudit).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(supplier.supplierRating)}`}>
                      {supplier.supplierRating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupplierTracker;