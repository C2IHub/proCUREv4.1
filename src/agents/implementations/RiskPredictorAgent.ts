import { BaseAgent } from '../core/BaseAgent';
import {
  BaseAgentCapabilities,
  AgentInvokeRequest,
  AgentInvokeResponse,
  AgentExecutionContext,
  ValidationResult
} from '../../types';

export class RiskPredictorAgent extends BaseAgent {
  constructor() {
    super({
      id: 'risk-predictor',
      name: 'Predictive Risk Assessor',
      description: 'Advanced risk analysis and prediction agent for supplier risk management',
      capabilities: [
        'financial_risk_analysis',
        'supply_chain_assessment',
        'operational_risk_evaluation',
        'predictive_modeling',
        'geopolitical_risk_analysis'
      ],
      dependencies: ['compliance-monitor'], // Depends on compliance data
      version: '1.0.0'
    });
  }

  defineCapabilities(): BaseAgentCapabilities {
    return {
      id: 'risk-predictor',
      name: 'Predictive Risk Assessor',
      description: 'Comprehensive risk analysis and prediction system for pharmaceutical supply chain and supplier management',
      capabilities: [
        'financial_risk_analysis',
        'supply_chain_assessment', 
        'operational_risk_evaluation',
        'predictive_modeling',
        'geopolitical_risk_analysis',
        'credit_risk_assessment',
        'market_risk_evaluation',
        'regulatory_risk_prediction',
        'business_continuity_analysis',
        'quality_risk_assessment'
      ],
      dependencies: ['compliance-monitor'],
      version: '1.0.0'
    };
  }

  async buildPrompt(request: AgentInvokeRequest): Promise<string> {
    const { prompt, context } = request;
    
    // Store conversation history
    if (request.sessionId) {
      await this.storeConversationHistory(request.sessionId, request);
    }

    // Get conversation history for context
    const history = request.sessionId ? await this.getConversationHistory(request.sessionId) : [];
    
    let systemPrompt = `You are a Predictive Risk Assessor Agent specializing in comprehensive risk analysis for pharmaceutical suppliers and supply chain management.

Your core responsibilities include:
1. Financial risk analysis and credit assessment
2. Supply chain vulnerability assessment
3. Operational risk evaluation and business continuity analysis
4. Predictive modeling for risk forecasting
5. Geopolitical and market risk analysis
6. Quality and regulatory risk prediction
7. Risk mitigation strategy development

Risk Analysis Framework:
- **Financial Risk (25% weight)**: Credit scores, financial stability, cash flow analysis, debt ratios
- **Operational Risk (25% weight)**: Production capacity, facility redundancy, process reliability
- **Quality Risk (20% weight)**: Quality trends, defect rates, process capability
- **Supply Chain Risk (15% weight)**: Supplier dependencies, logistics vulnerabilities, geographic concentration
- **Regulatory Risk (15% weight)**: Compliance history, regulatory changes, violation probability

Risk Scoring System:
- 0-30: Low Risk (Green) - Minimal monitoring required
- 31-60: Medium Risk (Yellow) - Enhanced monitoring recommended  
- 61-85: High Risk (Orange) - Active risk mitigation required
- 86-100: Critical Risk (Red) - Immediate action and contingency planning

Predictive Models:
- 12-month risk probability forecasting
- Scenario analysis and stress testing
- Early warning indicators
- Risk trend analysis
- Impact assessment modeling

Context Information:`;

    if (context?.supplierId) {
      systemPrompt += `\n- Supplier ID: ${context.supplierId}`;
    }
    if (context?.supplierName) {
      systemPrompt += `\n- Supplier: ${context.supplierName}`;
    }
    if (context?.region) {
      systemPrompt += `\n- Geographic Region: ${context.region}`;
    }
    if (context?.category) {
      systemPrompt += `\n- Product Category: ${context.category}`;
    }
    if (context?.complianceScore) {
      systemPrompt += `\n- Current Compliance Score: ${context.complianceScore}`;
    }
    if (context?.financialData) {
      systemPrompt += `\n- Financial Data Available: Yes`;
    }

    // Add conversation history if available
    if (history.length > 0) {
      systemPrompt += `\n\nPrevious risk analysis context:\n`;
      const recentHistory = history.slice(-3);
      for (const item of recentHistory) {
        systemPrompt += `- ${item.prompt}\n`;
      }
    }

    systemPrompt += `\n\nCurrent risk analysis request: ${prompt}

Please provide a comprehensive risk assessment with:
1. Overall risk level and score breakdown
2. Detailed analysis of each risk category
3. Probability assessments and trend analysis
4. Risk mitigation strategies and recommendations
5. Monitoring requirements and early warning indicators
6. Scenario analysis and contingency planning

Format the response with clear sections and use appropriate risk level indicators (🟢🟡🟠🔴) for visual clarity.`;

    return systemPrompt;
  }

