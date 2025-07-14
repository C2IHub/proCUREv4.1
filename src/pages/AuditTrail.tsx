import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  User, 
  Bot, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Calendar,
  ChevronDown,
  ArrowUpDown,
  Sliders
} from 'lucide-react';
import { useAuditEvents } from '../hooks/useApi';
import { AuditEvent } from '../types';

export default function AuditTrail() {
  const [searchTerm, setSearchTerm] = useState(''); 
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [sortField, setSortField] = useState<keyof AuditEvent>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: auditData, isLoading, error } = useAuditEvents(currentPage, 20);

  const handleSort = (field: keyof AuditEvent) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredEvents = useMemo(() => {
    if (!auditData?.data) return [];
    
    return auditData.data.filter(event => {
      // Search filter
      const matchesSearch = 
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        event.type.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter
      const matchesType = selectedFilter === 'all' || event.type === selectedFilter;
      
      // Severity filter
      const matchesSeverity = selectedSeverity === 'all' || event.severity === selectedSeverity;
      
      return matchesSearch && matchesType && matchesSeverity;
    });
  }, [auditData?.data, searchTerm, selectedFilter, selectedSeverity]);

  // Sort the filtered events
  const sortedEvents = useMemo(() => {
    if (!filteredEvents.length) return [];
    
    return [...filteredEvents].sort((a, b) => {
      if (sortField === 'timestamp') {
        const dateA = new Date(a[sortField]).getTime();
        const dateB = new Date(b[sortField]).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (a[sortField] < b[sortField]) return sortDirection === 'asc' ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredEvents, sortField, sortDirection]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'compliance_check': return <CheckCircle className="h-4 w-4" />;
      case 'risk_assessment': return <AlertTriangle className="h-4 w-4" />;
      case 'document_upload': return <FileText className="h-4 w-4" />;
      case 'score_update': return <History className="h-4 w-4" />;
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
      case 'approval': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'critical': return 'text-red-700 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleViewDetails = (event: AuditEvent) => {
    setSelectedEvent(event);
  };

  const handleExportCSV = () => {
    if (!sortedEvents.length) return;
    
    // Create CSV content
    const headers = ['ID', 'Timestamp', 'Type', 'Description', 'Supplier', 'Severity', 'Status'];
    const rows = sortedEvents.map(event => [
      event.id,
      new Date(event.timestamp).toLocaleString(),
      formatType(event.type),
      event.description,
      event.supplierName || 'N/A',
      event.severity,
      event.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const eventTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'compliance_check', label: 'Compliance Check' },
    { value: 'risk_assessment', label: 'Risk Assessment' },
    { value: 'document_upload', label: 'Document Upload' },
    { value: 'score_update', label: 'Score Update' },
    { value: 'alert', label: 'Alert' },
    { value: 'approval', label: 'Approval' }
  ];

  const severityOptions = [
    { value: 'all', label: 'All Severities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  return (
    <div className="p-3 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Trail</h1>
        <p className="text-gray-600">Complete history of system events, user actions, and compliance activities</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search audit events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-1 md:space-x-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Sliders className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm text-gray-700">Filters</span>
              <ChevronDown className={`h-4 w-4 ml-2 text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            <button 
              onClick={handleExportCSV}
              disabled={!sortedEvents.length}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="mt-3 pt-3 md:mt-4 md:pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {eventTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {severityOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <span className="text-gray-500">to</span>
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-3 md:space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Event ID</h4>
                  <p className="text-gray-900 font-mono">{selectedEvent.id}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Type</h4>
                  <div className="flex items-center mt-1">
                    <span className="flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {getTypeIcon(selectedEvent.type)}
                      <span className="ml-1">{formatType(selectedEvent.type)}</span>
                    </span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Description</h4>
                  <p className="text-gray-900">{selectedEvent.description}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Timestamp</h4>
                    <p className="text-gray-900">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Severity</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium capitalize ${getSeverityColor(selectedEvent.severity)}`}>
                      {selectedEvent.severity}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Status</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium capitalize ${getStatusColor(selectedEvent.status)}`}>
                      {selectedEvent.status}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Supplier</h4>
                    <p className="text-gray-900">{selectedEvent.supplierName || 'N/A'}</p>
                  </div>
                </div>
                
                {selectedEvent.details && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Additional Details</h4>
                    <pre className="mt-1 p-2 md:p-3 bg-gray-50 rounded-md text-sm overflow-x-auto">
                      {JSON.stringify(selectedEvent.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Events Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6 md:p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading audit events...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Error loading audit events. Please try again.</p>
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="p-6 md:p-8 text-center">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audit events found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('timestamp')}
                  >
                    <div className="flex items-center">
                      Timestamp
                      {sortField === 'timestamp' && (
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      )}
                    </div> 
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Type
                      {sortField === 'type' && (
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Description
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('supplierName')}
                  >
                    <div className="flex items-center">
                      Supplier
                      {sortField === 'supplierName' && (
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      )}
                    </div> 
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('severity')}
                  >
                    <div className="flex items-center">
                      Severity
                      {sortField === 'severity' && (
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="hidden sm:table-cell"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {sortField === 'status' && (
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getTypeIcon(event.type)}
                          <span className="ml-1">{formatType(event.type)}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md hidden md:table-cell">
                      <div className="truncate">{event.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.supplierName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getSeverityColor(event.severity)}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium hidden sm:table-cell">
                      <button
                        onClick={() => handleViewDetails(event)}
                        className="text-blue-600 hover:text-blue-900 flex items-center justify-end"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {auditData && auditData.total > auditData.pageSize && (
        <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * auditData.pageSize + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * auditData.pageSize, auditData.total)}
            </span>{' '}
            of <span className="font-medium">{auditData.total}</span> results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {currentPage} of {Math.ceil(auditData.total / auditData.pageSize)}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!auditData.hasNext}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}