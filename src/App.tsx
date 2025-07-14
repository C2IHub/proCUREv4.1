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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Close sidebar on small screens when route changes
  const handleCloseSidebarOnMobile = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <StrandsSystemProvider>
        <BedrockAgentProvider>
          <SupplierProvider>
            <Router onChange={handleCloseSidebarOnMobile}>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navigation 
                  currentUser={currentUser} 
                  isOpen={sidebarOpen} 
                  onToggle={() => {
                    setSidebarOpen(!sidebarOpen);
                    // Close AI panel when opening sidebar on mobile
                    if (window.innerWidth < 768 && !sidebarOpen) {
                      setAiPanelOpen(false);
                    }
                  }} 
                />
                <div className="flex-1 flex relative">
                  {/* Overlay for mobile when sidebar or AI panel is open */}
                  {(sidebarOpen || aiPanelOpen) && (
                    <div 
                      className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                      onClick={() => {
                        setSidebarOpen(false);
                        setAiPanelOpen(false);
                      }}
                    />
                  )}
                  
                  <main className={`flex-1 transition-all duration-300 ${
                    sidebarOpen ? 'md:ml-64' : ''
                  } ${
                    aiPanelOpen ? 'md:mr-[320px] lg:mr-[400px]' : ''
                  }`}>
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
                  
                  {/* AI Assistant Panel - Fixed position */}
                  <Routes>
                    <Route path="/" element={
                      <AgenticInterface 
                        context="compliance"
                        contextData={{}}
                        isOpen={aiPanelOpen}
                        onToggle={() => {
                          setAiPanelOpen(!aiPanelOpen);
                          // Close sidebar when opening AI panel on mobile
                          if (window.innerWidth < 768 && !aiPanelOpen) {
                            setSidebarOpen(false);
                          }
                        }}
                      />
                    } />
                    <Route path="/supplier-tracker" element={
                      <AgenticInterface 
                        context="supplier"
                        contextData={{}}
                        isOpen={aiPanelOpen}
                        onToggle={() => {
                          setAiPanelOpen(!aiPanelOpen);
                          if (window.innerWidth < 768 && !aiPanelOpen) {
                            setSidebarOpen(false);
                          }
                        }}
                      />
                    } />
                    <Route path="/rfp-wizard" element={
                      <AgenticInterface 
                        context="rfp"
                        contextData={{}}
                        isOpen={aiPanelOpen}
                        onToggle={() => {
                          setAiPanelOpen(!aiPanelOpen);
                          if (window.innerWidth < 768 && !aiPanelOpen) {
                            setSidebarOpen(false);
                          }
                        }}
                      />
                    } />
                    <Route path="/rfp-tracker" element={
                      <AgenticInterface 
                        context="tracker"
                        contextData={{}}
                        isOpen={aiPanelOpen}
                        onToggle={() => {
                          setAiPanelOpen(!aiPanelOpen);
                          if (window.innerWidth < 768 && !aiPanelOpen) {
                            setSidebarOpen(false);
                          }
                        }}
                      />
                    } />
                    <Route path="/audit-trail" element={
                      <AgenticInterface 
                        context="audit"
                        contextData={{}}
                        isOpen={aiPanelOpen}
                        onToggle={() => {
                          setAiPanelOpen(!aiPanelOpen);
                          if (window.innerWidth < 768 && !aiPanelOpen) {
                            setSidebarOpen(false);
                          }
                        }}
                      />
                    } />
                    <Route path="/workflows" element={
                      <AgenticInterface 
                        context="workflow"
                        contextData={{}}
                        isOpen={aiPanelOpen}
                        onToggle={() => {
                          setAiPanelOpen(!aiPanelOpen);
                          if (window.innerWidth < 768 && !aiPanelOpen) {
                            setSidebarOpen(false);
                          }
                        }}
                      />
                    } />
                    <Route path="/settings" element={
                      <AgenticInterface 
                        context="compliance"
                        contextData={{}}
                        isOpen={aiPanelOpen}
                        onToggle={() => {
                          setAiPanelOpen(!aiPanelOpen);
                          if (window.innerWidth < 768 && !aiPanelOpen) {
                            setSidebarOpen(false);
                          }
                        }}
                      />
                    } />
                    <Route path="/supplier/:id/reasoning" element={
                      <AgenticInterface 
                        context="supplier"
                        contextData={{}}
                        isOpen={aiPanelOpen}
                        onToggle={() => {
                          setAiPanelOpen(!aiPanelOpen);
                          if (window.innerWidth < 768 && !aiPanelOpen) {
                            setSidebarOpen(false);
                          }
                        }}
                      />
                    } />
                    <Route path="/supplier/:id/portal" element={
                      <AgenticInterface 
                        context="portal"
                        contextData={{}}
                        isOpen={aiPanelOpen}
                        onToggle={() => {
                          setAiPanelOpen(!aiPanelOpen);
                          if (window.innerWidth < 768 && !aiPanelOpen) {
                            setSidebarOpen(false);
                          }
                        }}
                      />
                    } />
                  </Routes>
                </div>
              </div>
            </Router>
          </SupplierProvider>
        </BedrockAgentProvider>
      </StrandsSystemProvider>
    </QueryClientProvider>
  );
}

export default App;