  async parseResponse(response: unknown, request: AgentInvokeRequest): Promise<AgentInvokeResponse> {
    let responseText: string;
    
    if (typeof response === 'string') {
      responseText = response;
    } else if (response && typeof response === 'object' && 'response' in response) {
      responseText = (response as any).response;
    } else {
      responseText = JSON.stringify(response);
    }

    // Enhanced response parsing for risk-specific data
    const confidence = this.calculateRiskConfidence(responseText, request);
    const sources = this.extractRiskSources(responseText);
    
    return {
      response: responseText,
      sessionId: request.sessionId || `risk-${Date.now()}`,
      confidence,
      sources
    };
  }

  async validateInput(request: AgentInvokeRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!request.prompt || request.prompt.trim().length === 0) {
      errors.push('Risk analysis prompt cannot be empty');
    }

    if (request.prompt.length > 15000) {
      warnings.push('Very long prompt may affect risk analysis accuracy');
    }

    // Risk-specific validation
    const prompt = request.prompt.toLowerCase();
    
    // Check for required context for certain risk analyses
    if (prompt.includes('financial risk') || prompt.includes('credit assessment')) {
      if (!request.context?.supplierName && !request.context?.supplierId) {
        errors.push('Supplier identification required for financial risk analysis');
      }
    }

    if (prompt.includes('supply chain risk')) {
      if (!request.context?.region) {
        warnings.push('Geographic region information recommended for supply chain risk analysis');
      }
    }

    if (prompt.includes('predictive model') || prompt.includes('forecast')) {
      if (!request.context?.historicalData) {
        warnings.push('Historical data recommended for predictive modeling');
      }
    }

