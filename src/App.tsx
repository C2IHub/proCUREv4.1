import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navigation from './components/Navigation';
import AgenticInterface from './components/AgenticInterface';
import AgentReasoning from './pages/AgentReasoning';
import RiskComplianceDashboard from './pages/RiskComplianceDashboard';
import SupplierTracker from './pages/SupplierTracker';
import RFPWizard from './pages/RFPWizard';
import RFPTracker from './pages/RFPTracker';
import SupplierPortal from './pages/SupplierPortal';
import AuditTrail from './pages/AuditTrail';
import Settings from './pages/Settings';
import WorkflowDashboard from './pages/WorkflowDashboard';
import { BedrockAgentProvider } from './context/BedrockAgentProvider';
import { StrandsSystemProvider } from './context/StrandsSystemProvider';
import { SupplierProvider } from './hooks/useSupplierContext';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const [currentUser] = useState({
    name: 'Sarah Chen',
    role: 'Compliance Manager',
    avatar: 'https://images.pexels.com/photos/3785077/pexels-photo-3785077.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2'
  });

  return (
    <QueryClientProvider client={queryClient}>
      <StrandsSystemProvider>
        <BedrockAgentProvider>
          <SupplierProvider>
            <Router>
              <div className="min-h-screen bg-gray-50">
                <Navigation currentUser={currentUser} />
                <main className="pl-64 pr-120">
                  <Routes>
                    <Route path="/" element={<RiskComplianceDashboard />} />
                    <Route path="/supplier-tracker" element={<SupplierTracker />} />
                    <Route path="/rfp-wizard" element={<RFPWizard />} />
                    <Route path="/rfp-tracker" element={<RFPTracker />} />
                    <Route path="/audit-trail" element={<AuditTrail />} />
                    <Route path="/workflows" element={<WorkflowDashboard />} />
                    <Route path="/settings" element={<Settings />} />
                    {/* Dynamic supplier routes */}
                    <Route path="/supplier/:id/reasoning" element={<AgentReasoning />} />
                    <Route path="/supplier/:id/portal" element={<SupplierPortal />} />
                  </Routes>
                </main>
                <Routes>
                  <Route path="/" element={
                    <AgenticInterface 
                      context="compliance"
                      contextData={{}}
                    />
                  } />
                  <Route path="/supplier-tracker" element={
                    <AgenticInterface 
                      context="supplier"
                      contextData={{}}
                    />
                  } />
                  <Route path="/rfp-wizard" element={
                    <AgenticInterface 
                      context="rfp"
                      contextData={{}}
                    />
                  } />
                  <Route path="/rfp-tracker" element={
                    <AgenticInterface 
                      context="tracker"
                      contextData={{}}
                    />
                  } />
                  <Route path="/audit-trail" element={
                    <AgenticInterface 
                      context="audit"
                      contextData={{}}
                    />
                  } />
                  <Route path="/workflows" element={
                    <AgenticInterface 
                      context="workflow"
                      contextData={{}}
                    />
                  } />
                  <Route path="/settings" element={
                    <AgenticInterface 
                      context="compliance"
                      contextData={{}}
                    />
                  } />
                  <Route path="/supplier/:id/reasoning" element={
                    <AgenticInterface 
                      context="supplier"
                      contextData={{}}
                    />
                  } />
                  <Route path="/supplier/:id/portal" element={
                    <AgenticInterface 
                      context="portal"
                      contextData={{}}
                    />
                  } />
                </Routes>
              </div>
            </Router>
          </SupplierProvider>
        </BedrockAgentProvider>
      </StrandsSystemProvider>
    </QueryClientProvider>
  );
}

export default App;