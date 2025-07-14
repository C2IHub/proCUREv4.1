import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  FileText,
  Calendar,
  TrendingUp,
  MessageSquare,
  Plus,
  MoreHorizontal,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AgenticInterface from '../components/AgenticInterface';

interface RFPItem {
  id: string;
  title: string;
  categories: string[];
  status: 'draft' | 'sent' | 'responses_received' | 'evaluation' | 'awarded' | 'closed';
  createdDate: string;
  deadline: string;
  suppliersInvited: number;
  responsesReceived: number;
  budget: string;
  priority: 'low' | 'medium' | 'high';
  lastActivity: string;
  progress: number;
}

export default function RFPTracker() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRFP, setSelectedRFP] = useState<string>('RFP-2024-001'); // First RFP selected by default
  const [currentView, setCurrentView] = useState<'list' | 'details' | 'communications'>('list');
  const navigate = useNavigate();

  // Mock RFP data - in real app, this would come from API
  const rfps: RFPItem[] = [
    {
      id: 'RFP-2024-001',
      title: 'Q2 2024 Primary Packaging Materials',
      categories: ['Primary Packaging'],
      status: 'responses_received',
      createdDate: '2024-01-15',
      deadline: '2024-02-28',
      suppliersInvited: 8,
      responsesReceived: 6,
      budget: '$500K - $1M',
      priority: 'high',
      lastActivity: '2 hours ago',
      progress: 75
    },
    {
      id: 'RFP-2024-002',
      title: 'API Manufacturing Partnership',
      categories: ['APIs', 'Raw Materials'],
      status: 'evaluation',
      createdDate: '2024-01-10',
      deadline: '2024-03-15',
      suppliersInvited: 5,
      responsesReceived: 5,
      budget: '$1M - $5M',
      priority: 'high',
      lastActivity: '1 day ago',
      progress: 90
    },
    {
      id: 'RFP-2024-003',
      title: 'Secondary Packaging Solutions',
      categories: ['Secondary Packaging'],
      status: 'sent',
      createdDate: '2024-01-20',
      deadline: '2024-03-01',
      suppliersInvited: 12,
      responsesReceived: 3,
      budget: '$100K - $500K',
      priority: 'medium',
      lastActivity: '3 hours ago',
      progress: 25
    },
    {
      id: 'RFP-2024-004',
      title: 'Quality Testing Services',
      categories: ['Testing Services'],
      status: 'awarded',
      createdDate: '2024-01-05',
      deadline: '2024-02-15',
      suppliersInvited: 6,
      responsesReceived: 4,
      budget: '$100K - $500K',
      priority: 'medium',
      lastActivity: '1 week ago',
      progress: 100
    },
    {
      id: 'RFP-2024-005',
      title: 'Equipment Maintenance Contract',
      categories: ['Equipment'],
      status: 'draft',
      createdDate: '2024-01-25',
      deadline: '2024-04-01',
      suppliersInvited: 0,
      responsesReceived: 0,
      budget: '$500K - $1M',
      priority: 'low',
      lastActivity: '5 days ago',
      progress: 30
    },
    {
      id: 'RFP-2024-006',
      title: 'Cold Chain Logistics Partnership',
      categories: ['Logistics'],
      status: 'closed',
      createdDate: '2023-12-15',
      deadline: '2024-01-31',
      suppliersInvited: 4,
      responsesReceived: 4,
      budget: '$1M - $5M',
      priority: 'high',
      lastActivity: '2 weeks ago',
      progress: 100
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'sent': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'responses_received': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'evaluation': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'awarded': return 'text-green-600 bg-green-50 border-green-200';
      case 'closed': return 'text-gray-600 bg-gray-100 border-gray-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'responses_received': return <MessageSquare className="h-4 w-4" />;
      case 'evaluation': return <TrendingUp className="h-4 w-4" />;
      case 'awarded': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <Clock className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredRFPs = rfps.filter(rfp => {
    const matchesSearch = rfp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rfp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rfp.categories.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || rfp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 30) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const selectedRFPData = filteredRFPs.find(r => r.id === selectedRFP);

  const handleViewDetails = () => {
    setCurrentView('details');
  };

  const handleCommunications = () => {
    setCurrentView('communications');
  };

  const handleBackToList = () => {
    setCurrentView('list');
  };

  const handleExport = () => {
    if (selectedRFPData) {
      // Create a simple CSV export
      const csvContent = `RFP ID,Title,Status,Deadline,Budget,Responses\n${selectedRFPData.id},"${selectedRFPData.title}",${selectedRFPData.status},${selectedRFPData.deadline},${selectedRFPData.budget},${selectedRFPData.responsesReceived}/${selectedRFPData.suppliersInvited}`;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedRFPData.id}_export.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  // Reset to list view when component mounts
  useEffect(() => {
    setCurrentView('list');
  }, []);

  return (
    <div className="p-4 md:p-8">
      {/* RFP Details View */}
      {currentView === 'details' && selectedRFPData && (
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <button 
                onClick={handleBackToList}
                className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to RFP List
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">RFP Details</h1>
            <p className="text-gray-600">{selectedRFPData.title}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">RFP ID</label>
                      <p className="text-gray-900 font-mono">{selectedRFPData.id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Title</label>
                      <p className="text-gray-900">{selectedRFPData.title}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Categories</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedRFPData.categories.map((category, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(selectedRFPData.status)}`}>
                        {getStatusIcon(selectedRFPData.status)}
                        <span className="ml-1">{formatStatus(selectedRFPData.status)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Budget Range</label>
                      <p className="text-gray-900">{selectedRFPData.budget}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Created Date</label>
                      <p className="text-gray-900">{new Date(selectedRFPData.createdDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Deadline</label>
                      <p className="text-gray-900">{new Date(selectedRFPData.deadline).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Priority</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getPriorityColor(selectedRFPData.priority)}`}>
                        {selectedRFPData.priority}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Response Statistics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Statistics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedRFPData.suppliersInvited}</div>
                    <div className="text-sm text-blue-600">Suppliers Invited</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedRFPData.responsesReceived}</div>
                    <div className="text-sm text-green-600">Responses Received</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{selectedRFPData.progress}%</div>
                    <div className="text-sm text-purple-600">Progress</div>
                  </div>
                </div>
              </div>
              
              {/* Progress Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-600">RFP Created - {new Date(selectedRFPData.createdDate).toLocaleDateString()}</span>
                  </div>
                  {selectedRFPData.status !== 'draft' && (
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-600">RFP Sent to Suppliers</span>
                    </div>
                  )}
                  {selectedRFPData.responsesReceived > 0 && (
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-600">Responses Received ({selectedRFPData.responsesReceived})</span>
                    </div>
                  )}
                  {selectedRFPData.status === 'evaluation' && (
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-600">Evaluation in Progress</span>
                    </div>
                  )}
                  {selectedRFPData.status === 'awarded' && (
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-600">RFP Awarded</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2 inline" />
                  Export Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Communications View */}
      {currentView === 'communications' && selectedRFPData && (
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <button 
                onClick={handleBackToList}
                className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to RFP List
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">RFP Communications</h1>
            <p className="text-gray-600">Communication history for {selectedRFPData.title}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="space-y-6">
              {/* Communication Timeline */}
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Send className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">RFP Sent to Suppliers</h4>
                        <span className="text-sm text-gray-500">2 days ago</span>
                      </div>
                      <p className="text-sm text-gray-600">RFP document sent to {selectedRFPData.suppliersInvited} suppliers</p>
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">Recipients: Supplier A, Supplier B, Supplier C...</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">Response Received</h4>
                        <span className="text-sm text-gray-500">1 day ago</span>
                      </div>
                      <p className="text-sm text-gray-600">Supplier A submitted their response</p>
                      <div className="mt-2">
                        <button className="text-xs text-blue-600 hover:text-blue-700">View Response →</button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">Clarification Request</h4>
                        <span className="text-sm text-gray-500">6 hours ago</span>
                      </div>
                      <p className="text-sm text-gray-600">Supplier B requested clarification on technical specifications</p>
                      <div className="mt-2">
                        <button className="text-xs text-blue-600 hover:text-blue-700">Respond →</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {currentView === 'list' && (
        <>
          <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">RFP Tracker</h1>
            <p className="text-gray-600">Monitor and manage all RFP processes from creation to award</p>
          </div>
          <button 
            onClick={() => navigate('/rfp-wizard')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New RFP
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-blue-600">{rfps.length}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total RFPs</p>
            <p className="text-2xl font-bold text-gray-900">{rfps.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <span className="text-2xl font-bold text-yellow-600">
              {rfps.filter(r => r.status === 'sent' || r.status === 'responses_received').length}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Active RFPs</p>
            <p className="text-2xl font-bold text-gray-900">
              {rfps.filter(r => r.status === 'sent' || r.status === 'responses_received').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-purple-600">
              {rfps.filter(r => r.status === 'evaluation').length}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">In Evaluation</p>
            <p className="text-2xl font-bold text-gray-900">
              {rfps.filter(r => r.status === 'evaluation').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-green-600">
              {rfps.filter(r => r.status === 'awarded').length}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Awarded</p>
            <p className="text-2xl font-bold text-gray-900">
              {rfps.filter(r => r.status === 'awarded').length}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search RFPs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Selected RFP Actions */}
      {selectedRFP && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 md:mb-6">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Selected: {rfps.find(r => r.id === selectedRFP)?.title}
                </h3>
                <p className="text-xs text-gray-600">Choose an action for this RFP</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleViewDetails}
                  className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </button>
                <button
                  onClick={handleCommunications}
                  className="flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 text-sm"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Communications
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RFP Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RFP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRFPs.map((rfp) => {
                  const daysUntilDeadline = getDaysUntilDeadline(rfp.deadline);
                  return (
                    <tr 
                      key={rfp.id} 
                      onClick={() => setSelectedRFP(rfp.id)}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedRFP === rfp.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rfp.title}</div>
                          <div className="text-sm text-gray-500">{rfp.id}</div>
                          <div className="flex flex-wrap gap-1 mt-1 max-w-[200px]">
                            {rfp.categories.slice(0, 2).map((category, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rfp.status)}`}>
                          {getStatusIcon(rfp.status)}
                          <span className="ml-1">{formatStatus(rfp.status)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                              className={`h-2 rounded-full ${getProgressColor(rfp.progress)}`}
                              style={{ width: `${rfp.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900 whitespace-nowrap">{rfp.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{rfp.responsesReceived}/{rfp.suppliersInvited}</div>
                        <div className="text-xs text-gray-500">suppliers</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{new Date(rfp.deadline).toLocaleDateString()}</div>
                        <div className={`text-xs whitespace-nowrap ${
                          daysUntilDeadline < 0 ? 'text-red-600' :
                          daysUntilDeadline < 7 ? 'text-yellow-600' : 'text-gray-500'
                        }`}>
                          {daysUntilDeadline < 0 ? 'Overdue' : `${daysUntilDeadline} days left`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 whitespace-nowrap">{rfp.budget}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </div>

      {filteredRFPs.length === 0 && (
        <div className="text-center py-8 md:py-12">
          <div className="text-gray-400 mb-4">
            <FileText className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No RFPs found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
          <button 
            onClick={() => navigate('/rfp-wizard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First RFP
          </button>
        </div>
      )}
        </>
      )}

    </div>
  );
}