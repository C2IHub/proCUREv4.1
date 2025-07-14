import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, Brain, Loader, X, Minimize2, Maximize2, MessageCircle } from 'lucide-react';
import { useComplianceAgent, useRiskAgent, useDocumentAgent } from '../context/BedrockAgentProvider';

interface AgenticInterfaceProps {
  context: string; // e.g., 'compliance', 'risk', 'rfp', 'supplier', 'audit'
  contextData?: any; // Additional context data like supplier info, RFP data, etc.
  suggestedQuestions?: string[];
  isOpen: boolean;
  onToggle: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export default function AgenticInterface({ 
  context, 
  contextData, 
  suggestedQuestions = [],
  isOpen,
  onToggle
}: AgenticInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const complianceAgent = useComplianceAgent();
  const riskAgent = useRiskAgent();
  const documentAgent = useDocumentAgent();

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Default suggested questions based on context
  const defaultSuggestedQuestions = {
    compliance: [
      "What's the overall compliance status?",
      "Which suppliers need immediate attention?",
      "Show me upcoming certification renewals",
      "Analyze compliance trends this quarter"
    ],
    risk: [
      "What are the highest risk suppliers?",
      "Show me emerging risk patterns",
      "What mitigation strategies do you recommend?",
      "Analyze supply chain vulnerabilities"
    ],
    rfp: [
      "Help me create an RFP for packaging materials",
      "What compliance requirements should I include?",
      "Suggest evaluation criteria for suppliers",
      "Show me similar past RFPs"
    ],
    supplier: [
      "Analyze this supplier's performance",
      "What are the key risk factors?",
      "Compare with industry benchmarks",
      "Recommend next steps for improvement"
    ],
    audit: [
      "Show me recent compliance violations",
      "What patterns do you see in audit findings?",
      "Generate an audit summary report",
      "Identify areas needing attention"
    ],
    tracker: [
      "Analyze this RFP's progress and timeline",
      "What are the key risks for this RFP?",
      "Compare supplier responses and recommendations",
      "Generate RFP performance summary"
    ],
    scoring: [
      "Rank suppliers by performance",
      "What factors drive supplier scores?",
      "Show me improvement opportunities",
      "Compare supplier categories"
    ],
    portal: [
      "What documents need updating?",
      "Show compliance status summary",
      "What are the next deadlines?",
      "Help with document submission"
    ],
    communications: [
      "Summarize recent communications",
      "Draft follow-up message to suppliers",
      "Analyze response patterns",
      "Suggest next communication steps"
    ]
  };

  const questions = suggestedQuestions.length > 0 
    ? suggestedQuestions 
    : defaultSuggestedQuestions[context as keyof typeof defaultSuggestedQuestions] || [];

  const getAgentForContext = () => {
    switch (context) {
      case 'compliance':
      case 'supplier':
      case 'portal':
        return complianceAgent;
      case 'risk':
        return riskAgent;
      case 'audit':
      case 'rfp':
      case 'tracker':
      case 'scoring':
      case 'communications':
        return documentAgent;
      default:
        return complianceAgent;
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    const loadingMessage: ChatMessage = {
      id: `agent-${Date.now()}`,
      type: 'agent',
      content: '',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const agent = getAgentForContext();
      const contextPrompt = buildContextPrompt(message);
      
      const response = await agent.invoke({
        prompt: contextPrompt,
        sessionId: `${context}-${Date.now()}`,
        context: contextData
      });

      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? { ...msg, content: response.response, isLoading: false }
          : msg
      ));
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isLoading: false }
          : msg
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const buildContextPrompt = (userMessage: string) => {
    let contextInfo = `Context: ${context.toUpperCase()} screen\n`;
    
    if (contextData) {
      if (contextData.supplierName) {
        contextInfo += `Supplier: ${contextData.supplierName}\n`;
      }
      if (contextData.category) {
        contextInfo += `Category: ${contextData.category}\n`;
      }
      if (contextData.rfpTitle) {
        contextInfo += `RFP: ${contextData.rfpTitle}\n`;
      }
    }
    
    return `${contextInfo}\nUser Question: ${userMessage}\n\nPlease provide a helpful response based on the context and available data.`;
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
    // Auto-send the suggested question
    handleSendMessage(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  return (
    <div className={`h-full bg-white border-l border-gray-200 shadow-lg transition-all duration-300 flex flex-col ${
      isOpen ? 'w-full sm:w-[320px] lg:w-[400px]' : 'w-12'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
        <div className="flex items-center justify-between">
          {isOpen && (
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">proCURE AI Assistant</h3>
                <div className="flex items-center text-sm text-purple-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  <span>Always here to help</span>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center space-x-2">
            {isOpen && (
              <div className="flex items-center text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                <Sparkles className="h-3 w-3 mr-1" />
                <span>AI Powered</span>
              </div>
            )}
            <button
              onClick={onToggle}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              {isOpen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <>
          {/* Quick Questions */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Questions</h4>
            <div className="space-y-2">
              {questions.slice(0, 4).map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="w-full text-left p-3 bg-white hover:bg-purple-50 rounded-lg transition-colors text-sm text-gray-700 hover:text-purple-700 border border-gray-200 hover:border-purple-200"
                >
                  <MessageSquare className="h-4 w-4 inline mr-2 text-gray-400" />
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4" 
            style={{ height: 'calc(100vh - 320px)', minHeight: '200px' }}
            id="messages-container"
          >
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-purple-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Ask me anything about your {context} data</p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center">
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                      <span>Thinking...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0 mt-auto">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm max-h-20"
                  rows={1}
                  disabled={isProcessing}
                />
              </div>
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isProcessing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isProcessing ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </>
      )}

      {/* Minimized State */}
      {!isOpen && (
        <div className="p-4 text-center">
          <Brain className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500 transform -rotate-90 whitespace-nowrap hidden md:block">proCURE AI</p>
        </div>
      )}
    </div>
  );
}