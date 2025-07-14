import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  FileText, 
  ShieldAlert,
  Users, 
  ClipboardList,
  ChevronDown,
  Settings,
  LogOut,
  History,
  Workflow,
  Menu,
  X
} from 'lucide-react';

interface NavigationProps {
  currentUser: {
    name: string;
    role: string;
    avatar: string;
  };
  isOpen: boolean;
  onToggle: () => void;
}

export default function Navigation({ currentUser, isOpen, onToggle }: NavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navigationSections = [
    {
      title: 'Supplier Management',
      items: [
        { name: 'Risk & Compliance', href: '/', icon: Shield },
        { name: 'Supplier Tracker', href: '/supplier-tracker', icon: Users },
      ]
    },
    {
      title: 'RFP Management',
      items: [
        { name: 'RFP Generator', href: '/rfp-wizard', icon: FileText },
        { name: 'RFP Tracker', href: '/rfp-tracker', icon: ClipboardList },
      ]
    },
    {
      title: 'System',
      items: [
        { name: 'Workflows', href: '/workflows', icon: Workflow },
        { name: 'Audit Trail', href: '/audit-trail', icon: History },
        { name: 'Settings', href: '/settings', icon: Settings },
      ]
    }
  ];

  const renderNavSection = (section: typeof navigationSections[0]) => {
    return (
      <div key={section.title} className="space-y-1">
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {section.title}
        </h3>
        {section.items.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href} 
              className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-0 left-0 right-0 z-40 md:hidden flex items-center justify-between bg-white p-3 border-b border-gray-200 shadow-sm">
        <button
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-gray-100"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-blue-600" />
          <span className="ml-2 font-semibold text-gray-900">proCURE</span>
        </div>
        <div className="w-10"></div> {/* Spacer for balance */}
      </div>
      
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
      
      <div className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300 overflow-y-auto ${
        isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-64 w-3/4'
      } md:w-64 w-3/4 ${window.innerWidth < 768 ? 'pt-14' : ''}`}>
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <Shield className="h-8 w-8 text-blue-600" />
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">proCURE</h1>
            <p className="text-xs text-gray-500">AI-Powered Procurement</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-4 py-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {navigationSections.map(renderNavSection)}
      </nav>

      {/* User Profile */}
      <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center w-full px-3 py-2 text-sm rounded-lg hover:bg-gray-50 overflow-hidden"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="h-8 w-8 rounded-full object-cover"
            />
            <div className="ml-3 text-left flex-1">
              <p className="font-medium text-gray-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500">{currentUser.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="py-1">
                <button onClick={() => navigate('/settings')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </button>
                <button onClick={() => alert('Sign out functionality would go here')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <LogOut className="mr-3 h-4 w-4" /> 
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}