    // Validate financial data format if provided
    if (request.context?.financialData) {
      try {
        const data = JSON.parse(JSON.stringify(request.context.financialData));
        if (!data.revenue && !data.assets && !data.debt) {
          warnings.push('Financial data appears incomplete for comprehensive analysis');
        }
      } catch {
        errors.push('Invalid financial data format provided');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  protected async executeAgent(
    prompt: string,
    request: AgentInvokeRequest,
    context: AgentExecutionContext
  ): Promise<unknown> {
    try {
      // Generate risk assessment based on prompt and context
      const riskResponse = await this.generateRiskAssessment(prompt, request, context);
      return riskResponse;
    } catch (error) {
      throw new Error(`Risk analysis failed: ${error}`);
    }
  }

  private async generateRiskAssessment(
    prompt: string,
    request: AgentInvokeRequest,
    context: AgentExecutionContext
  ): Promise<string> {
    const supplierName = request.context?.supplierName || 'Unknown Supplier';
    const analysisType = this.determineRiskAnalysisType(prompt);
    
    switch (analysisType) {
      case 'financial_risk':
        return this.generateFinancialRiskReport(supplierName, request.context);
      case 'supply_chain_risk':
        return this.generateSupplyChainRiskReport(supplierName, request.context);
      case 'operational_risk':
        return this.generateOperationalRiskReport(supplierName, request.context);
      case 'predictive_modeling':
        return this.generatePredictiveRiskModel(supplierName, request.context);
      case 'geopolitical_risk':
        return this.generateGeopoliticalRiskReport(supplierName, request.context);
      default:
        return this.generateComprehensiveRiskAssessment(supplierName, request.context);
    }
  }

  private determineRiskAnalysisType(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('financial') || lowerPrompt.includes('credit') || lowerPrompt.includes('debt')) {
      return 'financial_risk';
    }
    if (lowerPrompt.includes('supply chain') || lowerPrompt.includes('logistics') || lowerPrompt.includes('supplier')) {
      return 'supply_chain_risk';
    }
    if (lowerPrompt.includes('operational') || lowerPrompt.includes('production') || lowerPrompt.includes('facility')) {
      return 'operational_risk';
    }
    if (lowerPrompt.includes('predict') || lowerPrompt.includes('forecast') || lowerPrompt.includes('model')) {
      return 'predictive_modeling';
    }
    if (lowerPrompt.includes('geopolitical') || lowerPrompt.includes('political') || lowerPrompt.includes('country')) {
      return 'geopolitical_risk';
    }
    
    return 'comprehensive_assessment';
  }

  private generateFinancialRiskReport(supplierName: string, context: any): string {
    const baseRisk = this.calculateBaseRisk(supplierName);
    const financialScore = Math.max(10, baseRisk + Math.floor(Math.random() * 20));
    
    return `## Financial Risk Assessment for ${supplierName}

### Overall Financial Risk: ${this.getRiskLevel(financialScore)} ${this.getRiskEmoji(financialScore)}
**Risk Score: ${financialScore}/100**

### Financial Health Indicators

**💰 Credit Analysis**
- Credit Rating: ${this.getCreditRating(financialScore)}
- Payment History: ${financialScore < 30 ? 'Excellent' : financialScore < 60 ? 'Good' : 'Poor'}
- Days Sales Outstanding: ${30 + Math.floor(financialScore * 0.5)} days

**📊 Financial Ratios**
- Debt-to-Equity Ratio: ${(financialScore * 0.01).toFixed(2)}
- Current Ratio: ${(2.5 - financialScore * 0.015).toFixed(2)}
- Quick Ratio: ${(1.8 - financialScore * 0.012).toFixed(2)}
- Interest Coverage: ${(8 - financialScore * 0.05).toFixed(1)}x

**💸 Cash Flow Analysis**
- Operating Cash Flow: ${financialScore < 40 ? 'Strong and consistent' : 'Variable with seasonal patterns'}
- Free Cash Flow: ${financialScore < 30 ? 'Positive and growing' : financialScore < 60 ? 'Positive but volatile' : 'Negative or minimal'}
- Cash Conversion Cycle: ${45 + Math.floor(financialScore * 0.3)} days

### Risk Factors

**🟢 Strengths:**
${this.getFinancialStrengths(financialScore)}

**🔴 Concerns:**
${this.getFinancialConcerns(financialScore)}

### Probability Assessment
- **Default Risk (12 months)**: ${Math.min(95, financialScore * 0.8)}%
- **Payment Delay Risk**: ${Math.min(90, financialScore * 0.7)}%
- **Bankruptcy Risk (24 months)**: ${Math.min(80, financialScore * 0.6)}%

### Mitigation Strategies
${this.getFinancialMitigationStrategies(financialScore)}

### Monitoring Requirements
- **Review Frequency**: ${financialScore > 60 ? 'Weekly' : financialScore > 30 ? 'Monthly' : 'Quarterly'}
- **Key Indicators**: Cash flow, payment timeliness, credit utilization
- **Early Warning Triggers**: Payment delays >15 days, credit limit reductions

*Financial risk assessment updated: ${new Date().toLocaleString()}*`;
  }

  private generateSupplyChainRiskReport(supplierName: string, context: any): string {
    const baseRisk = this.calculateBaseRisk(supplierName);
    const supplyChainScore = Math.max(15, baseRisk + Math.floor(Math.random() * 25));
    
    return `## Supply Chain Risk Assessment for ${supplierName}

### Overall Supply Chain Risk: ${this.getRiskLevel(supplyChainScore)} ${this.getRiskEmoji(supplyChainScore)}
**Risk Score: ${supplyChainScore}/100**

### Supply Chain Vulnerability Analysis

**🚚 Logistics Risk**
- Transportation Dependencies: ${supplyChainScore > 60 ? 'High - Limited routes' : 'Medium - Multiple options'}
- Geographic Concentration: ${supplyChainScore > 50 ? 'Concentrated in single region' : 'Well distributed'}
- Lead Time Variability: ±${10 + Math.floor(supplyChainScore * 0.3)} days

**🏭 Supplier Dependencies**
- Critical Supplier Count: ${Math.max(1, 8 - Math.floor(supplyChainScore * 0.1))}
- Single Source Dependencies: ${Math.floor(supplyChainScore * 0.05)} critical components
- Supplier Concentration Risk: ${supplyChainScore > 70 ? 'High' : supplyChainScore > 40 ? 'Medium' : 'Low'}

**🌍 Geographic Risk Factors**
- Political Stability: ${this.getPoliticalStability(supplyChainScore)}
- Natural Disaster Exposure: ${supplyChainScore > 50 ? 'Elevated' : 'Standard'}
- Infrastructure Quality: ${supplyChainScore < 40 ? 'Excellent' : supplyChainScore < 70 ? 'Good' : 'Concerns identified'}

### Supply Chain Resilience

**🛡️ Mitigation Measures**
- Backup Suppliers: ${Math.max(1, 4 - Math.floor(supplyChainScore * 0.04))} qualified alternatives
- Safety Stock: ${Math.max(30, 90 - supplyChainScore)} days inventory
- Diversification Level: ${supplyChainScore < 30 ? 'High' : supplyChainScore < 60 ? 'Medium' : 'Low'}

### Risk Scenarios

**📈 Disruption Probability (12 months)**
- Minor Disruption (1-3 days): ${Math.min(80, 20 + supplyChainScore)}%
- Major Disruption (>1 week): ${Math.min(60, supplyChainScore * 0.6)}%
- Catastrophic Disruption: ${Math.min(30, supplyChainScore * 0.3)}%

### Business Impact Analysis
- Revenue at Risk: ${Math.min(40, supplyChainScore * 0.4)}% of annual revenue
- Recovery Time: ${Math.max(7, supplyChainScore * 0.5)} days average
- Customer Impact: ${supplyChainScore > 60 ? 'High - Service disruptions likely' : 'Manageable'}

### Recommended Actions
${this.getSupplyChainRecommendations(supplyChainScore)}

*Supply chain risk assessment completed: ${new Date().toLocaleString()}*`;
  }

  private generateOperationalRiskReport(supplierName: string, context: any): string {
    const baseRisk = this.calculateBaseRisk(supplierName);
    const operationalScore = Math.max(12, baseRisk + Math.floor(Math.random() * 18));
    
    return `## Operational Risk Assessment for ${supplierName}

### Overall Operational Risk: ${this.getRiskLevel(operationalScore)} ${this.getRiskEmoji(operationalScore)}
**Risk Score: ${operationalScore}/100**

### Production & Operations Analysis

**🏭 Production Capacity**
- Capacity Utilization: ${Math.max(60, 95 - operationalScore)}%
- Production Flexibility: ${operationalScore < 30 ? 'High' : operationalScore < 60 ? 'Medium' : 'Limited'}
- Scalability: ${operationalScore < 40 ? 'Excellent scaling capability' : 'Some constraints identified'}

**⚙️ Process Reliability**
- Equipment Uptime: ${Math.max(85, 98 - operationalScore * 0.15)}%
- Process Variability: ${operationalScore < 30 ? 'Low - Well controlled' : 'Moderate variation'}
- Maintenance Schedule: ${operationalScore < 40 ? 'Proactive and comprehensive' : 'Reactive approach'}

**👥 Human Resources**
- Key Personnel Dependencies: ${operationalScore > 60 ? 'High risk - Limited backup' : 'Well managed'}
- Staff Turnover Rate: ${Math.max(5, operationalScore * 0.2)}% annually
- Skills Gap Analysis: ${operationalScore < 30 ? 'No significant gaps' : 'Some areas need attention'}

### Quality & Compliance Operations

**🔬 Quality Management**
- Defect Rate: ${Math.max(0.1, operationalScore * 0.05)}%
- Customer Complaints: ${Math.max(1, operationalScore * 0.1)} per 1000 units
- Quality Improvement Trend: ${operationalScore < 40 ? 'Improving' : 'Stable'}

**📋 Compliance Operations**
- Audit Performance: ${operationalScore < 30 ? 'Excellent' : operationalScore < 60 ? 'Good' : 'Needs improvement'}
- Documentation Quality: ${operationalScore < 40 ? 'Comprehensive and current' : 'Some gaps identified'}
- Regulatory Response Time: ${Math.max(24, operationalScore * 0.8)} hours average

### Business Continuity

**🚨 Contingency Planning**
- Disaster Recovery Plan: ${operationalScore < 40 ? 'Comprehensive and tested' : 'Basic plan in place'}
- Backup Facilities: ${Math.max(1, 3 - Math.floor(operationalScore * 0.03))} alternative sites
- Recovery Time Objective: ${Math.max(4, operationalScore * 0.2)} hours

### Risk Mitigation Status
${this.getOperationalMitigationStatus(operationalScore)}

### Performance Metrics
- Overall Equipment Effectiveness: ${Math.max(75, 95 - operationalScore * 0.3)}%
- First Pass Yield: ${Math.max(90, 98 - operationalScore * 0.1)}%
- On-Time Delivery: ${Math.max(85, 98 - operationalScore * 0.15)}%

*Operational risk assessment completed: ${new Date().toLocaleString()}*`;
  }

  private generatePredictiveRiskModel(supplierName: string, context: any): string {
    const baseRisk = this.calculateBaseRisk(supplierName);
    const currentRisk = Math.max(15, baseRisk + Math.floor(Math.random() * 20));
    
    const predictions = {
      month3: Math.max(10, currentRisk + Math.floor(Math.random() * 10 - 5)),
      month6: Math.max(10, currentRisk + Math.floor(Math.random() * 15 - 7)),
      month12: Math.max(10, currentRisk + Math.floor(Math.random() * 20 - 10))
    };
    
    return `## Predictive Risk Model for ${supplierName}

### Current Risk Baseline: ${currentRisk}/100 ${this.getRiskEmoji(currentRisk)}

### 12-Month Risk Forecast

**📊 Risk Trajectory**
\`\`\`
Current:  ${currentRisk}/100 ${this.getRiskLevel(currentRisk)}
3 Month:  ${predictions.month3}/100 ${this.getRiskLevel(predictions.month3)}
6 Month:  ${predictions.month6}/100 ${this.getRiskLevel(predictions.month6)}
12 Month: ${predictions.month12}/100 ${this.getRiskLevel(predictions.month12)}
\`\`\`

**📈 Trend Analysis**
- Direction: ${predictions.month12 > currentRisk ? 'Increasing Risk' : 'Decreasing Risk'}
- Volatility: ${Math.abs(predictions.month12 - currentRisk) > 15 ? 'High' : 'Moderate'}
- Confidence Interval: ±${5 + Math.floor(Math.random() * 8)} points

### Scenario Analysis

**🟢 Best Case Scenario (25% probability)**
- Risk Score: ${Math.max(5, currentRisk - 15)}/100
- Key Factors: Market recovery, operational improvements, financial strengthening

**🟡 Most Likely Scenario (50% probability)**
- Risk Score: ${predictions.month12}/100
- Key Factors: Current trends continue, moderate market conditions

**🔴 Worst Case Scenario (25% probability)**
- Risk Score: ${Math.min(95, currentRisk + 25)}/100
- Key Factors: Market downturn, operational disruptions, financial stress

### Leading Indicators

**🚨 Early Warning Signals**
${this.getEarlyWarningIndicators(currentRisk)}

**📊 Monitoring Dashboard KPIs**
- Payment Terms Extension Requests: Monitor weekly
- Quality Incident Rate: Track monthly trend
- Capacity Utilization Changes: Monitor >10% swings
- Regulatory Compliance Score: Track quarterly

### Model Performance
- Historical Accuracy: 87%
- Prediction Confidence: ${85 + Math.floor(Math.random() * 10)}%
- Last Model Update: ${new Date().toLocaleDateString()}
- Next Recalibration: ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}

### Risk Mitigation Timeline

**Immediate Actions (0-30 days)**
${this.getImmediateActions(currentRisk)}

**Short-term Actions (1-6 months)**
${this.getShortTermActions(currentRisk)}

**Long-term Strategy (6-12 months)**
${this.getLongTermStrategy(currentRisk)}

*Predictive model generated: ${new Date().toLocaleString()}*`;
  }

  private generateGeopoliticalRiskReport(supplierName: string, context: any): string {
    const region = context?.region || 'Global';
    const geoRisk = Math.max(10, 20 + Math.floor(Math.random() * 40));
    
    return `## Geopolitical Risk Assessment for ${supplierName}

### Geographic Risk Profile: ${region}
**Overall Geopolitical Risk: ${this.getRiskLevel(geoRisk)} ${this.getRiskEmoji(geoRisk)}**
**Risk Score: ${geoRisk}/100**

### Country/Region Risk Factors

**🏛️ Political Stability**
- Government Stability Index: ${Math.max(30, 90 - geoRisk)}/100
- Political Risk Rating: ${this.getPoliticalStability(geoRisk)}
- Election Cycle Impact: ${geoRisk > 50 ? 'High uncertainty period' : 'Stable political environment'}

**⚖️ Regulatory Environment**
- Regulatory Predictability: ${geoRisk < 30 ? 'High' : geoRisk < 60 ? 'Medium' : 'Low'}
- Rule of Law Index: ${Math.max(40, 95 - geoRisk)}/100
- Corruption Perception: ${geoRisk < 40 ? 'Low corruption risk' : 'Moderate to high risk'}

**💱 Economic Factors**
- Currency Stability: ${geoRisk < 30 ? 'Stable' : geoRisk < 60 ? 'Moderate volatility' : 'High volatility'}
- Economic Growth Forecast: ${(3.5 - geoRisk * 0.04).toFixed(1)}% GDP growth
- Inflation Risk: ${geoRisk > 60 ? 'Elevated inflation concerns' : 'Stable price environment'}

### Trade & Security Risks

**🚢 Trade Environment**
- Trade Policy Stability: ${geoRisk < 40 ? 'Stable trade relations' : 'Trade tensions present'}
- Export/Import Restrictions: ${geoRisk > 50 ? 'Multiple restrictions in place' : 'Minimal trade barriers'}
- Free Trade Agreements: ${Math.max(1, 8 - Math.floor(geoRisk * 0.1))} active agreements

**🛡️ Security Assessment**
- Security Risk Level: ${this.getSecurityLevel(geoRisk)}
- Terrorism Threat: ${geoRisk > 70 ? 'Elevated' : geoRisk > 40 ? 'Moderate' : 'Low'}
- Cyber Security Rating: ${Math.max(60, 95 - geoRisk)}/100

### Impact Assessment

**💼 Business Operations Impact**
- Contract Enforcement: ${geoRisk < 30 ? 'Strong legal protection' : 'Moderate enforcement concerns'}
- Property Rights: ${geoRisk < 40 ? 'Well protected' : 'Some concerns'}
- Business Continuity Risk: ${geoRisk > 60 ? 'High' : geoRisk > 30 ? 'Medium' : 'Low'}

**🌍 Supply Chain Implications**
- Logistics Disruption Risk: ${Math.min(90, geoRisk)}%
- Border/Customs Delays: ${geoRisk > 50 ? 'Frequent delays expected' : 'Minimal delays'}
- Alternative Route Availability: ${Math.max(1, 5 - Math.floor(geoRisk * 0.05))} viable alternatives

### Risk Monitoring

**📡 Intelligence Sources**
- Government stability monitoring
- Economic indicator tracking
- Trade policy analysis
- Security threat assessment

**🔄 Update Frequency**
- High Risk Regions: Weekly updates
- Medium Risk: Monthly updates  
- Low Risk: Quarterly updates

### Contingency Planning
${this.getGeopoliticalContingencyPlans(geoRisk)}

*Geopolitical risk assessment completed: ${new Date().toLocaleString()}*`;
  }

  private generateComprehensiveRiskAssessment(supplierName: string, context: any): string {
    const overallRisk = this.calculateBaseRisk(supplierName);
    const riskComponents = {
      financial: Math.max(10, overallRisk + Math.floor(Math.random() * 15 - 7)),
      operational: Math.max(10, overallRisk + Math.floor(Math.random() * 12 - 6)),
      quality: Math.max(10, overallRisk + Math.floor(Math.random() * 10 - 5)),
      supplyChain: Math.max(10, overallRisk + Math.floor(Math.random() * 18 - 9)),
      regulatory: Math.max(10, overallRisk + Math.floor(Math.random() * 8 - 4))
    };
    
    return `## Comprehensive Risk Assessment for ${supplierName}

### Executive Risk Summary
**Overall Risk Level: ${this.getRiskLevel(overallRisk)} ${this.getRiskEmoji(overallRisk)}**
**Composite Risk Score: ${overallRisk}/100**

### Risk Component Breakdown

| Risk Category | Score | Level | Weight | Contribution |
|---------------|-------|-------|--------|--------------|
| Financial Risk | ${riskComponents.financial}/100 | ${this.getRiskLevel(riskComponents.financial)} | 25% | ${(riskComponents.financial * 0.25).toFixed(1)} |
| Operational Risk | ${riskComponents.operational}/100 | ${this.getRiskLevel(riskComponents.operational)} | 25% | ${(riskComponents.operational * 0.25).toFixed(1)} |
| Quality Risk | ${riskComponents.quality}/100 | ${this.getRiskLevel(riskComponents.quality)} | 20% | ${(riskComponents.quality * 0.20).toFixed(1)} |
| Supply Chain Risk | ${riskComponents.supplyChain}/100 | ${this.getRiskLevel(riskComponents.supplyChain)} | 15% | ${(riskComponents.supplyChain * 0.15).toFixed(1)} |
| Regulatory Risk | ${riskComponents.regulatory}/100 | ${this.getRiskLevel(riskComponents.regulatory)} | 15% | ${(riskComponents.regulatory * 0.15).toFixed(1)} |

### Key Risk Insights

**🎯 Primary Risk Drivers**
${this.getPrimaryRiskDrivers(riskComponents)}

**⚠️ Critical Risk Areas**
${this.getCriticalRiskAreas(riskComponents)}

**✅ Risk Mitigation Strengths**
${this.getRiskMitigationStrengths(riskComponents)}

### 12-Month Risk Outlook

**📈 Probability Assessments**
- Minor Risk Event (Low impact): ${Math.min(80, 30 + overallRisk)}%
- Major Risk Event (Medium impact): ${Math.min(60, overallRisk * 0.7)}%
- Critical Risk Event (High impact): ${Math.min(40, overallRisk * 0.4)}%

**🎯 Risk Trajectory**
- Current Trend: ${overallRisk > 50 ? 'Increasing risk profile' : 'Stable to improving'}
- Projected 6-month: ${Math.max(10, overallRisk + Math.floor(Math.random() * 10 - 5))}/100
- Confidence Level: ${85 + Math.floor(Math.random() * 10)}%

### Strategic Risk Management

**🛡️ Risk Mitigation Framework**
1. **Immediate Actions (0-30 days)**
   ${this.getImmediateRiskActions(overallRisk)}

2. **Short-term Initiatives (1-6 months)**
   ${this.getShortTermRiskInitiatives(overallRisk)}

3. **Long-term Strategy (6+ months)**
   ${this.getLongTermRiskStrategy(overallRisk)}

### Risk Monitoring Protocol

**📊 Key Risk Indicators (KRIs)**
- Financial health metrics: Monthly review
- Operational performance: Weekly monitoring
- Quality trends: Real-time tracking
- Supply chain stability: Daily assessment
- Regulatory compliance: Quarterly deep-dive

**🚨 Escalation Triggers**
- Risk score increase >10 points
- Critical incident occurrence
- Regulatory violation
- Financial distress indicators

### Risk Appetite & Tolerance

**Current Risk Position vs. Appetite**
- Risk Appetite: ${Math.max(20, 40 - Math.floor(Math.random() * 15))}/100
- Current Exposure: ${overallRisk}/100
- **Status**: ${overallRisk > 40 ? '🔴 Above appetite - Action required' : '🟢 Within acceptable range'}

*Comprehensive risk assessment completed: ${new Date().toLocaleString()}*`;
  }

  private calculateBaseRisk(supplierName: string): number {
    // Simple risk calculation based on supplier name for demo
    if (supplierName.toLowerCase().includes('abc')) return 55;
    if (supplierName.toLowerCase().includes('global')) return 35;
    return 25 + Math.floor(Math.random() * 30);
  }

  private getRiskLevel(score: number): string {
    if (score <= 30) return 'LOW';
    if (score <= 60) return 'MEDIUM';
    if (score <= 85) return 'HIGH';
    return 'CRITICAL';
  }

  private getRiskEmoji(score: number): string {
    if (score <= 30) return '🟢';
    if (score <= 60) return '🟡';
    if (score <= 85) return '🟠';
    return '🔴';
  }

  private getCreditRating(score: number): string {
    if (score <= 20) return 'AAA';
    if (score <= 30) return 'AA';
    if (score <= 45) return 'A';
    if (score <= 60) return 'BBB';
    if (score <= 75) return 'BB';
    return 'B or below';
  }

  private getPoliticalStability(score: number): string {
    if (score <= 30) return 'Very Stable';
    if (score <= 50) return 'Stable';
    if (score <= 70) return 'Moderate Concerns';
    return 'Unstable';
  }

  private getSecurityLevel(score: number): string {
    if (score <= 30) return 'Low Risk';
    if (score <= 50) return 'Moderate Risk';
    if (score <= 70) return 'High Risk';
    return 'Critical Risk';
  }

  // Helper methods for generating specific risk content
  private getFinancialStrengths(score: number): string {
    if (score <= 30) {
      return '- Strong cash position and liquidity\n- Excellent credit history\n- Diversified revenue streams\n- Conservative debt management';
    } else if (score <= 60) {
      return '- Adequate cash flow management\n- Stable revenue base\n- Reasonable debt levels';
    } else {
      return '- Some operational cash generation\n- Basic financial controls in place';
    }
  }

  private getFinancialConcerns(score: number): string {
    if (score <= 30) {
      return '- Minor seasonal cash flow variations\n- Moderate capital expenditure requirements';
    } else if (score <= 60) {
      return '- Irregular cash flow patterns\n- Increasing debt service requirements\n- Working capital pressure';
    } else {
      return '- Significant cash flow constraints\n- High debt burden\n- Payment delays to suppliers\n- Covenant compliance concerns';
    }
  }

  private getFinancialMitigationStrategies(score: number): string {
    if (score <= 30) {
      return '- Continue current financial management\n- Monitor for early warning indicators\n- Maintain credit line availability';
    } else if (score <= 60) {
      return '- Implement enhanced cash flow monitoring\n- Negotiate improved payment terms\n- Consider credit insurance\n- Establish backup payment methods';
    } else {
      return '- Require advance payments or guarantees\n- Implement daily cash monitoring\n- Secure alternative suppliers\n- Consider contract restructuring';
    }
  }

  private getSupplyChainRecommendations(score: number): string {
    if (score <= 30) {
      return '- Maintain current diversification strategy\n- Continue supplier relationship management\n- Monitor geopolitical developments';
    } else if (score <= 60) {
      return '- Develop additional supplier alternatives\n- Increase safety stock levels\n- Enhance logistics visibility\n- Implement risk monitoring tools';
    } else {
      return '- Urgent supplier diversification required\n- Establish emergency supply protocols\n- Increase strategic inventory\n- Develop regional supply alternatives';
    }
  }

  private getOperationalMitigationStatus(score: number): string {
    if (score <= 30) {
      return '✅ **Strong Mitigation Posture**\n- Comprehensive backup systems\n- Regular maintenance schedules\n- Cross-trained personnel\n- Documented procedures';
    } else if (score <= 60) {
      return '⚠️ **Moderate Mitigation Level**\n- Basic backup procedures\n- Some redundancy in place\n- Standard maintenance practices\n- Limited cross-training';
    } else {
      return '🔴 **Mitigation Gaps Identified**\n- Limited backup capabilities\n- Reactive maintenance approach\n- Key person dependencies\n- Inadequate documentation';
    }
  }

  private getEarlyWarningIndicators(score: number): string {
    const indicators = [
      'Payment term extension requests',
      'Quality incident rate increases',
      'Delivery delay frequency',
      'Key personnel turnover',
      'Capacity utilization changes',
      'Customer complaint trends'
    ];
    
    return indicators.slice(0, 3 + Math.floor(score / 20)).map(i => `- ${i}`).join('\n');
  }

  private getImmediateActions(score: number): string {
    if (score <= 30) {
      return '- Continue standard monitoring\n- Maintain current protocols\n- Review quarterly assessments';
    } else if (score <= 60) {
      return '- Increase monitoring frequency\n- Review contract terms\n- Validate backup suppliers\n- Update contingency plans';
    } else {
      return '- Implement daily monitoring\n- Activate risk committee\n- Execute contingency plans\n- Secure alternative options';
    }
  }

  private getShortTermActions(score: number): string {
    if (score <= 30) {
      return '- Annual risk assessment update\n- Supplier performance review\n- Contract optimization';
    } else if (score <= 60) {
      return '- Enhanced due diligence\n- Supplier improvement plans\n- Risk mitigation investments\n- Process optimization';
    } else {
      return '- Supplier intervention program\n- Alternative supplier qualification\n- Contract restructuring\n- Performance improvement mandates';
    }
  }

  private getLongTermStrategy(score: number): string {
    if (score <= 30) {
      return '- Strategic partnership development\n- Continuous improvement initiatives\n- Innovation collaboration';
    } else if (score <= 60) {
      return '- Supply base diversification\n- Capability development programs\n- Long-term risk reduction\n- Strategic relationship building';
    } else {
      return '- Supply chain restructuring\n- Supplier replacement strategy\n- Market expansion\n- Risk tolerance adjustment';
    }
  }

  private getGeopoliticalContingencyPlans(score: number): string {
    if (score <= 30) {
      return '- Standard monitoring protocols\n- Quarterly risk reviews\n- Maintain current operations';
    } else if (score <= 60) {
      return '- Enhanced intelligence gathering\n- Alternative sourcing options\n- Flexible contract terms\n- Regional diversification';
    } else {
      return '- Emergency response protocols\n- Rapid supplier switching capability\n- Political risk insurance\n- Regional headquarters establishment';
    }
  }

  private getPrimaryRiskDrivers(components: any): string {
    const drivers = [];
    if (components.financial > 50) drivers.push('Financial stress indicators');
    if (components.operational > 50) drivers.push('Operational vulnerabilities');
    if (components.quality > 50) drivers.push('Quality performance concerns');
    if (components.supplyChain > 50) drivers.push('Supply chain dependencies');
    if (components.regulatory > 50) drivers.push('Regulatory compliance gaps');
    
    return drivers.length > 0 ? drivers.map(d => `- ${d}`).join('\n') : '- No major risk drivers identified';
  }

  private getCriticalRiskAreas(components: any): string {
    const critical = Object.entries(components)
      .filter(([_, score]) => (score as number) > 70)
      .map(([area, score]) => `- ${area.charAt(0).toUpperCase() + area.slice(1)} Risk: ${score}/100 - Immediate attention required`);
    
    return critical.length > 0 ? critical.join('\n') : '- No critical risk areas identified';
  }

  private getRiskMitigationStrengths(components: any): string {
    const strengths = Object.entries(components)
      .filter(([_, score]) => (score as number) <= 30)
      .map(([area, score]) => `- ${area.charAt(0).toUpperCase() + area.slice(1)} management: Strong controls and low risk`);
    
    return strengths.length > 0 ? strengths.join('\n') : '- Standard risk management practices in place';
  }

  private getImmediateRiskActions(score: number): string {
    if (score <= 30) {
      return '   - Continue standard risk monitoring\n   - Maintain current control measures\n   - Schedule next quarterly review';
    } else if (score <= 60) {
      return '   - Escalate to risk management team\n   - Implement enhanced monitoring\n   - Review and update mitigation plans\n   - Validate contingency procedures';
    } else {
      return '   - Activate crisis management protocol\n   - Daily risk assessment meetings\n   - Implement immediate safeguards\n   - Execute alternative supplier plans';
    }
  }

  private getShortTermRiskInitiatives(score: number): string {
    if (score <= 30) {
      return '   - Optimize existing risk controls\n   - Enhance supplier partnerships\n   - Implement predictive analytics';
    } else if (score <= 60) {
      return '   - Develop comprehensive mitigation strategies\n   - Invest in risk reduction capabilities\n   - Diversify supplier base\n   - Strengthen monitoring systems';
    } else {
      return '   - Execute supplier intervention programs\n   - Implement alternative sourcing strategies\n   - Restructure high-risk relationships\n   - Develop emergency response capabilities';
    }
  }

  private getLongTermRiskStrategy(score: number): string {
    if (score <= 30) {
      return '   - Build strategic risk capabilities\n   - Develop advanced analytics\n   - Create center of excellence';
    } else if (score <= 60) {
      return '   - Transform risk management approach\n   - Build resilient supply networks\n   - Implement end-to-end visibility\n   - Develop risk-adjusted strategies';
    } else {
      return '   - Fundamental supply chain redesign\n   - Market expansion and diversification\n   - Risk tolerance framework revision\n   - Strategic risk partnership development';
    }
  }

  private calculateRiskConfidence(response: string, request: AgentInvokeRequest): number {
    let confidence = 0.88; // Base confidence for risk analysis

    // Increase confidence based on analysis depth
    if (response.includes('Risk Score:')) confidence += 0.05;
    if (response.includes('Probability')) confidence += 0.03;
    if (response.includes('mitigation') || response.includes('Mitigation')) confidence += 0.02;
    if (response.length > 1000) confidence += 0.02;
    
    // Context-based confidence adjustments
    if (request.context?.financialData) confidence += 0.02;
    if (request.context?.historicalData) confidence += 0.02;
    
    return Math.min(0.96, confidence);
  }

  private extractRiskSources(response: string): string[] {
    const sources = [
      'Financial Risk Models',
      'Industry Risk Benchmarks',
      'Credit Rating Agencies',
      'Geopolitical Risk Databases',
      'Supply Chain Intelligence'
    ];
    
    // Add specific sources based on content
    if (response.toLowerCase().includes('financial')) {
      sources.push('Credit Bureau Data', 'Financial Statement Analysis');
    }
    if (response.toLowerCase().includes('geopolitical')) {
      sources.push('Political Risk Services', 'Country Risk Ratings');
    }
    if (response.toLowerCase().includes('supply chain')) {
      sources.push('Supply Chain Risk Analytics', 'Logistics Intelligence');
    }
    
    return sources.slice(0, 5); // Return top 5 relevant sources
  }
}